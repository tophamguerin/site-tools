// Section Map Script — run via Chrome MCP evaluate_script
// Maps the visual section hierarchy of a page with bounding boxes,
// z-index layers, and content summaries for component extraction.
//
// Usage: Copy the function body into evaluate_script's `function` parameter.
// Returns: { url, sections, layers, summary }

// eslint-disable-next-line no-unused-vars
const sectionMap = () => {
  const sections = [];
  const layers = [];
  const seen = new Set();

  // 1. Identify top-level sections by semantic elements + common class patterns
  const sectionEls = document.querySelectorAll(
    'header, nav, main, footer, section, [class*="hero"], [class*="banner"], ' +
    '[class*="cta"], [class*="features"], [class*="pricing"], [class*="testimonial"], ' +
    '[class*="faq"], [class*="contact"], [role="banner"], [role="main"], [role="contentinfo"], ' +
    '[role="navigation"], [class*="section"], [class*="block"]'
  );

  // Filter to direct children of body or main structural containers
  const isTopLevel = (el) => {
    const parent = el.parentElement;
    if (!parent) return false;
    const pTag = parent.tagName.toLowerCase();
    if (pTag === 'body' || pTag === 'main' || parent.getAttribute('role') === 'main') return true;
    // Also include if parent is just a wrapper div
    if (pTag === 'div' && parent.parentElement?.tagName.toLowerCase() === 'body') return true;
    return false;
  };

  sectionEls.forEach((el, idx) => {
    const rect = el.getBoundingClientRect();
    // Skip invisible or tiny elements
    if (rect.width < 100 || rect.height < 20) return;

    const tag = el.tagName.toLowerCase();
    const cls = el.className ? String(el.className).slice(0, 120) : '';
    const id = el.id || '';
    const key = `${tag}:${id || cls}:${Math.round(rect.top)}`;
    if (seen.has(key)) return;
    seen.add(key);

    const s = getComputedStyle(el);

    // Count child elements for complexity estimate
    const childCount = el.children.length;
    const textLength = el.textContent.trim().length;
    const hasImages = el.querySelectorAll('img, video, svg').length;
    const hasInteractive = el.querySelectorAll('button, a, input, select, [role="button"], [role="tab"]').length;

    // Detect sticky/fixed positioning
    const position = s.position;
    const isSticky = position === 'sticky' || position === 'fixed';

    sections.push({
      index: sections.length,
      tag,
      id,
      classes: cls,
      role: el.getAttribute('role') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      topLevel: isTopLevel(el),
      bounds: {
        top: Math.round(rect.top + window.scrollY),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      style: {
        position,
        zIndex: s.zIndex !== 'auto' ? s.zIndex : null,
        overflow: s.overflow !== 'visible' ? s.overflow : null,
        display: s.display,
        backgroundColor: s.backgroundColor !== 'rgba(0, 0, 0, 0)' ? s.backgroundColor : null,
        isSticky
      },
      complexity: {
        children: childCount,
        textChars: textLength,
        images: hasImages,
        interactive: hasInteractive,
        estimate: childCount > 20 || textLength > 2000 ? 'complex' : childCount > 8 ? 'moderate' : 'simple'
      },
      // First 200 chars of text content for identification
      preview: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 200)
    });
  });

  // 2. Detect z-index layers (fixed/sticky overlays, modals, etc.)
  document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    const z = parseInt(s.zIndex, 10);
    if (!isNaN(z) && z > 1 && (s.position === 'fixed' || s.position === 'sticky' || s.position === 'absolute')) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 20) {
        layers.push({
          tag: el.tagName.toLowerCase(),
          classes: el.className ? String(el.className).slice(0, 80) : '',
          zIndex: z,
          position: s.position,
          bounds: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        });
      }
    }
  });

  // Sort sections by visual order (top to bottom)
  sections.sort((a, b) => a.bounds.top - b.bounds.top);
  // Re-index after sort
  sections.forEach((s, i) => { s.index = i; });

  // Sort layers by z-index
  layers.sort((a, b) => b.zIndex - a.zIndex);

  return {
    url: window.location.href,
    pageHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    sections: sections.slice(0, 40),
    layers: layers.slice(0, 15),
    summary: {
      totalSections: sections.length,
      topLevelSections: sections.filter(s => s.topLevel).length,
      complexSections: sections.filter(s => s.complexity.estimate === 'complex').length,
      moderateSections: sections.filter(s => s.complexity.estimate === 'moderate').length,
      simpleSections: sections.filter(s => s.complexity.estimate === 'simple').length,
      stickyLayers: layers.filter(l => l.position === 'sticky' || l.position === 'fixed').length,
      totalLayers: layers.length
    }
  };
};
