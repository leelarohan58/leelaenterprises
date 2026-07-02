# AI Agent Instructions for leelaenterprises

## Project Overview

**leelaenterprises** is a lead management and quoting system for Tally Prime software solutions in the Indian market. It validates business leads, calculates license quotes with GST, and routes opportunities to appropriate sales channels.

**Key Technologies:** Node.js (no framework), Vanilla JavaScript, Node's built-in test module

## Quick Start for Agents

### Running Tests
```bash
npm test
```
Tests are located in `test/leadLogic.test.js` and use Node's native test framework. **Always run tests after changes to core logic.**

### Starting the Server
```bash
node server.js
```
Server runs on `127.0.0.1:3000` (or PORT env var). Serves static files from `public/`.

### File Structure
- **`lib/leadLogic.js`** — Core business logic: lead validation, pricing engine, routing logic
- **`server.js`** — HTTP server, static file serving, API endpoints (`/api/leads`)
- **`public/`** — Frontend HTML forms and JavaScript
- **`test/leadLogic.test.js`** — Unit tests for leadLogic functions

## Critical Domain Knowledge

### 1. **Pricing Engine** (`computeQuote()`)
- Three license tiers: silver (₹22,500), gold (₹67,500), server (₹270,000)
- **Always apply 18% GST** (non-negotiable for Indian compliance)
- **Calculation order:** Base amount → Apply 18% GST → Apply multipliers → Round each step
- Multipliers: locations (15% per additional), concurrent users (5% per user >10), remote deployment (+8%)
- Returns: `{ selectedTier, baseAmount, gstRate, gstAmount, totalAmount, notes }`
- **Reference:** `LE-SOP-2026-V1 Indian licensing matrix`

### 2. **Lead Validation** (`validateLead()`)
- **ALWAYS call this first** — sanitization happens here, not elsewhere
- **XSS Prevention:** `sanitizeInput()` strips `<script>` tags, removes `<>` and quotes; returns empty string for non-strings
- **Disposable Email Blocking:** Block domains like mailinator, tempmail, 10minutemail, yopmail, guerrillamail, maildrop, trashmail, test, example
- **Required Fields:** name (≥2 chars), company name (≥2 chars), business email (valid, non-disposable), phone number
- **Return signature:** `{ isValid: boolean, errors: [], sanitized: { name, companyName, businessEmail, phoneNumber, ... } }`
- **Critical:** Always pass `sanitized` object (not raw payload) to `computeQuote()` and `getPriorityRoute()`

### 3. **Lead Routing** (`getPriorityRoute()`)
- Takes sanitized lead data, returns routing decision
- **Priority 1 (Enterprise):** Tier=server OR locations≥2 OR (remote deployment + concurrent users≥5)
  - Route target: "Senior Solutions Architects"
- **Priority 2+ (Standard):** Everything else
  - Route target: "Solutions Consultant" or "Sales Team"
- Returns: `{ priority, routingTarget, reason }`

### 4. **Lead Persistence & Backlog** (`processLeadSubmission()`, `addLeadToBacklog()`, `retryPendingBacklog()`)
- **Main flow:** `processLeadSubmission()` attempts webhook dispatch; on failure, stores in backlog
- Backlog stored in `data/app-settings.json` (directory auto-created with `recursive: true`)
- Backlog retry runs every 10 minutes via `setInterval(retryPendingBacklog, 600000)`
- Backlog entry structure: `{ ...lead, status, attempts, lastAttemptAt, syncError }`
- **Webhook environment variable:** `WEBHOOK_TARGETS` — comma-separated URLs
- **Important:** `processLeadSubmission()` is async; always use `await` in API handler

### 5. **Frontend API Contract** (`/api/leads` POST)

**Input:** JSON payload with required fields
```json
{
  "name": "string",
  "companyName": "string", 
  "businessEmail": "string",
  "phoneNumber": "string",
  "solutionRequired": "silver|gold|server",
  "locations": "number",
  "concurrentUsers": "number",
  "remoteDeployment": "true|false (string or boolean)"
}
```

**Output on success:**
```json
{
  "ok": true,
  "message": "Lead created successfully",
  "lead": { "...sanitized fields..." },
  "quote": { "selectedTier", "baseAmount", "gstAmount", "totalAmount", "notes" },
  "route": { "priority", "routingTarget", "reason" },
  "sync": { "dispatched": boolean, "syncError": string|null }
}
```

**Output on validation error:**
```json
{
  "ok": false,
  "errors": ["error1", "error2"],
  "quote": { "...computed quote..." },
  "route": { "...priority route..." }
}
```

**Frontend behavior:**
- Success: display `route.priority`, formatted price `₹${totalAmount.toLocaleString()}`
- Error: list `errors` array with `<br/>` separator
- Output div: `#quoteOutput`

#### `GET /api/health`
- **Response (200):** `{ status: 'ok', service: 'Leela Enterprises lead intake' }`
- Health check endpoint for monitoring

#### `GET /api/leads/backlog`
- **Response (200):** `{ backlogCount: number, backlog: [ { ...lead, status, attempts, lastAttemptAt, syncError }, ... ] }`
- Returns all stored leads (including retry metadata) from `data/app-settings.json`

### 6. **Module Pattern** (`lib/leadLogic.js`)
- **No classes**, only pure functions exported via `module.exports = { ...functions }`
- All stateful operations take `filePath` as first parameter (enables testing/injection)
- Core functions:
  - `sanitizeInput(value)` → `string` — XSS prevention; returns cleaned string
  - `computeQuote(options)` → `{ selectedTier, baseAmount, gstRate, gstAmount, totalAmount, notes }`
  - `validateLead(payload)` → `{ isValid, errors[], sanitized: {...} }`
  - `getPriorityRoute(payload)` → `{ priority, routingTarget, reason }`
  - `processLeadSubmission(payload, filePath)` → async, persists to backlog, returns `{ success, message, lead }`
  - `addLeadToBacklog(filePath, entry)` → appends to `lead_backlog` array in JSON
  - `retryPendingBacklog(filePath)` → re-attempts failed leads, increments `attempts` counter
  - `loadLeadBacklog(filePath)` → loads all leads from storage
  - `loadAppSettings(filePath)` / `saveAppSettings(filePath, settings)` — JSON file I/O

### 7. **Lead Data Schema** (`data/app-settings.json`)
```json
{
  "lead_backlog": [
    {
      "name": "string",
      "companyName": "string",
      "businessEmail": "string (lowercase)",
      "phoneNumber": "string",
      "solutionRequired": "silver|gold|server",
      "locations": "number",
      "concurrentUsers": "number",
      "remoteDeployment": "boolean",
      "submittedAt": "ISO 8601 datetime string",
      "quote": { "selectedTier": "...", "baseAmount": "number", "gstAmount": "number", "totalAmount": "number", "notes": "..." },
      "route": { "priority": "...", "routingTarget": "...", "reason": "..." },
      "status": "pending|dispatched",
      "attempts": "number",
      "lastAttemptAt": "ISO 8601 datetime string (if retried)",
      "syncError": "error message or null"
    }
  ]
}
```

### 8. **Environment Variables & Configuration**
- `PORT` (default: 3000) — Server listening port
- `WEBHOOK_TARGETS` (optional) — Comma-separated webhook URLs for lead dispatch; if empty/unset, leads go straight to backlog
- Node.js `NODE_ENV` (optional) — Set to 'production' if needed for logging/error handling

### 9. **Testing & Test Patterns** (`test/leadLogic.test.js`)
- Uses Node.js native `test` module (no external framework, no jest/mocha)
- Import: `const test = require('node:test')` and `const assert = require('node:assert/strict')`
- **Test pattern:** `test('description', () => { const result = func(input); assert.equal(result.property, expected); });`
- **Common assertions:** `assert.equal()`, `assert.match()` (regex), `assert.deepEqual()`, `assert.throws()`
- **Coverage areas:** Pricing calculations (base, GST, multipliers), XSS sanitization, disposable email blocking, validation errors, routing logic
- **Key pattern:** Tests verify both output values AND side effects (sanitized fields, error message content)
- Run tests: `npm test`
- Always test: happy path, validation failures, edge cases (high numbers, special chars), malicious input (scripts, quotes)

## Common Development Patterns

### Adding Validations
- All new validations must go in `validateLead()` and update `errors[]`
- Validation errors are user-facing — write clear, actionable messages
- Test new validations in `test/leadLogic.test.js` with both valid and invalid cases
- Always test with malicious input (scripts, special chars, quotes)
- Disposable email domains to block: mailinator, tempmail, 10minutemail, yopmail, guerrillamail, maildrop, trashmail, test, example

### Modifying Pricing
- Update `LICENSE_TIERS` constants at top of `lib/leadLogic.js`
- Adjust multiplier logic in `computeQuote()` if business rules change
- **Critical:** GST must always be 18% (Indian compliance)
- **Test:** Use `npm test` to verify calculations remain correct with edge cases

### Webhook Integration
- Set `WEBHOOK_TARGETS` env var (comma-separated URLs) to enable lead dispatch
- `processLeadSubmission()` attempts dispatch; on failure, stores in `data/app-settings.json`
- Backlog auto-retries every 10 minutes; tracks `status`, `attempts`, `lastAttemptAt`, `syncError`
- **Always await** `processLeadSubmission()` in API handler; it's async

### Frontend Changes
- `/api/leads` endpoint contract must be maintained — changes break the UI
- Form field names must match expected payload keys
- Output div ID is `#quoteOutput`
- Response shape is rigid: `{ ok, lead, quote, route, sync }` — maintain this structure

### Frontend Integration Pattern
- Form ID: `leadForm` submits to `/api/leads` (JSON POST)
- Form fields auto-convert: `remoteDeployment` → boolean, `locations` and `concurrentUsers` → numbers
- On success: Display message, priority tier, and formatted quote (₹ with comma separators, 18% GST breakdown shown)
- On error: Display validation errors as HTML-unescaped list; each error message is user-facing
- No external DOM manipulation libraries; use vanilla `document.getElementById()` and `innerHTML`

### Server & Static File Safety
- Static files served from `public/` with auto-extension handling (`/index` → `/index.html`)
- Path traversal protection: resolved path must start with public root
- Server automatically creates `data/` directory with `recursive: true` for backlog file

## Common Pitfalls

1. **GST Miscalculation:** Ensure 18% is applied to base amount BEFORE multipliers (or verify against SOP)
2. **Missing Sanitization:** XSS is a security risk; all user inputs must pass `sanitizeInput()`
3. **Not Passing Sanitized Data:** Always pass `sanitized` object (not raw payload) to `computeQuote()` and `getPriorityRoute()`
4. **Disposable Email Check:** Case-insensitive email validation required; test all blocked domains
5. **Missing Backlog Directory:** `data/app-settings.json` path will fail if directory doesn't exist (use `fs.mkdirSync(..., { recursive: true })`)
6. **Breaking API Contract:** Frontend expects specific JSON response shape; changes break the UI
7. **Forgetting `await`:** `processLeadSubmission()` is async; must use `await` in API handler
8. **Modifying Raw Payload:** Always sanitize first, then work with sanitized data; never pass raw form data to business logic

## When Implementing Features

1. **Validate data flow:** User input → sanitize → validate → business logic → persist → respond
2. **Test edge cases:** Multiple locations, high user counts, edge pricing scenarios
3. **Update both sides:** Changes to lead schema require frontend form changes too
4. **Run full test suite:** `npm test` must pass before committing
5. **Preserve exports:** Never rename or remove functions from `lib/leadLogic.js` — they're part of the API contract
6. **Maintain API response shape:** Client code depends on `ok`, `errors`, `message`, `quote`, and `route` fields in specific order
7. **Handle file system gracefully:** Use `fs.mkdirSync(..., { recursive: true })` when writing backlog; handle missing `data/` directory
8. **Test with malicious input:** SQL injection not applicable here, but XSS via form fields is a real risk; always sanitize first
5. **Preserve exports:** Never rename or remove functions from `lib/leadLogic.js` — they're part of the API contract
6. **Maintain API response shape:** Client code depends on `ok`, `errors`, `message`, `quote`, and `route` fields in specific order
7. **Handle file system gracefully:** Use `fs.mkdirSync(..., { recursive: true })` when writing backlog; handle missing `data/` directory
8. **Test with malicious input:** SQL injection not applicable here, but XSS via form fields is a real risk; always sanitize first

## Useful Notes

- No external database; all data is JSON file-based
- No framework (no Express, no React) — keep it lightweight
- Port is configurable via `PORT` env var (default 3000)
- Static files served with auto-extension handling (e.g., `/index` → `/index.html`)
