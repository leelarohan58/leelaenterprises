const form = document.getElementById('leadForm');
const output = document.getElementById('quoteOutput');

// ============================================================
// REAL-TIME CALCULATOR: Update pricing on form changes
// ============================================================
function updatePricing() {
  const solution = document.getElementById('solutionSelect').value;
  const locations = Number(document.getElementById('locationsSlider')?.value || 1);
  const users = Number(document.getElementById('usersSlider')?.value || 1);
  const awsEnabled = document.getElementById('awsToggle')?.checked || false;

  // Base pricing tiers
  // NOTE: calculator now supports full Tally Product Catalog.
  // Strategy model:
  // - GST is fixed at 18%.
  // - Subtotal = base + (units * multiplier) + aws
  // - Final total = subtotal + (subtotal * 0.18)
  const strategies = {
    // ============================================================
    // NOTE: silver/gold/server MUST remain untouched.
    // Option-2 dynamic rules apply only to cloud/biz/otu/capital.
    // ============================================================
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

    // Option 2 rules
    // 1) Tally on Cloud:
    //    Base = ₹0
    //    Location Multiplier = 1
    //    User Multiplier = ₹600/user/month
    //    Force AWS toggle ON
    //    Total = (Users * ₹600) * Locations
    cloud: {
      base: 0,
      multiplier: 0, // handled via special calculation below
      unitsLabel: 'Per user/month',
      aws: 0, // aws line item not used in Option-2 totals
      label: 'Tally on Cloud (AWS)'
    },

    // 2) Biz Analyst by Tally:
    //    Base = ₹0
    //    Location Multiplier = 1
    //    User Multiplier = ₹1,200/user/year
    //    Hide AWS toggle
    //    Users slider label: Mobile App Access Users
    biz: {
      base: 0,
      multiplier: 0,
      unitsLabel: 'Per mobile app access user/year',
      aws: 0,
      label: 'Biz Analyst by Tally'
    },

    // 3) Otu HRMS:
    //    Base = ₹5,000 one-time fee
    //    Location Multiplier = 1
    //    User Multiplier = ₹50/employee/month
    //    Hide AWS toggle
    //    Users slider label: Total Employees (Payroll Profiles)
    otu: {
      base: 5000,
      multiplier: 0,
      unitsLabel: 'Per employee/month',
      aws: 0,
      label: 'Otu HRMS'
    },

    // 4) Tally Capital:
    //    Base = ₹0
    //    Hide Locations dropdown, Users slider, and AWS toggle
    //    Render custom text numeric input labeled Desired Working Capital / Loan Amount (₹)
    //    Output box: Custom Financial Assessment Required (No Upfront Fees)
    //    Pass GST as ₹0
    capital: {
      base: 0,
      multiplier: 0,
      unitsLabel: 'Custom working capital amount',
      aws: 0,
      label: 'Tally Capital'
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

  // ============================================================
  // Option-2 dynamic UI rules + pricing calculations
  // ============================================================
  // Defaults (used by silver/gold/server)
  if (!locationSection || !userSection || !awsSection) {
    return;
  }

  const capitalCustomBlock = document.getElementById('capitalCustomBlock');

  // Hide all multiplier sections by default; then enable per solution.
  locationSection.classList.add('hidden');
  userSection.classList.add('hidden');
  awsSection.classList.add('hidden');

  // Option-2: Tally Capital (custom quote, GST=0)
  if (solution === 'capital') {
    // Hide AWS toggle and sliders in UI (blocks exist in pricing.html)
    const locationsBlock = document.getElementById('locationsBlock');
    const usersBlock = document.getElementById('usersBlock');
    const awsWrapper = document.getElementById('awsWrapper');

    if (locationsBlock) locationsBlock.classList.add('hidden');
    if (usersBlock) usersBlock.classList.add('hidden');
    if (awsWrapper) awsWrapper.classList.add('hidden');
    if (document.getElementById('routingBadge')) {
      document.getElementById('routingBadge').innerHTML = `<strong>📋 Priority 2 Track:</strong> Routed sequentially to the inside sales rotation desk for custom assessment processing.`;
      document.getElementById('routingBadge').classList.remove('bg-green-100', 'border-green-600');
      document.getElementById('routingBadge').classList.add('bg-blue-100', 'border-blue-600');
    }

    if (capitalCustomBlock) capitalCustomBlock.classList.remove('hidden');

    document.getElementById('baseAmount').textContent = `₹0`;
    document.getElementById('tierLabel').textContent = 'Tally Capital (Enterprise Quote)';
    document.getElementById('subtotal').textContent = `₹0`;
    document.getElementById('gstAmount').textContent = `₹0`;
    document.getElementById('totalAmount').textContent = `₹0`;

    document.getElementById('quoteOutput')?.classList.add('hidden');

    // Custom quote message requirement
    // Also set output box text dynamically immediately.
    const outputEl = document.getElementById('quoteOutput');
    if (outputEl) {
      outputEl.textContent = 'Custom Financial Assessment Required (No Upfront Fees)';
    }

    // Option-2: GST forced to 0, no calculations.
    return;
  }

  // Option-2: Tally on Cloud
  if (solution === 'cloud') {
    // Force AWS toggle ON
    const awsToggle = document.getElementById('awsToggle');
    if (awsToggle) {
      awsToggle.checked = true;
    }

    // UI: show Locations section; hide AWS cost line item (no separate AWS line item requirement)
    locationSection.classList.remove('hidden');
    userSection.classList.remove('hidden');
    awsSection.classList.add('hidden');

    // Slider labels
    document.getElementById('locLabel') && (document.getElementById('locLabel').textContent = locations);
    document.getElementById('userLabel') && (document.getElementById('userLabel').textContent = users);

    document.getElementById('tierLabel').textContent = 'Tally on Cloud (AWS)';

    const totalNoGst = Math.round((users * 600) * locations);
    const finalGst = Math.round(totalNoGst * gstRate);
    const totalAmount = totalNoGst + finalGst;

    document.getElementById('baseAmount').textContent = `₹0`;
    document.getElementById('subtotal').textContent = `₹${totalNoGst.toLocaleString('en-IN')}`;
    document.getElementById('gstAmount').textContent = `₹${finalGst.toLocaleString('en-IN')}`;
    document.getElementById('totalAmount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;

    document.getElementById('locationMultiplier').textContent = `×1 (locations multiplier)`;
    document.getElementById('userMultiplier').textContent = `+ ₹${(users * 600).toLocaleString('en-IN')} (users × ₹600/month)`;

    // Routing rule can remain existing.
  }
  // Option-2: Biz Analyst by Tally
  else if (solution === 'biz') {
    // Hide AWS toggle line item
    const awsToggle = document.getElementById('awsToggle');
    const awsWrapper = document.getElementById('awsWrapper');
    if (awsToggle) awsToggle.checked = false;
    if (awsWrapper) awsWrapper.classList.add('hidden');

    // Hide locations dropdown for biz (Option 2 says hide AWS toggle; and dynamic UI hide AWS toggle; location multiplier =1 but locations dropdown can stay; requirement only says hide AWS toggle)
    // We keep locations visible; calculation uses multiplier=1.

    locationSection.classList.remove('hidden');
    userSection.classList.remove('hidden');
    awsSection.classList.add('hidden');

    // Relabel users slider
    const userLabelEl = document.getElementById('usersLabel');
    document.getElementById('userLabel') && (document.getElementById('userLabel').textContent = users);
    const usersLabelSpan = document.getElementById('usersLabelText') || document.getElementById('usersBlock');
    document.getElementById('usersBlock')?.querySelector('label')?.classList && null;

    const concurrentLabel = document.querySelector('label[for="concurrentUsers"]') || document.getElementById('usersBlock')?.querySelector('label');
    if (concurrentLabel) {
      // Keep the real-time IDs used by calculator (userLabel) intact.
      concurrentLabel.childNodes.forEach?.(() => { });
      concurrentLabel.textContent = 'Mobile App Access Users: ' + users;
      const span = concurrentLabel.querySelector('span#userLabel');
      if (span) span.textContent = users;
    }

    // Ensure slider value still drives #userLabel
    const userLabelSpan = document.getElementById('userLabel');
    if (userLabelSpan) userLabelSpan.textContent = users;

    document.getElementById('tierLabel').textContent = 'Biz Analyst by Tally';

    // Base=0; total=(users*1200)*1; interpret as annual then apply GST
    const totalNoGst = Math.round(users * 1200);
    const finalGst = Math.round(totalNoGst * gstRate);
    const totalAmount = totalNoGst + finalGst;

    document.getElementById('baseAmount').textContent = `₹0`;
    document.getElementById('subtotal').textContent = `₹${totalNoGst.toLocaleString('en-IN')}`;
    document.getElementById('gstAmount').textContent = `₹${finalGst.toLocaleString('en-IN')}`;
    document.getElementById('totalAmount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;

    document.getElementById('locationMultiplier').textContent = `×1 (locations multiplier)`;
    document.getElementById('userMultiplier').textContent = `+ ₹${(users * 1200).toLocaleString('en-IN')} (users × ₹1,200/year)`;
  }
  // Option-2: Otu HRMS
  else if (solution === 'otu') {
    const awsToggle = document.getElementById('awsToggle');
    const awsWrapper = document.getElementById('awsWrapper');
    if (awsToggle) awsToggle.checked = false;
    if (awsWrapper) awsWrapper.classList.add('hidden');

    locationSection.classList.remove('hidden');
    userSection.classList.remove('hidden');
    awsSection.classList.add('hidden');

    // Relabel users slider
    const label = document.getElementById('usersBlock')?.querySelector('label');
    if (label) {
      label.innerHTML = 'Total Employees (Payroll Profiles): <span id="userLabel">' + users + '</span>';
    }

    document.getElementById('tierLabel').textContent = 'Otu HRMS';

    // Base=5000 one-time; user multiplier=50/employee/month; total = base + (users*50) ; locations multiplier=1
    const totalNoGst = Math.round(5000 + users * 50);
    const finalGst = Math.round(totalNoGst * gstRate);
    const totalAmount = totalNoGst + finalGst;

    document.getElementById('baseAmount').textContent = `₹${5000.toLocaleString('en-IN')
  } `;
    document.getElementById('subtotal').textContent = `₹${ totalNoGst.toLocaleString('en-IN') } `;
    document.getElementById('gstAmount').textContent = `₹${ finalGst.toLocaleString('en-IN') } `;
    document.getElementById('totalAmount').textContent = `₹${ totalAmount.toLocaleString('en-IN') } `;

    document.getElementById('locationMultiplier').textContent = `×1(locations multiplier)`;
    document.getElementById('userMultiplier').textContent = `+ ₹${ (users * 50).toLocaleString('en-IN') } (employees × ₹50 / month)`;
  }
  else {
    // Fallback (silver/gold/server)
    // Use the legacy strategy math
    if (solution === 'cloud' || solution === 'otu') {
      locationSection.classList.remove('hidden');
    }
    if (solution === 'biz') {
      userSection.classList.remove('hidden');
    }

    if (awsEnabled) {
      awsSection.classList.remove('hidden');
    }

    document.getElementById('baseAmount').textContent = `₹${ strategy.base.toLocaleString('en-IN') } `;
    const subtotal = Math.round(strategy.base + (units * strategy.multiplier) + strategy.aws);
    document.getElementById('subtotal').textContent = `₹${ subtotal.toLocaleString('en-IN') } `;
    const finalGst = Math.round(subtotal * gstRate);
    document.getElementById('gstAmount').textContent = `₹${ finalGst.toLocaleString('en-IN') } `;
    const totalAmount = subtotal + finalGst;
    document.getElementById('totalAmount').textContent = `₹${ totalAmount.toLocaleString('en-IN') } `;
  }

  // ============================================================
  // End Option-2 dynamic pricing/UI section
  // ============================================================



  // ============================================================
  // ROUTING LOGIC: Priority 1 vs Priority 2
  // ============================================================
  const routingBadge = document.getElementById('routingBadge');
  const isEnterprise = solution === 'server' || locations >= 2 || (awsEnabled && users >= 5);

  if (isEnterprise) {
    routingBadge.innerHTML = `< strong >🚀 Priority 1 Routing Triggered:</strong > Complex enterprise scenario.Alerts routed to Senior Solutions Architects for dedicated implementation support.`;
    routingBadge.classList.remove('bg-blue-100', 'border-blue-600');
    routingBadge.classList.add('bg-green-100', 'border-green-600');
  } else {
    routingBadge.innerHTML = `< strong >📋 Priority 2 Track:</strong > Routed sequentially to the inside sales rotation desk for standard processing.`;
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
    normalized.endsWith(`@${ domain } `) || normalized.includes(domain)
  );
}

// ============================================================
// FORM SUBMISSION HANDLER
// ============================================================
if (form) {
  form.addEventListener('submit', async (event) => {
    // 1. Instantly halt browser page reload/redirect
    event.preventDefault();

    const formData = new FormData(form);
    const rawPayload = Object.fromEntries(formData.entries());

    // 2. Map payload keys explicitly to match your Supabase column requirements
    const payload = {
      fullName: rawPayload.name || rawPayload.fullName || document.getElementById('name')?.value || '',
      companyName: rawPayload.companyName || rawPayload.company || document.getElementById('companyName')?.value || '',
      email: rawPayload.email || document.getElementById('email')?.value || '',
      phoneNumber: rawPayload.phone || rawPayload.phoneNumber || document.getElementById('phone')?.value || '',
      licenseTier: document.getElementById('solutionSelect')?.value || 'silver',
      locations: Number(rawPayload.locations || document.getElementById('locationsSlider')?.value || 1),
      concurrentUsers: Number(rawPayload.concurrentUsers || document.getElementById('usersSlider')?.value || 1),
      awsEnabled: document.getElementById('awsToggle')?.checked || false,
      submittedAt: new Date().toISOString()
    };

    // Display output area loading state
    if (output) {
      output.classList.remove('hidden');
      output.innerHTML = '<span class="text-orange-300">Connecting to secure data stream...</span>';
    }

    // 3. Submit structured JSON packet to Zapier Webhook
    try {
      const response = await fetch('https://hooks.zapier.com/hooks/catch/28126363/42vz9cz/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });

      // Zapier webhook catch endpoints usually return a status of 200/json directly
      if (response.ok) {
        if (output) {
          output.innerHTML = `
            <div class="mb-4">
              <strong class="text-green-300">✓ Pricing Inquiry Synced Successfully!</strong>
            </div>
            <div class="space-y-2 text-sm text-blue-200">
              <p>Your custom configuration has been securely transmitted to our engineering matrix.</p>
              <p class="text-xs text-blue-400 mt-2">Check your phone shortly if requesting an instant triage agent fallback.</p>
            </div>
          `;
          output.classList.remove('bg-white', 'bg-opacity-10');
          output.classList.add('bg-green-900', 'bg-opacity-30', 'border-l-4', 'border-green-400');
        }
      } else {
        throw new Error('Webhook rejected payload structure');
      }
    } catch (error) {
      console.log('Network routing failed, engaging offline local sync fallback:', error);

      // Store lead locally for offline resilience
      const leadBacklog = JSON.parse(localStorage.getItem('leela_lead_backlog') || '[]');
      payload.status = 'pending_sync';
      leadBacklog.push(payload);
      localStorage.setItem('leela_lead_backlog', JSON.stringify(leadBacklog));

      if (output) {
        output.innerHTML = `
          <div class="mb-3">
            <strong class="text-yellow-300">🔄 System Sync Fallback Mode Engaged</strong>
          </div>
          <p class="text-sm mb-3 text-gray-300">
            Our data node is experiencing temporary latency. Your inquiry configuration has been safely cached locally and will sync auto-actively once full routing integrity clears.
          </p>
        `;
        output.classList.remove('bg-white', 'bg-opacity-10');
        output.classList.add('bg-yellow-900', 'bg-opacity-30', 'border-l-4', 'border-yellow-400');
      }
    }
  });
} else {
  console.log("Form with ID 'leadForm' not detected on this layout. Event listeners bypassed safely.");
}

// ============================================================
// OPTIONAL: Retry offline leads when connection restored
// ============================================================
window.addEventListener('online', async () => {
  const backlog = JSON.parse(localStorage.getItem('leela_lead_backlog') || '[]');

  if (backlog.length > 0) {
    console.log(`Syncing ${ backlog.length } offline leads...`);

    for (let i = backlog.length - 1; i >= 0; i--) {
      const lead = backlog[i];
      try {
        const response = await fetch(" https://hooks.zapier.com/hooks/catch/28126363/42vz9cz/ ", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead)
        });

        if (response.ok) {
          backlog.splice(i, 1); // Remove synced lead
          console.log(`Lead ${ lead.submittedAt } synced successfully`);
        }
      } catch (e) {
        console.log('Sync failed, will retry later:', e);
      }
    }

    // Update local storage
    localStorage.setItem('leela_lead_backlog', JSON.stringify(backlog));
  }
});

