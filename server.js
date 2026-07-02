const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const {
  validateLead,
  getPriorityRoute,
  computeQuote,
  processLeadSubmission,
  loadLeadBacklog,
  retryPendingBacklog
} = require('./lib/leadLogic');

const HOST = '127.0.0.1';
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const BACKLOG_FILE = path.join(__dirname, 'data', 'app-settings.json');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function sendFile(res, filePath, contentType) {
  const content = readFile(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
}

function serveStatic(req, res) {
  const reqUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = reqUrl.pathname === '/' ? '/index.html' : reqUrl.pathname;
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = path.normalize(decodedPath).replace(/^\.+/, '');
  const trimmedPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
  let filePath = path.join(PUBLIC_DIR, trimmedPath || 'index.html');

  if (!path.extname(trimmedPath)) {
    const htmlCandidate = path.join(PUBLIC_DIR, `${trimmedPath}.html`);
    const dirIndexCandidate = path.join(PUBLIC_DIR, trimmedPath, 'index.html');
    if (fs.existsSync(htmlCandidate)) {
      filePath = htmlCandidate;
    } else if (fs.existsSync(dirIndexCandidate)) {
      filePath = dirIndexCandidate;
    }
  }

  const resolvedFilePath = path.resolve(filePath);
  const publicRoot = path.resolve(PUBLIC_DIR);
  if (resolvedFilePath !== publicRoot && !resolvedFilePath.startsWith(publicRoot + path.sep)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  if (!fs.existsSync(resolvedFilePath)) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  const ext = path.extname(resolvedFilePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  sendFile(res, resolvedFilePath, contentTypes[ext] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === 'GET' && reqUrl.pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'Leela Enterprises lead intake' });
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/leads/backlog') {
    const backlog = loadLeadBacklog(BACKLOG_FILE);
    sendJson(res, 200, { backlogCount: backlog.length, backlog });
    return;
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/leads') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const validation = validateLead(payload);
        const route = getPriorityRoute({
          solutionRequired: validation.sanitized.solutionRequired,
          locations: validation.sanitized.locations,
          remoteDeployment: validation.sanitized.remoteDeployment,
          concurrentUsers: validation.sanitized.concurrentUsers
        });

        const quote = computeQuote({
          solutionRequired: validation.sanitized.solutionRequired,
          locations: validation.sanitized.locations,
          remoteDeployment: validation.sanitized.remoteDeployment,
          concurrentUsers: validation.sanitized.concurrentUsers
        });

        if (!validation.isValid) {
          sendJson(res, 400, {
            ok: false,
            errors: validation.errors,
            route,
            quote
          });
          return;
        }

        const outcome = await processLeadSubmission(BACKLOG_FILE, {
          ...validation.sanitized,
          route,
          quote,
          submittedAt: new Date().toISOString()
        });

        sendJson(res, 200, {
          ok: true,
          message: 'Lead accepted and queued for SOP-aligned follow-up.',
          lead: validation.sanitized,
          route,
          quote,
          sync: outcome
        });
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message });
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Leela Enterprises site listening on http://${HOST}:${PORT}`);
});

setInterval(() => {
  retryPendingBacklog(BACKLOG_FILE).catch(error => {
    console.error('Retry backlog error', error);
  });
}, 10 * 60 * 1000);
