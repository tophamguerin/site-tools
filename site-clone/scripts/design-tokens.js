// Design Token Extraction Script — run via Chrome MCP evaluate_script
// Extracts colors, fonts, spacing, shadows, radii, and keyframe animations
// from the live page using getComputedStyle.
//
// Usage: Copy the function body into evaluate_script's `function` parameter.
// Returns: { url, fonts, colors, spacing, radii, shadows, keyframes, scrollBehavior, summary }

// eslint-disable-next-line no-unused-vars
const designTokens = () => {
  const result = {
    url: window.location.href,
    fonts: [],
    colors: { backgrounds: [], text: [], borders: [], accents: [] },
    spacing: [],
    radii: new Set(),
    shadows: new Set(),
    keyframes: [],
    scrollBehavior: null
  };

  const seen = { fonts: new Set(), colors: new Set(), spacing: new Set() };

  // 1. Fonts — extract unique font stacks + weights + sizes
  const fontMap = new Map();
  document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button,span,li,td,th,label,input,textarea,[class*="title"],[class*="heading"],[class*="body"],[class*="caption"]').forEach(el => {
    const s = getComputedStyle(el);
    const family = s.fontFamily;
    const weight = s.fontWeight;
    const size = s.fontSize;
    const lineHeight = s.lineHeight;
    const letterSpacing = s.letterSpacing;
    const key = `${family}|${weight}|${size}`;
    if (!seen.fonts.has(key)) {
      seen.fonts.add(key);
      const tag = el.tagName.toLowerCase();
      const cls = el.className ? String(el.className).slice(0, 60) : '';
      if (!fontMap.has(family)) {
        fontMap.set(family, { family, weights: new Set(), sizes: [], usedBy: [] });
      }
      const entry = fontMap.get(family);
      entry.weights.add(weight);
      entry.sizes.push({ size, lineHeight, letterSpacing, tag, class: cls });
      if (entry.usedBy.length < 5) entry.usedBy.push(tag + (cls ? '.' + cls.split(' ')[0] : ''));
    }
  });
  fontMap.forEach((v, k) => {
    result.fonts.push({
      family: k,
      weights: [...v.weights],
      sizes: v.sizes.slice(0, 10),
      usedBy: v.usedBy
    });
  });

  // 2. Colors — sample key elements for bg, text, border, accent
  const colorSample = (els, prop) => {
    const unique = new Set();
    els.forEach(el => {
      const val = getComputedStyle(el)[prop];
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'inherit') {
        unique.add(val);
      }
    });
    return [...unique].slice(0, 30);
  };

  const allEls = [...document.querySelectorAll('body,main,section,header,footer,nav,aside,div,article,[class*="card"],[class*="hero"],[class*="banner"],[class*="container"]')];
  const textEls = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,span,li,label,button')];
  const borderEls = [...document.querySelectorAll('[class*="card"],hr,[class*="border"],[class*="divider"],input,button,table,th,td')];
  const accentEls = [...document.querySelectorAll('a,button,[class*="btn"],[class*="primary"],[class*="accent"],[class*="highlight"],[class*="cta"],[role="button"]')];

  result.colors.backgrounds = colorSample(allEls, 'backgroundColor');
  result.colors.text = colorSample(textEls, 'color');
  result.colors.borders = colorSample(borderEls, 'borderColor');
  result.colors.accents = [...new Set([
    ...colorSample(accentEls, 'backgroundColor'),
    ...colorSample(accentEls, 'color')
  ])].slice(0, 20);

  // 3. Spacing — extract unique paddings and margins from layout elements
  allEls.slice(0, 50).forEach(el => {
    const s = getComputedStyle(el);
    ['padding', 'margin', 'gap'].forEach(prop => {
      const val = s[prop] || s.getPropertyValue(prop);
      if (val && val !== '0px' && !seen.spacing.has(val)) {
        seen.spacing.add(val);
        result.spacing.push(val);
      }
    });
  });
  result.spacing = [...new Set(result.spacing)].sort((a, b) => parseFloat(a) - parseFloat(b)).slice(0, 20);

  // 4. Border radii
  [...allEls, ...document.querySelectorAll('button,img,[class*="avatar"],[class*="badge"]')].slice(0, 80).forEach(el => {
    const r = getComputedStyle(el).borderRadius;
    if (r && r !== '0px') result.radii.add(r);
  });
  result.radii = [...result.radii].slice(0, 15);

  // 5. Box shadows
  [...allEls, ...document.querySelectorAll('button,[class*="card"],[class*="dropdown"],[class*="modal"],[class*="popover"]')].slice(0, 80).forEach(el => {
    const s = getComputedStyle(el).boxShadow;
    if (s && s !== 'none') result.shadows.add(s);
  });
  result.shadows = [...result.shadows].slice(0, 10);

  // 6. Keyframe animations
  try {
    [...document.styleSheets].forEach(sheet => {
      try {
        [...sheet.cssRules].forEach(rule => {
          if (rule instanceof CSSKeyframesRule) {
            result.keyframes.push({
              name: rule.name,
              steps: [...rule.cssRules].length
            });
          }
        });
      } catch (e) { /* cross-origin sheet */ }
    });
  } catch (e) { /* no stylesheets */ }

  // 7. Scroll behavior
  const htmlScroll = getComputedStyle(document.documentElement).scrollBehavior;
  const bodyScroll = getComputedStyle(document.body).scrollBehavior;
  const hasLenis = !!document.querySelector('[data-lenis-prevent], .lenis, .has-scroll-smooth');
  const hasLocomotive = !!document.querySelector('[data-scroll-container], .locomotive-scroll');
  result.scrollBehavior = {
    css: htmlScroll !== 'auto' ? htmlScroll : bodyScroll !== 'auto' ? bodyScroll : 'auto',
    lenis: hasLenis,
    locomotive: hasLocomotive,
    scrollSnap: getComputedStyle(document.documentElement).scrollSnapType !== 'none'
  };

  return {
    ...result,
    summary: {
      fontFamilies: result.fonts.length,
      colorCount: result.colors.backgrounds.length + result.colors.text.length + result.colors.borders.length + result.colors.accents.length,
      spacingValues: result.spacing.length,
      radii: result.radii.length,
      shadows: result.shadows.length,
      keyframes: result.keyframes.length,
      smoothScroll: result.scrollBehavior.lenis || result.scrollBehavior.locomotive || result.scrollBehavior.css === 'smooth'
    }
  };
};
