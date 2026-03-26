// Image Audit — run via Chrome MCP evaluate_script
// Checks all images on the page for common issues:
// broken src, missing alt text, oversized images, lazy loading.
//
// Usage: Run the function body via evaluate_script. Returns image issues.

// eslint-disable-next-line no-unused-vars
const imageAudit = () => {
  const images = [];
  const issues = [];

  document.querySelectorAll('img').forEach(img => {
    const isVisible = img.offsetParent !== null || img.offsetWidth > 0 || img.offsetHeight > 0;
    if (!isVisible) return;

    const src = img.src || img.getAttribute('data-src') || '';
    const alt = img.getAttribute('alt');
    const isDecorative = alt === '';
    const isBroken = img.complete && img.naturalWidth === 0 && src;
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const info = {
      src: src.slice(0, 200),
      alt: alt?.slice(0, 100),
      hasAlt: alt !== null,
      isDecorative,
      isBroken,
      displaySize: `${displayWidth}x${displayHeight}`,
      naturalSize: `${naturalWidth}x${naturalHeight}`,
      loading: img.loading || 'eager',
      role: img.getAttribute('role')
    };

    images.push(info);

    // Issue detection
    if (isBroken) {
      issues.push({
        severity: 'major',
        issue: 'Broken image (failed to load)',
        src: src.slice(0, 200),
        alt: alt?.slice(0, 60)
      });
    }

    if (alt === null && !isDecorative) {
      issues.push({
        severity: 'minor',
        issue: 'Missing alt attribute',
        src: src.slice(0, 200)
      });
    }

    // Check for oversized images (natural size >> display size)
    if (naturalWidth > 0 && displayWidth > 0) {
      const ratio = (naturalWidth * naturalHeight) / (displayWidth * displayHeight);
      if (ratio > 4) {
        issues.push({
          severity: 'minor',
          issue: `Image oversized: displaying at ${displayWidth}x${displayHeight} but natural size is ${naturalWidth}x${naturalHeight} (${ratio.toFixed(1)}x pixels)`,
          src: src.slice(0, 200)
        });
      }
    }
  });

  // Check background images in visible elements (basic check)
  const bgImageCount = [...document.querySelectorAll('*')]
    .filter(el => {
      const bg = getComputedStyle(el).backgroundImage;
      return bg && bg !== 'none' && el.offsetParent !== null;
    }).length;

  return {
    url: window.location.href,
    images,
    issues,
    summary: {
      totalImages: images.length,
      broken: images.filter(i => i.isBroken).length,
      missingAlt: images.filter(i => !i.hasAlt && !i.isDecorative).length,
      decorative: images.filter(i => i.isDecorative).length,
      oversized: issues.filter(i => i.issue.startsWith('Image oversized')).length,
      backgroundImages: bgImageCount,
      lazyLoaded: images.filter(i => i.loading === 'lazy').length
    }
  };
};
