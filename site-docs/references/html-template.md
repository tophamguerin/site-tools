# HTML Export Template

When the user passes `--html` (or asks for HTML output), assemble all guides into
a single self-contained HTML page using this template. Replace placeholder tokens
with generated content.

If `--embed-images` is also specified, convert all `<img src="images/...">` to
`<img src="data:image/png;base64,...">` for a fully self-contained file.

**Output filename:** `HELP-DOCS.html` (alongside `HELP-DOCS.md`)

**Size warning:** With `--embed-images`, each screenshot adds ~300-700KB of base64.
For sites with many flows (10+), the HTML file may exceed 10MB. Consider using
standard image references (`--html` without `--embed-images`) for large sites.

---

## Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Help Documentation: {{SITE_TITLE}}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      background: #fafafa;
    }

    .page {
      display: flex;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* --- Table of Contents (sidebar) --- */
    .toc {
      width: 260px;
      flex-shrink: 0;
      padding: 2rem 1.5rem;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      border-right: 1px solid #e0e0e0;
      background: #fff;
    }

    .toc h2 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
      margin-bottom: 1rem;
    }

    .toc a {
      display: block;
      padding: 0.35rem 0;
      color: #333;
      text-decoration: none;
      font-size: 0.9rem;
    }

    .toc a:hover { color: #FF6B35; }

    /* --- Main content --- */
    .content {
      flex: 1;
      max-width: 800px;
      padding: 2rem 3rem;
    }

    .content h1 {
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
      color: #1a1a2e;
    }

    .meta {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e0e0e0;
    }

    /* --- Guide sections --- */
    .guide {
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e8e8e8;
    }

    .guide h2 {
      font-size: 1.4rem;
      margin-bottom: 0.5rem;
      color: #1a1a2e;
    }

    .guide h3 {
      font-size: 1.1rem;
      margin: 1.5rem 0 0.5rem;
      color: #333;
    }

    .overview {
      color: #555;
      margin-bottom: 1rem;
      font-style: italic;
    }

    .prerequisites {
      background: #f0f4ff;
      border-left: 3px solid #2196F3;
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      border-radius: 0 4px 4px 0;
      font-size: 0.9rem;
    }

    /* --- Step blocks --- */
    .step {
      display: flex;
      gap: 1rem;
      margin: 1.5rem 0;
      align-items: flex-start;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #FF6B35;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9rem;
      flex-shrink: 0;
      margin-top: 0.15rem;
    }

    .step-body { flex: 1; }

    .step-body p {
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .step-body img {
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin-top: 0.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .result {
      background: #f0fff4;
      border-left: 3px solid #4caf50;
      padding: 0.75rem 1rem;
      margin-top: 1.5rem;
      border-radius: 0 4px 4px 0;
    }

    .result img {
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin-top: 0.5rem;
    }

    /* --- Responsive --- */
    @media (max-width: 1024px) {
      .page { flex-direction: column; }

      .toc {
        width: 100%;
        height: auto;
        position: static;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
        padding: 1rem 1.5rem;
      }

      .toc a { display: inline-block; margin-right: 1rem; }

      .content { padding: 1.5rem; }
    }

    @media (max-width: 600px) {
      .step { flex-direction: column; }
      .step-number { margin-bottom: 0.25rem; }
      .content { padding: 1rem; }
    }

    /* --- Print --- */
    @media print {
      .toc { display: none; }
      .page { display: block; }
      .content { max-width: 100%; padding: 0; }
      .guide { break-inside: avoid; }
      .step { break-inside: avoid; }
      .step-body img { max-width: 80%; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <nav class="toc">
      <h2>Guides</h2>
      {{TOC_ENTRIES}}
      <!-- Each entry: <a href="#guide-NN">How to [verb] [noun]</a> -->
    </nav>
    <main class="content">
      <h1>Help Documentation: {{SITE_TITLE}}</h1>
      <div class="meta">
        URL: {{URL}} &mdash; Generated: {{DATE}}
      </div>
      {{GUIDE_SECTIONS}}
      <!--
        Each guide section follows this structure:

        <section class="guide" id="guide-01">
          <h2>How to [verb] [noun]</h2>
          <p class="overview">[Overview text]</p>
          <div class="prerequisites">
            <strong>Before you start:</strong> [prerequisites]
          </div>

          <div class="step">
            <div class="step-number">1</div>
            <div class="step-body">
              <p>[Step instruction with <strong>bold UI text</strong>]</p>
              <img src="images/01-flow-step-01.png" alt="Step 1: [description]">
            </div>
          </div>

          <div class="step">
            <div class="step-number">2</div>
            <div class="step-body">
              <p>[Step instruction]</p>
              <img src="images/01-flow-step-02.png" alt="Step 2: [description]">
            </div>
          </div>

          <div class="result">
            <strong>Result:</strong> [What you should see when done]
            <img src="images/01-flow-result.png" alt="Result: [description]">
          </div>
        </section>
      -->
    </main>
  </div>
</body>
</html>
```

---

## Assembly Instructions

When building the HTML output:

1. **Read this template** from `~/.claude/skills/site-docs/references/html-template.md`
2. **Extract the HTML** from the code block above
3. **Replace tokens:**
   - `{{SITE_TITLE}}` — the site's `<title>` or domain name
   - `{{DATE}}` — current date in YYYY-MM-DD format
   - `{{URL}}` — the base URL that was documented
   - `{{TOC_ENTRIES}}` — one `<a href="#guide-NN">` per guide
   - `{{GUIDE_SECTIONS}}` — the guide HTML sections
4. **For each guide**, convert the markdown content into the HTML structure shown in the comment
5. **If `--embed-images`:** read each PNG file, base64-encode it, replace `src="images/..."` with `src="data:image/png;base64,..."`
6. **Write** to `{output-dir}/HELP-DOCS.html`
