const form = document.getElementById('leadForm');
const output = document.getElementById('quoteOutput');

// ============================================================
// REAL-TIME CALCULATOR: Update pricing on form changes
// ============================================================
function updatePricing() {
  const solution = document.getElementById('solutionSelect').value;
  const locations = Number(document.getElementById('locationsSlider').value);
  const users = Number(document.getElementById('usersSlider').value);
  const awsEnabled = document.getElementById('awsToggle').checked;

  // Base pricing tiers
  // NOTE: calculator now supports full Tally Product Catalog.
  // Strategy model:
  // - GST is fixed at 18%.
  // - Subtotal = base + (units * multiplier) + aws
  // - Final total = subtotal + (subtotal * 0.18)
  const strategies = {
    silver: {
      base: 22500,
      multiplier: 0,
      unitsLabel: 'Single user basis',
      aws: 0,
      label: 'Tally Prime Silver (Single User)'
    },
    gold: {
      base: 67500,
      multiplier: 0,
      unitsLabel: 'Multi-user basis',
      aws: 0,
      label: 'Tally Prime Gold (Multi-User)'
    },
    server: {
      base: 270000,
      multiplier: 0,
      unitsLabel: 'Enterprise basis',
      aws: 0,
      label: 'Tally Prime Server (Enterprise)'
    },
    cloud: {
      base: 15000,
      multiplier: 1.25,
      unitsLabel: 'Per Active Project',
      aws: 2500,
      label: 'Tally on Cloud (Active Projects)'
    },
    biz: {
      base: 45000,
      multiplier: 1.5,
      unitsLabel: 'Per User Seat',
      aws: 7500,
      label: 'Biz Analyst by Tally (User Seats)'
    },
    otu: {
      base: 80000,
      multiplier: 2.0,
      unitsLabel: 'Per Automated Pipeline',
      aws: 15000,
      label: 'Otu HRMS (Automated Pipelines)'
    },
    capital: {
      base: 1500000,
      multiplier: 0,
      unitsLabel: 'Enterprise Global Volume',
      aws: 50000,
      label: 'Tally Capital (Enterprise Quote)'
    }
  };

  const strategy = strategies[solution] || strategies.silver;

  // Units definition per requested matrix:
  // - silver/gold/server: units are ignored (multiplier=0)
  // - cloud: units = locations (Per Active Project)
  // - biz: units = users (Per User Seat)
  // - otu: units = locations (Per Automated Pipeline)
  // - capital: units ignored (custom quote)
  const units =
    solution === 'cloud' ? locations :
    solution === 'biz' ? users :
    solution === 'otu' ? locations :
    1;

  // Update tier label
  document.getElementById('tierLabel').textContent = strategy.label;

  // GST fixed at 18%
  const gstRate = 0.18;

  // Show/hide multiplier sections (we keep sections for UX, but pricing model is now strategy-based)
  const locationSection = document.getElementById('locationSection');
  const userSection = document.getElementById('userSection');
  const awsSection = document.getElementById('awsSection');

  // We treat awsEnabled as a toggle for showing AWS line item; pricing always includes the strategy.aws per requirement.
  // For UI clarity, if awsEnabled is off, we hide the AWS section (but still compute including AWS overhead).
  if (solution === 'cloud' || solution === 'otu') {
    locationSection.classList.remove('hidden');
    const displayMultiplier = (units * strategy.multiplier);
    document.getElementById('locationMultiplier').textContent = `+ ₹${(displayMultiplier).toLocaleString('en-IN')} (units × multiplier)`;
  } else {
    locationSection.classList.add('hidden');
  }

  if (solution === 'biz') {
    userSection.classList.remove('hidden');
    const displayMultiplier = (units * strategy.multiplier);
    document.getElementById('userMultiplier').textContent = `+ ₹${(displayMultiplier).toLocaleString('en-IN')} (seats × multiplier)`;
  } else {
    userSection.classList.add('hidden');
  }

  if (awsEnabled) {
    awsSection.classList.remove('hidden');
    document.getElementById('awsCost').textContent = `₹${strategy.aws.toLocaleString('en-IN')}`;
  } else {
    awsSection.classList.add('hidden');
  }

  // Base amount display: show strategy.base (not including units/overhead) so it matches the earlier UI label.
  document.getElementById('baseAmount').textContent = `₹${strategy.base.toLocaleString('en-IN')}`;

  const subtotal = Math.round(strategy.base + (units * strategy.multiplier) + strategy.aws);
  document.getElementById('subtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;

  const finalGst = Math.round(subtotal * gstRate);
  document.getElementById('gstAmount').textContent = `₹${finalGst.toLocaleString('en-IN')}`;

  const totalAmount = subtotal + finalGst;
  document.getElementById('totalAmount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;


  // ============================================================
  // ROUTING LOGIC: Priority 1 vs Priority 2
  // ============================================================
  const routingBadge = document.getElementById('routingBadge');
  const isEnterprise = solution === 'server' || locations >= 2 || (awsEnabled && users >= 5);

  if (isEnterprise) {
    routingBadge.innerHTML = `<strong>🚀 Priority 1 Routing Triggered:</strong> Complex enterprise scenario. Alerts routed to Senior Solutions Architects for dedicated implementation support.`;
    routingBadge.classList.remove('bg-blue-100', 'border-blue-600');
    routingBadge.classList.add('bg-green-100', 'border-green-600');
  } else {
    routingBadge.innerHTML = `<strong>📋 Priority 2 Track:</strong> Routed sequentially to the inside sales rotation desk for standard processing.`;
    routingBadge.classList.remove('bg-green-100', 'border-green-600');
    routingBadge.classList.add('bg-blue-100', 'border-blue-600');
  }
}

// Update slider labels
document.getElementById('locationsSlider').addEventListener('input', (e) => {
  document.getElementById('locLabel').textContent = e.target.value;
  updatePricing();
});

document.getElementById('usersSlider').addEventListener('input', (e) => {
  document.getElementById('userLabel').textContent = e.target.value;
  updatePricing();
});

// Update on solution change
document.getElementById('solutionSelect').addEventListener('change', updatePricing);

// Update on AWS toggle
document.getElementById('awsToggle').addEventListener('change', updatePricing);

// Initial calculation
updatePricing();

// ============================================================
// DISPOSABLE EMAIL BLOCKING
// ============================================================
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

function isDisposableEmail(email) {
  const normalized = email.toLowerCase();
  return DISPOSABLE_DOMAINS.some(domain => 
    normalized.endsWith(`@${domain}`) || normalized.includes(domain)
  );
}

// ============================================================
// FORM SUBMISSION HANDLER
// ============================================================
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  // Type conversions
  payload.remoteDeployment = payload.remoteDeployment === 'on';
  payload.locations = Number(payload.locations || 1);
  payload.concurrentUsers = Number(payload.concurrentUsers || 1);
  payload.solutionRequired = payload.solutionRequired || 'silver';

  // Display output area
  output.classList.remove('hidden');
  output.innerHTML = '<span class="text-orange-300">Processing your inquiry...</span>';

  // Submit to backend API
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 5000 // 5 second timeout
    });

    const result = await response.json();

    if (result.ok) {
      // Success response
      output.innerHTML = `
        <div class="mb-4">
          <strong class="text-green-300">✓ Lead submission successful!</strong>
        </div>
        <div class="space-y-2 text-sm">
          <div>
            <span class="text-blue-300">Priority:</span>
            <span class="text-orange-300 font-semibold">${result.route.priority}</span>
          </div>
          <div>
            <span class="text-blue-300">Routing Target:</span>
            <span class="font-semibold">${result.route.routingTarget}</span>
          </div>
          <div>
            <span class="text-blue-300">Total Investment:</span>
            <span class="text-green-300 font-bold">₹${result.quote.totalAmount.toLocaleString('en-IN')}</span>
            <span class="text-xs text-blue-400">(incl. 18% GST)</span>
          </div>
          <div class="text-blue-300 text-xs mt-3">
            Our sales team will contact you within 2 business hours. Your inquiry has been securely recorded.
          </div>
        </div>
      `;
      output.classList.remove('bg-white', 'bg-opacity-10');
      output.classList.add('bg-green-900', 'bg-opacity-30', 'border-l-4', 'border-green-400');
    } else {
      // Validation error response
      const errors = result.errors || [];
      output.innerHTML = `
        <div class="mb-3">
          <strong class="text-red-300">⚠️ Validation errors detected:</strong>
        </div>
        <ul class="list-disc list-inside space-y-1 text-sm">
          ${errors.map(err => `<li>${err}</li>`).join('')}
        </ul>
        <div class="text-xs text-blue-300 mt-3">
          Please review the form and correct the highlighted fields.
        </div>
      `;
      output.classList.remove('bg-white', 'bg-opacity-10');
      output.classList.add('bg-red-900', 'bg-opacity-30', 'border-l-4', 'border-red-400');
    }
  } catch (error) {
    // Network timeout or error - fallback handling
    console.log('Network error (fallback mode):', error);

    // Store lead locally for offline sync
    const leadBacklog = JSON.parse(localStorage.getItem('leela_lead_backlog') || '[]');
    payload.submittedAt = new Date().toISOString();
    payload.status = 'pending_sync';
    leadBacklog.push(payload);
    localStorage.setItem('leela_lead_backlog', JSON.stringify(leadBacklog));

    // Display user-friendly message
    output.innerHTML = `
      <div class="mb-3">
        <strong class="text-yellow-300">🔄 System Sync Fallback Mode</strong>
      </div>
      <p class="text-sm mb-3">
        Our servers are experiencing temporary latency. Your inquiry has been safely backed up locally and will sync automatically when connectivity resumes.
      </p>
      <div class="text-xs text-blue-300">
        <strong>Local Backup Confirmation:</strong> Your submission (ID: ${payload.submittedAt}) is stored offline and will retry automatically.
      </div>
    `;
    output.classList.remove('bg-white', 'bg-opacity-10');
    output.classList.add('bg-yellow-900', 'bg-opacity-30', 'border-l-4', 'border-yellow-400');
  }
});

// ============================================================
// OPTIONAL: Retry offline leads when connection restored
// ============================================================
window.addEventListener('online', async () => {
  const backlog = JSON.parse(localStorage.getItem('leela_lead_backlog') || '[]');
  
  if (backlog.length > 0) {
    console.log(`Syncing ${backlog.length} offline leads...`);
    
    for (let i = backlog.length - 1; i >= 0; i--) {
      const lead = backlog[i];
      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead)
        });

        if (response.ok) {
          backlog.splice(i, 1); // Remove synced lead
          console.log(`Lead ${lead.submittedAt} synced successfully`);
        }
      } catch (e) {
        console.log('Sync failed, will retry later:', e);
      }
    }

    // Update local storage
    localStorage.setItem('leela_lead_backlog', JSON.stringify(backlog));
  }
});

