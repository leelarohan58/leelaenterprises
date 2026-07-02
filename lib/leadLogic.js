const fs = require('fs');
const path = require('path');

const LICENSE_TIERS = {
  silver: { label: 'Tally Prime Silver (Single User)', baseAmount: 22500 },
  gold: { label: 'Tally Prime Gold (Multi-User)', baseAmount: 67500 },
  server: { label: 'Tally Prime Server', baseAmount: 270000 }
};

const GST_RATE = 0.18;
const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'yopmail.com',
  'guerrillamail.com',
  'maildrop.cc',
  'trashmail.com',
  'test.com',
  'example.com'
];

function sanitizeInput(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/['"]/g, '')
    .trim();
}

function computeQuote({ solutionRequired = 'silver', locations = 1, remoteDeployment = false, concurrentUsers = 1 }) {
  const tier = LICENSE_TIERS[solutionRequired] || LICENSE_TIERS.silver;
  const baseAmount = tier.baseAmount;
  const gstAmount = Math.round(baseAmount * GST_RATE);
  const totalAmount = baseAmount + gstAmount;
  const locationMultiplier = Number(locations) > 1 ? 1 + (Number(locations) - 1) * 0.15 : 1;
  const userMultiplier = Number(concurrentUsers) > 10 ? 1 + (Number(concurrentUsers) - 10) * 0.05 : 1;
  const deploymentMultiplier = remoteDeployment ? 1.08 : 1;
  const adjustedTotal = Math.round(totalAmount * locationMultiplier * userMultiplier * deploymentMultiplier);

  return {
    selectedTier: tier.label,
    baseAmount,
    gstRate: 18,
    gstAmount,
    totalAmount: adjustedTotal,
    notes: 'All pricing calculations follow the LE-SOP-2026-V1 Indian licensing matrix with 18% GST applied.'
  };
}

function isDisposableEmail(email) {
  const normalized = email.toLowerCase();
  return DISPOSABLE_DOMAINS.some(domain => normalized.endsWith(`@${domain}`) || normalized.includes(domain));
}

function validateLead(payload) {
  const sanitized = {
    name: sanitizeInput(payload.name),
    companyName: sanitizeInput(payload.companyName),
    businessEmail: sanitizeInput(payload.businessEmail).toLowerCase(),
    phoneNumber: sanitizeInput(payload.phoneNumber),
    solutionRequired: sanitizeInput(payload.solutionRequired || 'silver').toLowerCase(),
    locations: sanitizeInput(payload.locations || '1'),
    remoteDeployment: Boolean(payload.remoteDeployment),
    concurrentUsers: sanitizeInput(payload.concurrentUsers || '1')
  };

  const errors = [];

  if (!sanitized.name || sanitized.name.length < 2) {
    errors.push('Name is required.');
  }

  if (!sanitized.companyName || sanitized.companyName.length < 2) {
    errors.push('Company name is required.');
  }

  if (!sanitized.businessEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.businessEmail)) {
    errors.push('Provide a valid business email.');
  } else if (isDisposableEmail(sanitized.businessEmail)) {
    errors.push('Disposable or temporary email addresses are blocked.');
  }

  if (!sanitized.phoneNumber || !/^\+?[0-9\s-]{7,15}$/.test(sanitized.phoneNumber)) {
    errors.push('Provide a valid phone number.');
  }

  if (!LICENSE_TIERS[sanitized.solutionRequired]) {
    errors.push('Select a valid Tally Prime solution.');
  }

  if (!/^[0-9]+$/.test(sanitized.locations) || Number(sanitized.locations) < 1) {
    errors.push('Locations must be a numeric value.');
  }

  if (!/^[0-9]+$/.test(sanitized.concurrentUsers) || Number(sanitized.concurrentUsers) < 1) {
    errors.push('Concurrent users must be a numeric value.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

function getPriorityRoute(payload) {
  const solutionRequired = payload.solutionRequired || 'silver';
  const locations = Number(payload.locations || 1);
  const concurrentUsers = Number(payload.concurrentUsers || 1);
  const remoteDeployment = Boolean(payload.remoteDeployment);

  const isEnterprise = solutionRequired === 'server' || locations > 1 || (remoteDeployment && concurrentUsers > 10);

  return {
    priority: isEnterprise ? 'Priority 1 (Enterprise Tier)' : 'Priority 2 (Standard Tier)',
    routingTarget: isEnterprise ? 'Senior Solutions Architects' : 'Standard inside sales rotation',
    reason: isEnterprise
      ? 'Server, multi-location, or remote cloud deployments above 10 concurrent users require enterprise handoff.'
      : 'Standard single-node retail license routed to standard sales rotation.'
  };
}

function loadAppSettings(filePath) {
  if (!fs.existsSync(filePath)) {
    return { lead_backlog: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      ...parsed,
      lead_backlog: Array.isArray(parsed.lead_backlog) ? parsed.lead_backlog : []
    };
  } catch (error) {
    return { lead_backlog: [] };
  }
}

function saveAppSettings(filePath, settings) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

function loadLeadBacklog(filePath) {
  return loadAppSettings(filePath).lead_backlog;
}

function saveLeadBacklog(filePath, backlog) {
  const settings = loadAppSettings(filePath);
  settings.lead_backlog = backlog;
  saveAppSettings(filePath, settings);
}

function addLeadToBacklog(filePath, entry) {
  const backlog = loadLeadBacklog(filePath);
  backlog.push(entry);
  saveLeadBacklog(filePath, backlog);
  return backlog;
}

async function dispatchWebhookTargets(entry) {
  const targetList = (process.env.WEBHOOK_TARGETS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (targetList.length === 0) {
    return {
      ok: false,
      mode: 'offline',
      message: 'No webhook targets configured, so the lead was stored in the fallback backlog for retry.'
    };
  }

  try {
    const responses = await Promise.all(targetList.map(async target => {
      const response = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      return response.ok;
    }));

    const allSucceeded = responses.every(Boolean);
    return {
      ok: allSucceeded,
      mode: 'live',
      message: allSucceeded ? 'Webhook sync completed.' : 'One or more webhook targets failed.'
    };
  } catch (error) {
    return {
      ok: false,
      mode: 'offline',
      message: `Webhook dispatch failed: ${error.message}`
    };
  }
}

async function processLeadSubmission(filePath, entry) {
  const sync = await dispatchWebhookTargets(entry);

  if (sync.ok) {
    return {
      status: 'synced',
      message: sync.message,
      fallbackBacklog: false
    };
  }

  const fallbackEntry = {
    ...entry,
    status: 'pending',
    attempts: 1,
    lastAttemptAt: new Date().toISOString(),
    syncError: sync.message
  };

  addLeadToBacklog(filePath, fallbackEntry);
  return {
    status: 'backlogged',
    message: 'Lead captured locally and will retry every 10 minutes.',
    fallbackBacklog: true,
    backlogCount: loadLeadBacklog(filePath).length
  };
}

async function retryPendingBacklog(filePath) {
  const backlog = loadLeadBacklog(filePath);
  if (backlog.length === 0) {
    return { processed: 0 };
  }

  const remaining = [];

  for (const entry of backlog) {
    const sync = await dispatchWebhookTargets(entry);
    if (sync.ok) {
      continue;
    }

    remaining.push({
      ...entry,
      attempts: (entry.attempts || 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      syncError: sync.message
    });
  }

  saveLeadBacklog(filePath, remaining);
  return { processed: backlog.length - remaining.length, remaining: remaining.length };
}

module.exports = {
  LICENSE_TIERS,
  GST_RATE,
  sanitizeInput,
  computeQuote,
  validateLead,
  getPriorityRoute,
  loadLeadBacklog,
  saveLeadBacklog,
  addLeadToBacklog,
  processLeadSubmission,
  retryPendingBacklog
};
