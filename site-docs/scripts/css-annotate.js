// CSS Annotate — run via Chrome MCP evaluate_script
// Injects visual annotation overlays (numbered badges, borders, highlights) onto
// page elements for screenshot capture. Pair with cssAnnotateRemove() to clean up.
//
// Usage:
//   1. Run cssAnnotateApply({ selector, stepNumber, style, color, label }) to annotate
//   2. Take a screenshot via take_screenshot
//   3. Run cssAnnotateRemove() to clean up before the next step
//   4. cssAnnotateRemove() is safe to call even if annotations don't exist (tolerant of navigation)
//
// Returns: cssAnnotateApply → { applied, boundingRect, scrolled } or { error }
//          cssAnnotateRemove → { removed }

// --- APPLY (inject annotation overlays before screenshot) ---
// eslint-disable-next-line no-unused-vars
const cssAnnotateApply = (config) => {
  // config: { selector, stepNumber, style: 'border'|'highlight'|'badge-only', color, label }
  const { selector, stepNumber = 1, style = 'highlight', color = '#FF6B35', label = '' } = config || {};

  if (!selector) return { error: 'No selector provided' };

  // Defensive cleanup first (idempotent)
  document.querySelectorAll('[data-site-docs-annotation]').forEach(el => el.remove());

  // Find target element
  let target;
  try {
    target = document.querySelector(selector);
  } catch {
    return { error: `Invalid selector: ${selector}` };
  }
  if (!target) return { error: `Element not found: ${selector}` };

  // Scroll into view if off-screen
  let scrolled = false;
  let rect = target.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    scrolled = true;
    rect = target.getBoundingClientRect();
  }

  // Still zero-size after scroll — element is truly hidden
  if (rect.width === 0 && rect.height === 0) {
    return { error: 'Element has zero dimensions (hidden or collapsed)', selector };
  }

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const padding = 4;

  // Create overlay elements based on style
  if (style === 'border' || style === 'highlight') {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-site-docs-annotation', 'overlay');
    Object.assign(overlay.style, {
      position: 'absolute',
      left: `${rect.left + scrollX - padding}px`,
      top: `${rect.top + scrollY - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`,
      border: style === 'border' ? `3px solid ${color}` : 'none',
      backgroundColor: style === 'highlight' ? `${color}22` : 'transparent',
      borderRadius: '4px',
      zIndex: '99999',
      pointerEvents: 'none',
      boxSizing: 'border-box'
    });
    if (style === 'highlight') {
      overlay.style.border = `2px solid ${color}`;
    }
    document.body.appendChild(overlay);
  }

  // Numbered badge (always created)
  const badge = document.createElement('div');
  badge.setAttribute('data-site-docs-annotation', 'badge');
  badge.textContent = String(stepNumber);
  Object.assign(badge.style, {
    position: 'absolute',
    left: `${rect.right + scrollX - 4}px`,
    top: `${rect.top + scrollY - 12}px`,
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: color,
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 'bold',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '100000',
    pointerEvents: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    lineHeight: '1'
  });
  document.body.appendChild(badge);

  // Optional label
  if (label) {
    const labelEl = document.createElement('div');
    labelEl.setAttribute('data-site-docs-annotation', 'label');
    labelEl.textContent = label;
    Object.assign(labelEl.style, {
      position: 'absolute',
      left: `${rect.left + scrollX}px`,
      top: `${rect.bottom + scrollY + 6}px`,
      padding: '2px 8px',
      borderRadius: '3px',
      backgroundColor: color,
      color: '#FFFFFF',
      fontSize: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '500',
      zIndex: '100000',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(labelEl);
  }

  return {
    url: window.location.href,
    applied: true,
    boundingRect: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    scrolled
  };
};

// --- REMOVE (clean up all annotation overlays) ---
// eslint-disable-next-line no-unused-vars
const cssAnnotateRemove = () => {
  const annotations = document.querySelectorAll('[data-site-docs-annotation]');
  const count = annotations.length;
  annotations.forEach(el => el.remove());
  return { url: window.location.href, removed: count };
};
