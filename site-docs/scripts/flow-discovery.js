// Flow Discovery Script — run via Chrome MCP evaluate_script
// Identifies documentable user flows on the current page: creation forms, wizards,
// settings panels, import/export actions, and CRUD operations.
//
// Usage: Run via evaluate_script after navigating to a page. Best run AFTER
//        interactive-elements.js to avoid redundant DOM scanning.
// Returns: { url, flows: [{ type, title, entrySelector, entryText, complexity, relatedElements }], summary }

// eslint-disable-next-line no-unused-vars
const flowDiscovery = () => {
  const flows = [];
  const seen = new Set();

  const add = (flow) => {
    if (!flow.entrySelector || seen.has(flow.entrySelector)) return;
    seen.add(flow.entrySelector);
    flows.push(flow);
  };

  // Build a CSS selector for an element (best-effort, for documentation reference)
  const selectorFor = (el) => {
    if (el.id) return `#${el.id}`;
    const tag = el.tagName.toLowerCase();
    const cls = [...el.classList].filter(c => !c.match(/^(active|open|selected|focused|hover)/)).slice(0, 2).join('.');
    const text = el.textContent.trim().slice(0, 30);
    if (cls) return `${tag}.${cls}`;
    if (el.getAttribute('aria-label')) return `${tag}[aria-label="${el.getAttribute('aria-label').slice(0, 40)}"]`;
    if (text && tag === 'button') return `button:has-text("${text}")`;
    return tag;
  };

  // Estimate step complexity based on what a flow involves
  // simple: 1-2 steps, moderate: 3-6 steps, complex: 7+
  const estimateComplexity = (relatedCount) => {
    if (relatedCount <= 2) return 'simple';
    if (relatedCount <= 6) return 'moderate';
    return 'complex';
  };

  // Helper: check if element is visible
  const isVisible = (el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0;

  // --- 1. Creation flows: "Add", "New", "Create", "Invite", "Upload" buttons ---
  const createPattern = /^(add|new|create|invite|upload)\b/i;
  document.querySelectorAll('button, [role="button"], a.btn, a.button, [class*="btn"]').forEach(el => {
    if (!isVisible(el)) return;
    const text = el.textContent.trim();
    const label = el.getAttribute('aria-label') || '';
    if (createPattern.test(text) || createPattern.test(label)) {
      add({
        type: 'create',
        title: `Create: ${(text || label).slice(0, 60)}`,
        entrySelector: selectorFor(el),
        entryText: text.slice(0, 80),
        complexity: 'moderate', // creation flows typically have a form
        relatedElements: 1
      });
    }
  });

  // --- 2. Substantive forms (multi-field, not single-input search bars) ---
  document.querySelectorAll('form').forEach(form => {
    if (!isVisible(form)) return;
    const visibleFields = [...form.querySelectorAll('input, textarea, select, [contenteditable="true"]')]
      .filter(f => f.type !== 'hidden' && isVisible(f));

    // Exclude search bars: single visible input with search-like attributes
    if (visibleFields.length <= 1) {
      const field = visibleFields[0];
      if (!field) return;
      const isSearch = field.type === 'search'
        || form.closest('[role="search"]')
        || /search|query|find/i.test(field.name || '')
        || /search|query|find/i.test(field.placeholder || '');
      if (isSearch) return;
    }

    // Skip forms with no visible fields
    if (visibleFields.length === 0) return;

    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
    const formLabel = form.getAttribute('aria-label')
      || form.closest('[aria-label]')?.getAttribute('aria-label')
      || (submitBtn ? submitBtn.textContent.trim() : null)
      || 'Unnamed form';

    // Estimate steps: 1 step per ~3 fields + 1 for submit
    const estimatedSteps = Math.ceil(visibleFields.length / 3) + 1;

    add({
      type: 'form',
      title: `Form: ${formLabel.slice(0, 60)}`,
      entrySelector: selectorFor(form),
      entryText: formLabel.slice(0, 80),
      complexity: estimateComplexity(estimatedSteps),
      relatedElements: visibleFields.length
    });
  });

  // --- 3. Multi-step wizards: step indicators, progress bars, Next/Previous pairs ---
  const wizardIndicators = document.querySelectorAll(
    '[class*="stepper"], [class*="wizard"], [class*="step-indicator"], '
    + '[class*="progress-step"], [role="progressbar"], '
    + '[class*="multi-step"], [class*="multistep"]'
  );
  wizardIndicators.forEach(el => {
    if (!isVisible(el)) return;
    const steps = el.querySelectorAll('[class*="step"], li, [role="tab"]');
    add({
      type: 'wizard',
      title: `Wizard: ${(el.getAttribute('aria-label') || 'Multi-step process').slice(0, 60)}`,
      entrySelector: selectorFor(el),
      entryText: el.textContent.trim().slice(0, 80),
      complexity: estimateComplexity(steps.length || 3),
      relatedElements: steps.length || 0
    });
  });

  // Also detect Next/Previous button pairs (heuristic for wizards without step indicators)
  const nextBtns = document.querySelectorAll('button, [role="button"]');
  let hasNextPrev = false;
  nextBtns.forEach(btn => {
    if (hasNextPrev) return;
    const text = btn.textContent.trim().toLowerCase();
    if (/^(next|continue|proceed)\b/.test(text)) {
      // Look for a sibling or nearby "Back" / "Previous" button
      const parent = btn.closest('div, form, section, footer');
      if (parent) {
        const siblings = parent.querySelectorAll('button, [role="button"]');
        const hasPrev = [...siblings].some(s => /^(back|previous|prev)\b/i.test(s.textContent.trim()));
        if (hasPrev) {
          hasNextPrev = true;
          add({
            type: 'wizard',
            title: 'Wizard: Multi-step flow (Next/Back buttons detected)',
            entrySelector: selectorFor(btn),
            entryText: btn.textContent.trim().slice(0, 80),
            complexity: 'moderate',
            relatedElements: 2
          });
        }
      }
    }
  });

  // --- 4. Settings/configuration: toggles, selects in settings-like containers ---
  document.querySelectorAll(
    '[class*="settings"], [class*="preferences"], [class*="config"], '
    + '[class*="options"]:not(select [class*="options"])'
  ).forEach(container => {
    if (!isVisible(container)) return;
    const toggles = container.querySelectorAll('[role="switch"], [type="checkbox"], select, [role="combobox"]');
    if (toggles.length === 0) return;

    add({
      type: 'settings',
      title: `Settings: ${(container.getAttribute('aria-label') || container.querySelector('h1,h2,h3,h4')?.textContent.trim() || 'Configuration').slice(0, 60)}`,
      entrySelector: selectorFor(container),
      entryText: container.textContent.trim().slice(0, 80),
      complexity: estimateComplexity(toggles.length),
      relatedElements: toggles.length
    });
  });

  // --- 5. Import/export: "Import", "Export", "Download" buttons ---
  const ioPattern = /^(import|export|download|upload)\b/i;
  document.querySelectorAll('button, [role="button"], a.btn, a.button, [class*="btn"]').forEach(el => {
    if (!isVisible(el)) return;
    const text = el.textContent.trim();
    const label = el.getAttribute('aria-label') || '';
    if (ioPattern.test(text) || ioPattern.test(label)) {
      // Avoid double-counting with creation flows (upload is in both patterns)
      if (createPattern.test(text) || createPattern.test(label)) return;
      add({
        type: 'import-export',
        title: `${text.split(/\s/)[0]}: ${(text || label).slice(0, 60)}`,
        entrySelector: selectorFor(el),
        entryText: text.slice(0, 80),
        complexity: 'simple',
        relatedElements: 1
      });
    }
  });

  // --- 6. CRUD operations: tables/lists with row-level action buttons ---
  document.querySelectorAll('table, [role="table"], [role="grid"], [class*="data-table"], [class*="list-view"]').forEach(container => {
    if (!isVisible(container)) return;
    const rows = container.querySelectorAll('tr, [role="row"]');
    if (rows.length < 2) return; // Need at least header + 1 data row

    // Check for row-level actions
    const rowActions = container.querySelectorAll(
      'button, [role="button"], a.btn, [class*="action"], '
      + '[aria-haspopup="menu"], [class*="kebab"], [class*="more"]'
    );
    if (rowActions.length === 0) return;

    const tableLabel = container.getAttribute('aria-label')
      || container.closest('section')?.querySelector('h1,h2,h3,h4')?.textContent.trim()
      || 'Data table';

    add({
      type: 'crud',
      title: `CRUD: ${tableLabel.slice(0, 60)}`,
      entrySelector: selectorFor(container),
      entryText: tableLabel.slice(0, 80),
      complexity: estimateComplexity(rows.length),
      relatedElements: rows.length
    });
  });

  // Build summary by type
  const byType = {};
  flows.forEach(f => { byType[f.type] = (byType[f.type] || 0) + 1; });

  return {
    url: window.location.href,
    flows,
    summary: {
      total: flows.length,
      byType
    }
  };
};
