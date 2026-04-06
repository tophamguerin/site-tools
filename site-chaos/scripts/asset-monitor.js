// Asset Monitor — run via Chrome MCP evaluate_script
// Checks for broken assets (images, scripts, stylesheets, fonts) by inspecting
// the performance entries and DOM elements for load failures.
//
// Usage: Copy the function body into evaluate_script's `function` parameter.

// eslint-disable-next-line no-unused-vars
const assetMonitor = () => {
  const broken = [];
  const seen = new Set();

  const add = (item) => {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      broken.push(item);
    }
  };

  // Broken images
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete || img.naturalWidth === 0) {
      add({
        type: 'image',
        url: img.src || img.currentSrc || '[no src]',
        alt: img.alt || null,
        context: img.closest('[class]')?.className.toString().slice(0, 60) || null
      });
    }
  });

  // Broken background images (visible elements only)
  document.querySelectorAll('[style*="background"]').forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url(')) {
      const urlMatch = bg.match(/url\(["']?([^"')]+)/);
      if (urlMatch) {
        const img = new Image();
        img.src = urlMatch[1];
        // Can't async check, but flag obviously broken data URIs or relative paths
        if (urlMatch[1].startsWith('data:') && urlMatch[1].length < 20) {
          add({ type: 'background-image', url: urlMatch[1].slice(0, 100), context: 'truncated data URI' });
        }
      }
    }
  });

  // Check performance entries for failed resources
  if (typeof performance !== 'undefined' && performance.getEntriesByType) {
    const resources = performance.getEntriesByType('resource');
    resources.forEach(entry => {
      // transferSize of 0 on non-cached resources can indicate failure
      // but this is unreliable — rely on DOM checks above for images
      if (entry.transferSize === 0 && entry.decodedBodySize === 0 && !entry.name.includes('data:')) {
        const ext = entry.name.split('.').pop()?.split('?')[0]?.toLowerCase();
        if (['js', 'css', 'woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
          add({
            type: ext === 'js' ? 'script' : ext === 'css' ? 'stylesheet' : 'font',
            url: entry.name.slice(0, 200),
            context: `transferSize=0, decodedBodySize=0`
          });
        }
      }
    });
  }

  return {
    url: window.location.href,
    brokenCount: broken.length,
    broken: broken.slice(0, 20),
    totalResources: typeof performance !== 'undefined' ? performance.getEntriesByType('resource').length : null,
    summary: broken.length === 0
      ? 'No broken assets detected'
      : `${broken.length} broken asset(s): ${broken.map(b => b.type).join(', ')}`
  };
};
