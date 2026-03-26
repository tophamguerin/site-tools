// Interactive Elements Discovery Script — run via Chrome MCP evaluate_script
// Finds all clickable/interactive elements on the current page for systematic exploration.
//
// Usage: Copy the function body into evaluate_script's `function` parameter.
// Returns: Array of { type, text, uid, state } objects, prioritised by exploration value.

// eslint-disable-next-line no-unused-vars
const interactiveElements = () => {
  const elements = [];
  const seen = new Set();

  const add = (item) => {
    const key = `${item.type}:${item.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      elements.push(item);
    }
  };

  // Priority 1: Tabs
  document.querySelectorAll('[role="tab"]').forEach(el => {
    add({
      type: 'tab',
      priority: 1,
      text: el.textContent.trim(),
      selected: el.getAttribute('aria-selected') === 'true',
      ariaLabel: el.getAttribute('aria-label')
    });
  });

  // Priority 2: Sub-navigation within the page
  document.querySelectorAll('[role="treeitem"], [class*="subnav"] a, [class*="sub-nav"] a, .secondary-nav a').forEach(el => {
    add({
      type: 'sub-nav',
      priority: 2,
      text: el.textContent.trim(),
      href: el.href || null
    });
  });

  // Priority 3: Filters and search
  document.querySelectorAll('[class*="filter"], [class*="search"], [role="search"], [class*="sort"]').forEach(el => {
    const text = el.textContent.trim().slice(0, 60);
    if (text) add({ type: 'filter-or-search', priority: 3, text });
  });

  // Priority 4: Select dropdowns
  document.querySelectorAll('select, [role="combobox"], [role="listbox"]').forEach(el => {
    const label = el.getAttribute('aria-label') || el.closest('label')?.textContent.trim() || '';
    const options = el.querySelectorAll ? [...el.querySelectorAll('option')].map(o => o.textContent.trim()) : [];
    add({
      type: 'dropdown',
      priority: 4,
      text: label.slice(0, 60),
      optionCount: options.length,
      sampleOptions: options.slice(0, 5)
    });
  });

  // Priority 5: Action buttons (Add, New, Create, Edit)
  const createWords = /^(add|new|create|invite|upload)\b/i;
  const editWords = /^(edit|modify|update|change|configure|manage)\b/i;
  document.querySelectorAll('button, [role="button"], a.btn, a.button, [class*="btn"]').forEach(el => {
    const text = el.textContent.trim();
    const label = el.getAttribute('aria-label') || '';
    if (createWords.test(text) || createWords.test(label)) {
      add({ type: 'create-action', priority: 5, text: text.slice(0, 60), ariaLabel: label });
    } else if (editWords.test(text) || editWords.test(label)) {
      add({ type: 'edit-action', priority: 5, text: text.slice(0, 60), ariaLabel: label });
    }
  });

  // Priority 6: Kebab/ellipsis/overflow menus
  document.querySelectorAll('[aria-haspopup="true"], [aria-haspopup="menu"], [class*="kebab"], [class*="ellipsis"], [class*="overflow"], [class*="more-actions"]').forEach(el => {
    add({
      type: 'overflow-menu',
      priority: 6,
      text: el.textContent.trim().slice(0, 40) || '[icon menu]',
      ariaLabel: el.getAttribute('aria-label')
    });
  });

  // Priority 7: Expandable/collapsible sections
  document.querySelectorAll('[aria-expanded], details, [class*="accordion"], [class*="collapsible"], [class*="expandable"]').forEach(el => {
    const summary = el.querySelector('summary, [class*="header"], [class*="trigger"]');
    add({
      type: 'expandable',
      priority: 7,
      text: (summary || el).textContent.trim().slice(0, 80),
      expanded: el.getAttribute('aria-expanded') === 'true' || el.open === true
    });
  });

  // Priority 8: Toggle switches
  document.querySelectorAll('[role="switch"], [type="checkbox"][class*="toggle"], [class*="toggle"][role="button"]').forEach(el => {
    add({
      type: 'toggle',
      priority: 8,
      text: (el.getAttribute('aria-label') || el.closest('label')?.textContent.trim() || '').slice(0, 60),
      checked: el.getAttribute('aria-checked') || el.checked
    });
  });

  // Priority 9: Pagination
  document.querySelectorAll('[class*="pagination"], [role="navigation"][aria-label*="page"], [class*="pager"]').forEach(el => {
    const pages = el.querySelectorAll('a, button');
    add({
      type: 'pagination',
      priority: 9,
      text: `${pages.length} page links`,
      currentPage: el.querySelector('[aria-current="page"], .active')?.textContent.trim()
    });
  });

  // Sort by priority
  elements.sort((a, b) => a.priority - b.priority);

  return {
    url: window.location.href,
    elements,
    summary: {
      total: elements.length,
      tabs: elements.filter(e => e.type === 'tab').length,
      subNav: elements.filter(e => e.type === 'sub-nav').length,
      filters: elements.filter(e => e.type === 'filter-or-search').length,
      dropdowns: elements.filter(e => e.type === 'dropdown').length,
      createActions: elements.filter(e => e.type === 'create-action').length,
      editActions: elements.filter(e => e.type === 'edit-action').length,
      menus: elements.filter(e => e.type === 'overflow-menu').length,
      expandable: elements.filter(e => e.type === 'expandable').length,
      toggles: elements.filter(e => e.type === 'toggle').length,
      pagination: elements.filter(e => e.type === 'pagination').length
    }
  };
};
