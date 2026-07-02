const test = require('node:test');
const assert = require('node:assert/strict');
const { computeQuote, validateLead, getPriorityRoute, sanitizeInput } = require('../lib/leadLogic');

test('pricing engine applies the base tier and 18% GST', () => {
  const quote = computeQuote({ solutionRequired: 'silver' });
  assert.equal(quote.baseAmount, 22500);
  assert.equal(quote.gstRate, 18);
  assert.equal(quote.totalAmount, 26550);
});

test('validation blocks disposable email addresses and sanitizes input', () => {
  const outcome = validateLead({
    name: '<script>alert(1)</script>Ravi',
    companyName: 'Acme Retail',
    businessEmail: 'sales@mailinator.com',
    phoneNumber: '9876543210',
    solutionRequired: 'server'
  });

  assert.equal(outcome.isValid, false);
  assert.match(outcome.errors.join(' '), /Disposable/);
  assert.equal(outcome.sanitized.name, 'Ravi');
  assert.equal(outcome.sanitized.companyName, 'Acme Retail');
});

test('routing engine flags enterprise cases for Senior Solutions Architects', () => {
  const route = getPriorityRoute({ solutionRequired: 'server', locations: 2, remoteDeployment: false, concurrentUsers: 5 });
  assert.equal(route.priority, 'Priority 1 (Enterprise Tier)');
  assert.equal(route.routingTarget, 'Senior Solutions Architects');
});

test('sanitization removes potentially dangerous script content', () => {
  assert.equal(sanitizeInput('<script>alert(1)</script>Leela'), 'Leela');
});
