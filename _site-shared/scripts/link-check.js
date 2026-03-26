// Link Check — run via Chrome MCP evaluate_script
// Extracts all links on the current page and classifies them for validation.
//
// Usage: Run the function body via evaluate_script. Returns classified links.
// The skill then validates each link by navigating or checking the DOM.

// eslint-disable-next-line no-unused-vars
const linkCheck = () => {
  const links = [];
  const seen = new Set();

  document.querySelectorAll('a[href], area[href]').forEach(el => {
    const href = el.getAttribute('href') || '';
    const resolvedHref = el.href || ''; // browser-resolved absolute URL
    const text = el.textContent.trim().slice(0, 100) || el.getAttribute('aria-label') || '[no text]';

    if (seen.has(resolvedHref || href)) return;
    seen.add(resolvedHref || href);

    let type;
    if (!href || href === '#') {
      type = 'empty-or-hash';
    } else if (href.startsWith('javascript:')) {
      type = 'javascript';
    } else if (href.startsWith('mailto:')) {
      type = 'mailto';
    } else if (href.startsWith('tel:')) {
      type = 'tel';
    } else if (href.startsWith('#') && href.length > 1) {
      type = 'anchor';
    } else if (resolvedHref && resolvedHref.startsWith(window.location.origin)) {
      type = 'internal';
    } else if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
      type = 'internal';
    } else if (href.startsWith('/#/') || href.startsWith('#/')) {
      type = 'hash-route'; // SPA hash routing
    } else {
      type = 'external';
    }

    const isVisible = el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0;

    links.push({
      type,
      href: href.slice(0, 500),
      resolvedHref: resolvedHref.slice(0, 500),
      text,
      isVisible,
      hasNofollow: el.getAttribute('rel')?.includes('nofollow') || false,
      opensNewTab: el.getAttribute('target') === '_blank',
      ariaLabel: el.getAttribute('aria-label') || null
    });
  });

  // Check for anchor targets that don't exist
  const anchorLinks = links.filter(l => l.type === 'anchor');
  const brokenAnchors = anchorLinks.filter(l => {
    const targetId = l.href.replace('#', '');
    return !document.getElementById(targetId) && !document.querySelector(`[name="${targetId}"]`);
  });

  return {
    url: window.location.href,
    links,
    summary: {
      total: links.length,
      internal: links.filter(l => l.type === 'internal').length,
      external: links.filter(l => l.type === 'external').length,
      anchor: links.filter(l => l.type === 'anchor').length,
      hashRoute: links.filter(l => l.type === 'hash-route').length,
      emptyOrHash: links.filter(l => l.type === 'empty-or-hash').length,
      javascript: links.filter(l => l.type === 'javascript').length,
      mailto: links.filter(l => l.type === 'mailto').length,
      tel: links.filter(l => l.type === 'tel').length,
      brokenAnchors: brokenAnchors.length,
      hidden: links.filter(l => !l.isVisible).length
    },
    brokenAnchors: brokenAnchors.map(l => ({ href: l.href, text: l.text })),
    issues: [
      ...links.filter(l => l.type === 'empty-or-hash').map(l => ({
        severity: 'major',
        issue: `Empty or bare # href`,
        element: l.text,
        href: l.href
      })),
      ...links.filter(l => l.type === 'javascript').map(l => ({
        severity: 'major',
        issue: `javascript: href (use button for actions)`,
        element: l.text,
        href: l.href.slice(0, 80)
      })),
      ...brokenAnchors.map(l => ({
        severity: 'minor',
        issue: `Anchor target not found`,
        element: l.text,
        href: l.href
      }))
    ]
  };
};
