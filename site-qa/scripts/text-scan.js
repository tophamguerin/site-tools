// Text Scanner — run via Chrome MCP evaluate_script
// Scans visible text on the page for common QA issues:
// placeholder text, encoding problems, empty elements, inconsistencies.
//
// Usage: Run the function body via evaluate_script. Returns issues found.

// eslint-disable-next-line no-unused-vars
const textScan = () => {
  const issues = [];
  const seen = new Set();

  const addIssue = (severity, issue, element, text) => {
    const key = `${issue}:${text?.slice(0, 50)}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ severity, issue, element, text: text?.slice(0, 200) });
  };

  // 1. Placeholder text patterns
  const placeholderPatterns = [
    { regex: /lorem ipsum/i, name: 'Lorem ipsum' },
    { regex: /\[placeholder\]/i, name: 'Placeholder marker' },
    { regex: /\[your .+?\]/i, name: 'Template marker' },
    { regex: /\bTODO\b/, name: 'TODO marker' },
    { regex: /\bTBD\b/, name: 'TBD marker' },
    { regex: /\bFIXME\b/, name: 'FIXME marker' },
    { regex: /example\.com/i, name: 'example.com reference' },
    { regex: /\btest@/i, name: 'Test email' },
    { regex: /\b(John|Jane) (Doe|Smith)\b/, name: 'Placeholder name' },
    { regex: /\$0\.00|\$X+|£0\.00/, name: 'Placeholder price' },
    { regex: /\b1234567890\b/, name: 'Placeholder phone' },
    { regex: /123 (Main|Fake|Test) St/i, name: 'Placeholder address' }
  ];

  // Check all visible text nodes
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || parent.offsetParent === null) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'code', 'pre'].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (node.textContent.trim().length < 2) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    const parent = walker.currentNode.parentElement;
    const tag = parent.tagName.toLowerCase();

    // Check placeholder patterns
    for (const pattern of placeholderPatterns) {
      if (pattern.regex.test(text)) {
        addIssue('major', `Placeholder text: ${pattern.name}`, `<${tag}>`, text);
      }
    }

    // Check encoding issues
    if (/&amp;|&lt;|&gt;|&#\d{2,4};|&[a-z]+;/i.test(text) && tag !== 'code') {
      addIssue('major', 'Unescaped HTML entity visible', `<${tag}>`, text);
    }

    // Check for mojibake (common UTF-8 misinterpretation patterns)
    if (/[\u00C2\u00C3][\u0080-\u00BF]/.test(text)) {
      addIssue('major', 'Possible encoding issue (mojibake)', `<${tag}>`, text);
    }
  }

  // 2. Empty interactive elements
  document.querySelectorAll('a, button, [role="button"], [role="tab"], [role="menuitem"]').forEach(el => {
    if (el.offsetParent === null) return; // hidden
    const text = el.textContent.trim();
    const ariaLabel = el.getAttribute('aria-label');
    const title = el.getAttribute('title');
    const img = el.querySelector('img, svg');

    if (!text && !ariaLabel && !title && !img) {
      addIssue('major', 'Empty interactive element (no text, label, or icon)', `<${el.tagName.toLowerCase()}>`, el.outerHTML.slice(0, 100));
    }
  });

  // 3. Empty headings
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
    if (el.offsetParent === null) return;
    if (!el.textContent.trim()) {
      addIssue('major', 'Empty heading', `<${el.tagName.toLowerCase()}>`, el.outerHTML.slice(0, 100));
    }
  });

  // 4. Heading hierarchy
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter(h => h.offsetParent !== null)
    .map(h => ({ level: parseInt(h.tagName[1]), text: h.textContent.trim().slice(0, 60) }));

  const h1Count = headings.filter(h => h.level === 1).length;
  if (h1Count === 0) {
    addIssue('minor', 'No h1 on page', 'document', null);
  } else if (h1Count > 1) {
    addIssue('minor', `Multiple h1 elements (${h1Count})`, 'document', headings.filter(h => h.level === 1).map(h => h.text).join(', '));
  }

  for (let i = 1; i < headings.length; i++) {
    const gap = headings[i].level - headings[i - 1].level;
    if (gap > 1) {
      addIssue('minor', `Heading hierarchy skip: h${headings[i - 1].level} → h${headings[i].level}`, `<h${headings[i].level}>`, headings[i].text);
    }
  }

  return {
    url: window.location.href,
    issues,
    summary: {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      major: issues.filter(i => i.severity === 'major').length,
      minor: issues.filter(i => i.severity === 'minor').length,
      note: issues.filter(i => i.severity === 'note').length
    },
    headingStructure: headings
  };
};
