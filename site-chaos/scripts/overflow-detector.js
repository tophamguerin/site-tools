// Overflow Detector — run via Chrome MCP evaluate_script
// Walks the DOM to find elements causing horizontal overflow.
// Returns the specific offenders with class names and dimensions.
//
// Usage: Copy the function body into evaluate_script's `function` parameter.

// eslint-disable-next-line no-unused-vars
const overflowDetector = () => {
  const viewportWidth = document.documentElement.clientWidth;
  const offenders = [];
  const seen = new Set();

  const walk = (el) => {
    if (!el || el.nodeType !== 1) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > viewportWidth + 2 || rect.left < -2) {
      const key = `${el.tagName}.${el.className}`;
      if (!seen.has(key)) {
        seen.add(key);
        offenders.push({
          tag: el.tagName.toLowerCase(),
          className: (el.className || '').toString().slice(0, 120),
          id: el.id || null,
          width: Math.round(rect.width),
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          text: el.textContent.trim().slice(0, 60) || null
        });
      }
    }
    for (const child of el.children) walk(child);
  };

  walk(document.body);

  const hasOverflow = document.documentElement.scrollWidth > viewportWidth + 2;

  return {
    url: window.location.href,
    viewportWidth,
    scrollWidth: document.documentElement.scrollWidth,
    hasOverflow,
    offenders: offenders.slice(0, 10),
    summary: `${hasOverflow ? 'OVERFLOW' : 'OK'}: ${offenders.length} offending elements (viewport ${viewportWidth}px, scroll ${document.documentElement.scrollWidth}px)`
  };
};
