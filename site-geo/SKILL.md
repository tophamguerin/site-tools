---
name: site-geo
description: >
  GEO audit of any website using Chrome MCP. Crawls the site, checks meta tags,
  Open Graph, schema markup, heading structure, content quality, and AI crawler
  access on every page. Produces per-page + site-wide GEO scores. Use when:
  "GEO audit this site", "check SEO", "site geo", "AI search readiness",
  "is this site optimized for AI search". For deep single-page analysis, use
  /geo audit instead. Do NOT use for: QA/bug testing (use site-qa),
  performance (use site-performance), or screenshots (use site-archive).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, WebFetch
argument-hint: "<url> [output-dir]"
disable-model-invocation: true
compatibility: "Requires Chrome MCP server (chrome-devtools). See ~/.claude/skills/_site-shared/references/setup-guide.md"
---

# Site GEO -- Website AI Search Visibility Audit

> **Philosophy:** Every page is a potential AI citation source. Check them all.

## Quick Start

```
/site-geo https://example.com
/site-geo https://example.com geo-reports/example
```

Output defaults to `./site-geo-reports/{domain}/` if no output dir specified.

---

## Workflow

1. **Prerequisite check** -- verify Chrome MCP available
2. **Discover pages** -- shared discovery protocol
3. **Quick GEO pass on each page** -- 6 check categories
4. **Site-wide checks** -- robots.txt, llms.txt, sitemap
5. **Report** -- per-page scores + site-wide GEO score

For discovery protocol, see `~/.claude/skills/_site-shared/references/discovery-protocol.md`.
For Chrome MCP patterns, see `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.

---

## Per-Page Quick GEO Pass

For each discovered page, run these 6 checks. This is a quick pass, not a deep audit.
For deep analysis on specific pages, reference `/geo audit <url>`.

### 1. Meta Tags + Open Graph

Via `evaluate_script`:

```js
() => {
  const get = (sel) => document.querySelector(sel)?.getAttribute('content') || null;
  return {
    title: document.title,
    titleLength: document.title.length,
    metaDescription: get('meta[name="description"]'),
    descriptionLength: get('meta[name="description"]')?.length || 0,
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    ogTitle: get('meta[property="og:title"]'),
    ogDescription: get('meta[property="og:description"]'),
    ogImage: get('meta[property="og:image"]'),
    ogType: get('meta[property="og:type"]'),
    twitterCard: get('meta[name="twitter:card"]'),
    robots: get('meta[name="robots"]'),
    language: document.documentElement.lang || null
  };
}
```

**Score:** Each present = +1. Target: 8+ out of 12 fields.

### 2. Schema Markup (Structured Data)

Via `evaluate_script`:

```js
() => {
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  const schemas = scripts.map(s => {
    try { return JSON.parse(s.textContent); } catch { return null; }
  }).filter(Boolean);
  return {
    count: schemas.length,
    types: schemas.map(s => s['@type'] || (Array.isArray(s['@graph']) ? 'Graph' : 'Unknown')),
    raw: schemas
  };
}
```

**Score:** Has schema = 4pts. Organization/WebSite schema = +2. Article/Product = +2.

### 3. Heading Structure + Content Depth

Via `evaluate_script`:

```js
() => {
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter(h => h.offsetParent !== null)
    .map(h => ({ level: parseInt(h.tagName[1]), text: h.textContent.trim().slice(0, 80) }));
  const bodyText = document.body.innerText;
  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;
  return {
    headings,
    h1Count: headings.filter(h => h.level === 1).length,
    headingCount: headings.length,
    wordCount,
    hasStructuredContent: headings.length >= 3 && wordCount >= 300
  };
}
```

**Score:** h1 present = 2pts. 3+ headings = 2pts. 300+ words = 2pts. 1000+ words = +2.

### 4. Internal Linking

Use the shared link-check script (`~/.claude/skills/_site-shared/scripts/link-check.js`).
Count internal links. Pages with more internal links are better for AI crawlability.

**Score:** 5+ internal links = 2pts. 10+ = 4pts.

### 5. Image Optimization for AI

Via `evaluate_script`:

```js
() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => i.offsetParent !== null);
  return {
    totalImages: imgs.length,
    withAlt: imgs.filter(i => i.getAttribute('alt')?.length > 0).length,
    withDescriptiveAlt: imgs.filter(i => (i.getAttribute('alt') || '').length > 20).length
  };
}
```

**Score:** All images have alt = 2pts. Descriptive alts (>20 chars) on 50%+ = +2.

### 6. AI Citability Signals

Quick check for content patterns that AI systems prefer to cite:

- **Lists and tables** present (structured answers)
- **FAQ patterns** (question headings with answer paragraphs)
- **Definitions** ("X is..." patterns)
- **Statistics** (numbers with context)
- **Author/date** attribution visible

**Score:** 2pts per signal found, max 8.

---

## Site-Wide Checks

After all pages are audited, check these site-level items:

### robots.txt
Use `WebFetch` on `{domain}/robots.txt`. Check:
- Does it exist?
- Are AI crawlers blocked? (GPTBot, ClaudeBot, Google-Extended, PerplexityBot)
- Is the sitemap referenced?

### llms.txt
Use `WebFetch` on `{domain}/llms.txt`. Check:
- Does it exist? (Emerging standard for AI discoverability)
- If yes, is it well-formed?

### Sitemap
Use `WebFetch` on the sitemap URL from robots.txt (or `{domain}/sitemap.xml`). Check:
- Does it exist?
- Does it list all discovered pages?
- Are lastmod dates recent?

---

## Scoring

### Per-Page Score (out of 30)
| Category | Max Points |
|----------|-----------|
| Meta tags + OG | 12 |
| Schema markup | 8 |
| Heading + content | 8 |
| Internal links | 4 |
| Image optimization | 4 |
| Citability signals | 8 |

Normalize to 0-100 scale: `(raw / 44) * 100`

### Site-Wide Score
Average of all page scores, adjusted by:
- robots.txt allows AI crawlers: +5
- llms.txt present: +5
- Sitemap present and current: +5
- All pages have schema: +5

---

## Report Format

Write to `{output-dir}/GEO-REPORT.md`:

```markdown
# GEO Report: [Site Name]

> **URL:** [base URL]
> **Date:** [YYYY-MM-DD]
> **Pages audited:** [N]
> **Site GEO Score:** [X/100]

## Site-Wide

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt | OK/Missing/Blocks AI | [detail] |
| llms.txt | Present/Missing | [detail] |
| Sitemap | Present/Missing/Stale | [detail] |

## Page Scores

| Page | Score | Meta | Schema | Content | Links | Images | Citability |
|------|-------|------|--------|---------|-------|--------|-----------|
| [url] | X/100 | X/12 | X/8 | X/8 | X/4 | X/4 | X/8 |

## Detailed Findings
[Per-page breakdown with specific issues]

## Recommendations
1. [Prioritised by impact on AI visibility]

## Deep Dive
For full analysis on any page: `/geo audit <url>`
For citability scoring: `/geo citability <url>`
For schema generation: `/geo schema <url>`
```

---

## Known Limitation: Chrome MCP vs WebFetch Content Gap

This skill crawls via Chrome MCP (sees JS-rendered content). The existing `/geo` sub-skills
use WebFetch (HTTP fetch, no JS rendering). For SPAs or heavily JS-rendered sites, the per-page
checks here will see the full rendered content, but `/geo audit` deep-dives may see incomplete HTML.
This is an acceptable trade-off for v1.

---

## References

### GEO-specific
- [GEO quick checklist](references/geo-quick-checklist.md)

### Shared (site-tools suite)
- [Discovery protocol](~/.claude/skills/_site-shared/references/discovery-protocol.md)
- [Chrome MCP patterns](~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md)
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md)
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
- [Link check script](~/.claude/skills/_site-shared/scripts/link-check.js)
