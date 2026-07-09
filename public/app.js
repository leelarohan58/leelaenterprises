document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('leadForm');
  const output = document.getElementById('quoteOutput');

  // ============================================================
  // REAL-TIME CALCULATOR: Update pricing on form changes
  // ============================================================
  function updatePricing() {
    const solutionSelect = document.getElementById('solutionSelect');
    if (!solutionSelect) return; // Shield calculator from running if not on a pricing layout

    const solution = solutionSelect.value;
    const locations = Number(document.getElementById('locationsSlider')?.value || 1);
    const users = Number(document.getElementById('usersSlider')?.value || 1);
    const awsEnabled = document.getElementById('awsToggle')?.checked || false;

    // Base pricing tiers
    // NOTE: calculator supports full Tally Product Catalog.
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
        base: 0,
        multiplier: 0,
        unitsLabel: 'Per user/month',
        aws: 0,
        label: 'Tally on Cloud (AWS)'
      },
      biz: {
        base: 0,
        multiplier: 0,
        unitsLabel: 'Per mobile app access user/year',
        aws: 0,
        label: 'Biz Analyst by Tally'
      },
      otu: {
        base: 5000,
        multiplier: 0,
        unitsLabel: 'Per employee/month',
        aws: 0,
        label: 'Otu HRMS'
      },
      capital: {
        base: 0,
        multiplier: 0,
        unitsLabel: 'Custom working capital amount',
        aws: 0,
        label: 'Tally Capital'
      }
    };

    const strategy = strategies[solution] || strategies.silver;

    const units =
      solution === 'cloud' ? locations :
        solution === 'biz' ? users :
          solution === 'otu' ? locations :
            1;

    // Update tier label safely
    const tierLabel = document.getElementById('tierLabel');
    if (tierLabel) tierLabel.textContent = strategy.label;

    // GST fixed at 18%
    const gstRate = 0.18;

    const locationSection = document.getElementById('locationSection');
    const userSection = document.getElementById('userSection');
    const awsSection = document.getElementById('awsSection');

    // Safe execution block for layout wrappers
    if (!locationSection || !userSection || !awsSection) {
      return;
    }

    const capitalCustomBlock = document.getElementById('capitalCustomBlock');

    // Reset visibility configuration
    locationSection.classList.add('hidden');
    userSection.classList.add('hidden');
    awsSection.classList.add('hidden');

    // Option-2: Tally Capital (custom quote, GST=0)
    if (solution === 'capital') {
      const locationsBlock = document.getElementById('locationsBlock');
      const usersBlock = document.getElementById('usersBlock');
      const awsWrapper = document.getElementById('awsWrapper');
      const routingBadge = document.getElementById('routingBadge');

      if (locationsBlock) locationsBlock.classList.add('hidden');
      if (usersBlock) usersBlock.classList.add('hidden');
      if (awsWrapper) awsWrapper.classList.add('hidden');
      
      if (routingBadge) {
        routingBadge.innerHTML = `<strong>📋 Priority 2 Track:</strong> Routed sequentially to the inside sales rotation desk for custom assessment processing.`;
        routingBadge.classList.remove('bg-green-100', 'border-green-600');
        routingBadge.classList.add('bg-blue-100', 'border-blue-600');
      }

      if (capitalCustomBlock) capitalCustomBlock.classList.remove('hidden');

      if (document.getElementById('baseAmount')) document.getElementById('baseAmount').textContent = `₹0`;
      if (document.getElementById('subtotal')) document.getElementById('subtotal').textContent = `₹0`;
      if (document.getElementById('gstAmount')) document.getElementById('gstAmount').textContent = `₹0`;
      if (document.getElementById('totalAmount')) document.getElementById('totalAmount').textContent = `₹0`;

      const outputEl = document.getElementById('quoteOutput');
      if (outputEl) {
        outputEl.textContent = 'Custom Financial Assessment Required (No Upfront Fees)';
        outputEl.classList.add('hidden');
      }
      return;
    }

    // Option-2: Tally on Cloud
    if (solution === 'cloud') {
      const awsToggle = document.getElementById('awsToggle');
      if (awsToggle) awsToggle.checked = true;

      locationSection.classList.remove('hidden');
      userSection.classList.remove('hidden');
      awsSection.classList.add('hidden');

      if (document.getElementById('locLabel')) document.getElementById('locLabel').textContent = locations;
      if (document.getElementById('userLabel')) document.getElementById('userLabel').textContent = users;

      const totalNoGst = Math.round((users * 600) * locations);
      const finalGst = Math.round(totalNoGst * gstRate);
      const totalAmount = totalNoGst + finalGst;

      if (document.getElementById('baseAmount')) document.getElementById('baseAmount').textContent = `₹0`;
      if (document.getElementById('subtotal')) document.getElementById('subtotal').textContent = `₹${totalNoGst.toLocaleString('en-IN')}`;
      if (document.getElementById('gstAmount')) document.getElementById('gstAmount').textContent = `₹${finalGst.toLocaleString('en-IN')}`;
      if (document.getElementById('totalAmount')) document.getElementById('totalAmount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;

      if (document.getElementById('locationMultiplier')) document.getElementById('locationMultiplier').textContent = `×1 (locations multiplier)`;
      if (document.getElementById('userMultiplier')) document.getElementById('userMultiplier').textContent = `+ ₹${(users * 600).toLocaleString('en-IN')} (users × ₹600/month)`;
    }
    // Option-2: Biz Analyst by Tally
    else if (solution === 'biz') {
      const awsToggle = document.getElementById('awsToggle');
      const awsWrapper = document.getElementById('awsWrapper');
      if (awsToggle) awsToggle.checked = false;
      if (awsWrapper) awsWrapper.classList.add('hidden');

      locationSection.classList.remove('hidden');
      userSection.classList.remove('hidden');
      awsSection.classList.add('hidden');

      if (document.getElementById('userLabel')) document.getElementById('userLabel').textContent = users;

      const concurrentLabel = document.querySelector('label[for="concurrentUsers"]') || document.getElementById('usersBlock')?.querySelector('label');
      if (concurrentLabel) {
        concurrentLabel.textContent = 'Mobile App Access Users: ' + users;
        const span = concurrentLabel.querySelector('span#userLabel');
        if (span) span.textContent = users;
      }

      const totalNoGst = Math.round(users * 1200);
      const finalGst = Math.round(totalNoGst * gstRate);
      const totalAmount = totalNoGst + finalGst;

      if (document.getElementById('baseAmount')) document.getElementById('baseAmount').textContent = `₹0`;
      if (document.getElementById('subtotal')) document.getElementById('subtotal').textContent = `₹${totalNoGst.toLocaleString('en-IN')}`;
      if (document.getElementById('gstAmount')) document.getElementById('gstAmount').textContent = `₹${finalGst.toLocaleString('en-IN')}`;
      if (document.getElementById('totalAmount')) document.getElementById('totalAmount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;

      if (document.getElementById('locationMultiplier')) document.getElementById('locationMultiplier').textContent = `×1 (locations multiplier)`;
      if (document.getElementById('userMultiplier')) document.getElementById('userMultiplier').textContent = `+ ₹${(users * 1200).toLocaleString('en-IN')} (users × ₹1,200/year)`;
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

      const label = document.getElementById('usersBlock')?.querySelector('label');
      if (label) {
        label.innerHTML = 'Total Employees (Payroll Profiles): <span id="userLabel">' + users + '</span>';
      }

      const totalNoGst = Math.round(5000 + users * 50);
      const finalGst = Math.round(totalNoGst * gstRate);
      const totalAmount = totalNoGst + finalGst;

      if (document.getElementById('baseAmount')) document.getElementById('baseAmount').textContent = `₹${5000.toLocaleString('en-IN')}`;
      if (document.getElementById('subtotal')) document.getElementById('subtotal').textContent = `₹${totalNoGst.toLocaleString('en-IN')}`;
      if (document.getElementById('gstAmount')) document.getElementById('gstAmount').textContent = `₹${finalGst.toLocaleString('en-IN')}`;
      if (document.getElementById('totalAmount')) document.getElementById('totalAmount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;

      if (document.getElementById('locationMultiplier')) document.getElementById('locationMultiplier').textContent = `×1 (locations multiplier)`;
      if (document.getElementById('userMultiplier')) document.getElementById('userMultiplier').textContent = `+ ₹${(users * 50).toLocaleString('en-IN')} (employees × ₹50/month)`;
    }
    else {
      // Fallback (silver/gold/server catalog)
      if (solution === 'cloud' || solution === 'otu') {
        locationSection.classList.remove('hidden');
      }
      if (solution === 'biz') {
        userSection.classList.remove('hidden');
      }
      if (awsEnabled) {
        awsSection.classList.remove('hidden');
      }

      if (document.getElementById('baseAmount')) document.getElementById('baseAmount').textContent = `₹${strategy.base.toLocaleString('en-IN')}`;
      const subtotal = Math.round(strategy.base + (units * strategy.multiplier) + strategy.aws);
      if (document.getElementById('subtotal')) document.getElementById('subtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
      const finalGst = Math.round(subtotal * gstRate);
      if (document.getElementById('gstAmount')) document.getElementById('gstAmount').textContent = `₹${finalGst.toLocaleString('en-IN')}`;
      const totalAmount = subtotal + finalGst;
      if (document.getElementById('totalAmount')) document.getElementById('totalAmount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
    }

    // ============================================================
    // ROUTING LOGIC: Priority 1 vs Priority 2
    // ============================================================
    const routingBadge = document.getElementById('routingBadge');
    const isEnterprise = solution === 'server' || locations >= 2 || (awsEnabled && users >= 5);

    if (routingBadge) {
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
  }

  // Safe UI Interaction Listeners
  document.getElementById('locationsSlider')?.addEventListener('input', (e) => {
    const locLabel = document.getElementById('locLabel');
    if (locLabel) locLabel.textContent = e.target.value;
    updatePricing();
  });

  document.getElementById('usersSlider')?.addEventListener('input', (e) => {
    const userLabel = document.getElementById('userLabel');
    if (userLabel) userLabel.textContent = e.target.value;
    updatePricing();
  });

  document.getElementById('solutionSelect')?.addEventListener('change', updatePricing);
  document.getElementById('awsToggle')?.addEventListener('change', updatePricing);

  // Initialize early layout matrix calculations
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
  if (form) {
    form.addEventListener('submit', async (event) => {
      // 1. Instantly halt browser page reload/redirect sequence
      event.preventDefault();

      const formData = new FormData(form);
      const rawPayload = Object.fromEntries(formData.entries());

      // 2. Map payload keys explicitly to match database structures
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

      // Check for disposable emails
      if (isDisposableEmail(payload.email)) {
        if (output) {
          output.innerHTML = `<span class="text-red-400">❌ Standard corporate domain email verification required.</span>`;
        }
        return;
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
        const response = await fetch("https://hooks.zapier.com/hooks/catch/28126363/42vz9cz/", {
          method: "POST",
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
