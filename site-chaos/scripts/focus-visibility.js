// Focus Visibility Checker — run via Chrome MCP evaluate_script
// Tabs through focusable elements and checks whether each has a visible focus indicator
// using computed styles (outline, box-shadow).
//
// Usage: Copy the function body into evaluate_script's `function` parameter.

// eslint-disable-next-line no-unused-vars
const focusVisibility = () => {
  const focusable = [...document.querySelectorAll(
    'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"]), [role="button"], [role="tab"], [role="link"]'
  )].filter(el => {
    const style = getComputedStyle(el);
    return el.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled;
  }).slice(0, 30);

  const results = [];

  for (const el of focusable) {
    // Capture unfocused state
    const beforeOutline = getComputedStyle(el).outlineStyle;
    const beforeShadow = getComputedStyle(el).boxShadow;

    el.focus();

    const style = getComputedStyle(el);
    const outlineStyle = style.outlineStyle;
    const outlineWidth = parseFloat(style.outlineWidth) || 0;
    const boxShadow = style.boxShadow;
    const outlineColor = style.outlineColor;

    const hasOutline = outlineStyle !== 'none' && outlineWidth > 0 && outlineStyle !== beforeOutline;
    const hasShadow = boxShadow !== 'none' && boxShadow !== beforeShadow;
    const hasVisibleFocus = hasOutline || hasShadow;

    results.push({
      tag: el.tagName.toLowerCase(),
      type: el.type || el.getAttribute('role') || null,
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 50),
      className: (el.className || '').toString().slice(0, 80),
      visible: hasVisibleFocus,
      outline: hasOutline ? `${outlineStyle} ${outlineWidth}px ${outlineColor}` : null,
      shadow: hasShadow ? boxShadow.slice(0, 80) : null
    });
  }

  // Blur the last element
  document.activeElement?.blur();

  const invisible = results.filter(r => !r.visible);

  return {
    url: window.location.href,
    tested: results.length,
    visible: results.filter(r => r.visible).length,
    invisible: invisible.length,
    invisibleElements: invisible,
    summary: `${invisible.length}/${results.length} elements have NO visible focus indicator`
  };
};
