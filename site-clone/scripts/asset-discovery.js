// Asset Discovery Script — run via Chrome MCP evaluate_script
// Finds all images, videos, SVGs, background images, fonts, and favicons on the page.
//
// Usage: Copy the function body into evaluate_script's `function` parameter.
// Returns: { url, images, videos, svgs, backgroundImages, fonts, favicons, summary }

// eslint-disable-next-line no-unused-vars
const assetDiscovery = () => {
  const seen = new Set();

  // 1. Images
  const images = [...document.querySelectorAll('img, picture source, [role="img"]')].map(el => {
    const src = el.src || el.srcset?.split(',')[0]?.trim()?.split(' ')[0] || '';
    if (!src || seen.has(src)) return null;
    seen.add(src);
    const rect = el.getBoundingClientRect();
    return {
      src,
      alt: el.alt || '',
      width: el.naturalWidth || el.width || Math.round(rect.width),
      height: el.naturalHeight || el.height || Math.round(rect.height),
      loading: el.loading || 'eager',
      parentClasses: el.parentElement?.className ? String(el.parentElement.className).slice(0, 80) : '',
      position: { top: Math.round(rect.top), left: Math.round(rect.left) },
      isHero: rect.top < window.innerHeight && rect.width > window.innerWidth * 0.5
    };
  }).filter(Boolean);

  // 2. Videos
  const videos = [...document.querySelectorAll('video, [class*="video"]')].map(el => {
    if (el.tagName !== 'VIDEO') {
      const vid = el.querySelector('video');
      if (!vid) return null;
      el = vid;
    }
    const src = el.src || el.querySelector('source')?.src || '';
    if (!src || seen.has(src)) return null;
    seen.add(src);
    return {
      src,
      poster: el.poster || '',
      autoplay: el.autoplay,
      loop: el.loop,
      muted: el.muted,
      width: el.videoWidth || el.width,
      height: el.videoHeight || el.height
    };
  }).filter(Boolean);

  // 3. Inline SVGs (not referenced as img src)
  const svgs = [...document.querySelectorAll('svg')].map(el => {
    const parent = el.parentElement;
    const label = el.getAttribute('aria-label') || el.querySelector('title')?.textContent || '';
    const cls = parent?.className ? String(parent.className).slice(0, 60) : '';
    const rect = el.getBoundingClientRect();
    // Skip tiny decorative SVGs (likely icons from icon fonts)
    if (rect.width < 8 && rect.height < 8) return null;
    return {
      viewBox: el.getAttribute('viewBox') || '',
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      label,
      parentClasses: cls,
      isIcon: rect.width <= 32 && rect.height <= 32,
      pathCount: el.querySelectorAll('path').length
    };
  }).filter(Boolean);

  // 4. Background images from computed styles
  const backgroundImages = [];
  const bgSeen = new Set();
  document.querySelectorAll('*').forEach(el => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && !bgSeen.has(bg)) {
      bgSeen.add(bg);
      const urls = bg.match(/url\(["']?([^"')]+)["']?\)/g) || [];
      urls.forEach(u => {
        const url = u.replace(/url\(["']?|["']?\)/g, '');
        if (!url.startsWith('data:') || url.length < 200) {
          backgroundImages.push({
            url: url.startsWith('data:') ? '[data-uri]' : url,
            element: el.tagName.toLowerCase(),
            classes: el.className ? String(el.className).slice(0, 80) : ''
          });
        }
      });
    }
  });

  // 5. Fonts — from link tags + @font-face
  const fonts = [];
  const fontSeen = new Set();
  // Google Fonts links
  document.querySelectorAll('link[href*="fonts.googleapis"], link[href*="fonts.gstatic"]').forEach(el => {
    const href = el.href;
    if (!fontSeen.has(href)) {
      fontSeen.add(href);
      fonts.push({ type: 'google-fonts', href });
    }
  });
  // @font-face from stylesheets
  try {
    [...document.styleSheets].forEach(sheet => {
      try {
        [...sheet.cssRules].forEach(rule => {
          if (rule instanceof CSSFontFaceRule) {
            const family = rule.style.fontFamily?.replace(/["']/g, '') || '';
            const src = rule.style.src || '';
            const key = `${family}|${src.slice(0, 50)}`;
            if (!fontSeen.has(key)) {
              fontSeen.add(key);
              fonts.push({
                type: 'font-face',
                family,
                weight: rule.style.fontWeight || 'normal',
                style: rule.style.fontStyle || 'normal',
                src: src.slice(0, 200)
              });
            }
          }
        });
      } catch (e) { /* cross-origin */ }
    });
  } catch (e) { /* no sheets */ }

  // 6. Favicons and meta images
  const favicons = [...document.querySelectorAll(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], ' +
    'meta[property="og:image"], meta[name="twitter:image"], link[rel="manifest"]'
  )].map(el => ({
    type: el.rel || el.getAttribute('property') || el.name,
    href: el.href || el.content || '',
    sizes: el.sizes?.value || ''
  }));

  return {
    url: window.location.href,
    images,
    videos,
    svgs: svgs.slice(0, 50),
    backgroundImages: backgroundImages.slice(0, 30),
    fonts,
    favicons,
    summary: {
      images: images.length,
      heroImages: images.filter(i => i.isHero).length,
      videos: videos.length,
      svgs: svgs.length,
      iconSvgs: svgs.filter(s => s.isIcon).length,
      backgroundImages: backgroundImages.length,
      fonts: fonts.length,
      favicons: favicons.length
    }
  };
};
