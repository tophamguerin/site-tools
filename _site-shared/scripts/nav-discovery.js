// Nav Discovery Script — run via Chrome MCP evaluate_script
// Extracts all navigable elements from the current page to build a site map.
//
// Usage: Copy the function body into evaluate_script's `function` parameter.
// Returns: Array of { type, text, href, section, ariaLabel } objects.

// eslint-disable-next-line no-unused-vars
const navDiscovery = () => {
  const nav = [];
  const seen = new Set();

  const add = (item) => {
    const key = item.href || `${item.type}:${item.text}`;
    if (!seen.has(key) && item.text) {
      seen.add(key);
      nav.push(item);
    }
  };

  // 1. Primary navigation links (nav bars, headers, sidebars)
  document.querySelectorAll('nav a, [role="navigation"] a, header a, aside a, [class*="sidebar"] a, [class*="nav"] a').forEach(el => {
    const href = el.href || '';
    const text = el.textContent.trim();
    if (text && href && !href.startsWith('javascript:') && !href.startsWith('#') && text.length < 100) {
      const section = el.closest('nav,aside,header,[role="navigation"]');
      add({
        type: 'nav-link',
        text,
        href,
        section: section ? (section.getAttribute('aria-label') || section.tagName) : null
      });
    }
  });

  // 2. Menu items and tabs
  document.querySelectorAll('[role="menuitem"], [role="tab"], [role="treeitem"]').forEach(el => {
    const href = el.href || '';
    const text = el.textContent.trim();
    add({
      type: el.getAttribute('role'),
      text,
      href: href || null,
      selected: el.getAttribute('aria-selected') || el.getAttribute('aria-current')
    });
  });

  // 3. Buttons that likely trigger navigation or major actions
  const navWords = /settings|admin|profile|account|preferences|configuration|manage|dashboard|home|help|support|billing|subscription|integrations|notifications|security|team|users|people|members|reports|analytics|export|import/i;
  document.querySelectorAll('button, [role="button"]').forEach(el => {
    const text = el.textContent.trim();
    const label = el.getAttribute('aria-label') || '';
    if ((navWords.test(text) || navWords.test(label)) && text.length < 80) {
      add({
        type: 'nav-button',
        text,
        ariaLabel: label || null
      });
    }
  });

  // 4. Links in main content area that might be sub-pages
  document.querySelectorAll('main a, [role="main"] a, .content a, #content a').forEach(el => {
    const href = el.href || '';
    const text = el.textContent.trim();
    if (text && href && !href.startsWith('javascript:') && !href.startsWith('#') && text.length < 100) {
      // Only include internal links
      if (href.startsWith(window.location.origin) || href.startsWith('/')) {
        add({ type: 'content-link', text, href });
      }
    }
  });

  return {
    url: window.location.href,
    title: document.title,
    navItems: nav,
    counts: {
      total: nav.length,
      navLinks: nav.filter(n => n.type === 'nav-link').length,
      menuItems: nav.filter(n => n.type === 'menuitem' || n.type === 'tab').length,
      buttons: nav.filter(n => n.type === 'nav-button').length,
      contentLinks: nav.filter(n => n.type === 'content-link').length
    }
  };
};
