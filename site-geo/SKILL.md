---
name: site-geo
description: >
  [What] Crawl a website in Ben's Chrome (Claude in Chrome) and score every page for AI search visibility (meta, schema, content, crawlers, raw-HTML parity).
  [When] User says "GEO audit", "check SEO", "AI search readiness", "site geo", or "is this site optimized for AI search".
  [Triggers] /site-geo URL (one URL = single-page deep pass). Not for QA, perf or technical SEO (review-seo).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, ToolSearch, AskUserQuestion, WebFetch, mcp__claude-in-chrome
argument-hint: "<url> [output-dir]"
effort: high
---

# Site GEO -- Website AI Search Visibility Audit

> **Philosophy:** Every page is a potential AI citation source. Check them all.

## Prerequisites

The rendered-page checks need the **Claude in Chrome** extension. See `~/.claude/skills/_site-shared/references/setup-guide.md`. Browser work stays in the main context; never delegate it to a sub-agent.

**No browser needed** for anything readable from static HTML: robots.txt, llms.txt, sitemaps, and the raw-HTML parity check. Use `WebFetch` or `curl` for those. Most AI crawlers don't run JavaScript, so the raw HTML is what they see.

## Arguments

`$ARGUMENTS` = `<url> [output-dir]`
- First argument: the URL to audit (required)
- Second argument: output directory (optional, defaults to `./site-geo-reports/{domain}/`)

## Quick Start

```
/site-geo https://example.com
/site-geo https://example.com geo-reports/example
```

---

## Workflow

1. **Connect** -- shared discovery protocol, Phase 1 (one ToolSearch call, own tab)
2. **Discover pages** -- shared discovery protocol, Phase 2 (or the sitemap via `curl`)
3. **Quick GEO pass on each page** -- 6 rendered checks + 1 raw-HTML parity check
4. **Site-wide checks** -- robots.txt, llms.txt, sitemap
5. **Report** -- per-page scores + site-wide GEO score

For discovery protocol (and how to run the snippets and scripts with `javascript_tool`), see `~/.claude/skills/_site-shared/references/discovery-protocol.md`.
For safety rules, see `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.

---

## Per-Page Quick GEO Pass

For each discovered page, run these checks. Each snippet below is an arrow function: send it to `javascript_tool` wrapped as `(<snippet>)()`.

**Single-page deep pass:** when Ben gives one URL (or asks to go deep on a page), skip discovery, run every check below plus check 7 on that page, read the full page text (`get_page_text`) for citability, and write per-finding rewrite suggestions. For content restructuring, hand off to `/triple-audience`; for technical SEO (Lighthouse SEO, canonicals, indexing), `/review-seo`.

### 1. Meta Tags + Open Graph

Via `javascript_tool`:

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

### 2. Structured Data — Entity Spine

> **Why this is the heaviest single dimension:** AI-search engines (ChatGPT,
> Perplexity, Google AI Overviews, Gemini, Bing Copilot) consolidate **entities**,
> not pages. A site wins citations when its Organization and people resolve to
> **one** canonical entity that the engine can merge into its knowledge graph and
> assert facts about. "Has some JSON-LD" is necessary but nowhere near sufficient.
> Reference implementation: a canonical `@id` spine in `src/lib/schema.ts`
> (tg.agency / bjhguerin.com) — single source of truth, referenced by `@id`
> everywhere, emitted once per page.

Run the detector once per page via `javascript_tool` — paste the body of
`~/.claude/skills/site-geo/scripts/schema-entity-spine.js` (the `schemaEntitySpine`
function). It returns raw signals for everything below; you apply the rubric.

It audits seven things a naïve "count the scripts" check misses:

| Signal | What good looks like | Field in detector output |
|--------|----------------------|--------------------------|
| **Canonical `@id` spine** | Every primary entity (Org `#organization`, Person `/#slug`) carries a stable `@id` | `ids.primaryMissingId` empty |
| **Refs resolve** | `{ '@id': … }` references point at a full node on the page (or a legit cross-origin owned domain) | `refs.danglingSameOrigin` empty |
| **No `@id`-less duplicates** | Org/Person never emitted as a fresh, `@id`-less node per page (nothing can consolidate it) | `duplicates.idlessPersonOrg` empty |
| **`sameAs` = KG precondition** | Org → Wikipedia **+** Wikidata + socials; every *own* Person → ≥1 authoritative profile (LinkedIn min) | `org.detail[].hasWikipedia/hasWikidata`, `people.ownWithoutAuthoritative` empty |
| **Offices** | `Place` + `PostalAddress` + Google Maps `hasMap` (local SEO) | `org.detail[].placesWithMap` |
| **Coverage entity-linking** | Article/NewsArticle link the named entities by `@id` via `about` / `author` / `mentions`; `Quotation.spokenByCharacter` → speaker `@id` | `coverage.withoutEntityLink` empty |
| **`CollectionPage`** on list/index pages | list pages declare `mainEntity`/`about` → Org and `hasPart` → items | `collection.detail[]` |

It also returns an **`escaping`** verdict — see check **2b** below.

**Own vs third-party — read these two fields right (the detector already separates them, don't double-count):**
- `duplicates.idlessPersonOrg` = the site's **own** Org/people re-emitted with no `@id` (a person with `worksFor`, or an org that looks like the site's). This is the consolidation-killer — **penalise it**.
- `externalEntities` = third-party Org/people inline in a coverage graph (the outlet that published an article, the public figure it's *about*). Emitting these `@id`-less is **correct** — you don't control them. **Don't penalise**; surface as `sameAs`-enrichment candidates (a Wikipedia/Wikidata link on the subject strengthens the `about` assertion).
- `refs.crossPageListItems` = `CollectionPage.hasPart` item `@id`s whose full node lives on the item's own page (distributed-collection pattern) — **legit, not dangling**. Only `refs.danglingSameOrigin` is a real broken ref.

**Score (16 pts).** Conditional items (marked †) score full marks when the page
type doesn't call for them, so pages stay comparable:

- Valid JSON-LD present **and** `ids.hasContext` → **+2**
- `ids.primaryMissingId` empty **and** `duplicates.idlessPersonOrg` empty → **+3**
- `refs.danglingSameOrigin` empty → **+2**
- Org node(s) present with Wikipedia **and** Wikidata in `sameAs` → **+2** (or +1 if one but not both)
- Org `sameAs` has ≥3 authoritative profiles → **+1**
- All *own* Person nodes have an authoritative `sameAs` (`people.ownWithoutAuthoritative` empty) → **+2**
- Offices present and every `Place` has address + `hasMap` → **+1** †
- Coverage pages: every Article links an entity (`coverage.withoutEntityLink` empty) and any quotations carry `spokenByCharacter` → **+2** †
- List/index pages: a `CollectionPage`/`ItemList` with `mainEntity` and `hasPart` → **+1** †

### 2b. JSON-LD Escaping / Stored-XSS

The detector's `escaping` field flags JSON-LD that was **not** routed through a
hardened serializer (`jsonLdScript()`-style — escapes `<` `>` `&` to `\uXXXX`).
Bare `JSON.stringify` in `set:html` is a **stored-XSS vector**: any data field
containing `</script>` breaks out of the element.

- `escaping.risk === 'present'` (malformed block or a literal `</script>`): **flag as a security finding** — active or imminent breakout. **−3** from the schema score.
- `escaping.risk === 'latent'` (literal `<` / `>` in the JSON-LD — not escaped): note as a finding. **−1**.
- `escaping.risk === 'none'`: clean.

**Optional source-side confirmation (strongest signal).** If you have read access
to the site's repo (you usually do when auditing your own build), grep for raw
serialization that bypasses the safe escaper:

```bash
# Raw JSON.stringify emitted into HTML (Astro set:html / React dangerouslySetInnerHTML / Vue v-html)
rg -n "set:html=.*JSON\.stringify|dangerouslySetInnerHTML[\s\S]{0,80}JSON\.stringify|v-html=.*JSON\.stringify" src/
# ld+json blocks not going through a jsonLdScript()-style helper
rg -n 'application/ld\+json' -A3 src/ | rg -i 'json\.stringify' 
```
Any hit that isn't wrapped in a `jsonLdScript()`/escaping helper is the bug. The
fix is the lossless `\uXXXX` escaper (escape `<` `>` `&` U+2028 U+2029).

### 3. Heading Structure + Content Depth

Via `javascript_tool`:

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

Via `javascript_tool`:

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

### 7. Raw-HTML Parity (no browser)

Most AI crawlers (GPTBot, ClaudeBot, PerplexityBot) fetch HTML and don't run JavaScript. What only appears after hydration is invisible to them. Per page:

```bash
curl -sL -A "Mozilla/5.0 (compatible; GPTBot/1.0)" "$URL" -o raw.html
grep -c '<h1' raw.html; grep -c 'application/ld+json' raw.html
grep -o '<title>[^<]*' raw.html; grep -o 'name="description" content="[^"]*' raw.html
```

Compare with the rendered results from checks 1-3: title, meta description, h1, JSON-LD block count, and a rough word count (`sed 's/<[^>]*>//g' raw.html | wc -w`). Use `WebFetch` instead when you only need a summary, but `curl` gives the exact bytes. A bot user agent that gets a 403 or a challenge page is itself a finding.

**Flag (no score change, report under Detailed Findings):** content, headings or JSON-LD present rendered but missing raw → **Major** (crawler-invisible). Parity on every page is a site-wide strength worth stating.

---

## Site-Wide Checks

After all pages are audited, check these site-level items:

### robots.txt
Use `WebFetch` on `{domain}/robots.txt`. Check:
- Does it exist?
- Are AI crawlers blocked? (GPTBot, ClaudeBot, Google-Extended, PerplexityBot)
- Is the sitemap referenced?

### llms.txt
Use `WebFetch` on `{domain}/llms.txt` (and `/llms-full.txt` if present). Check:
- Does it exist? (Emerging standard for AI discoverability)
- Is it well-formed? (H1 site name, a `>` summary blockquote, `##`-grouped link lists)
- **Coverage** — does it enumerate the site's real sections, or just a stub? Cross-check
  against the pages you discovered. A good `llms.txt` is generated from site data and
  lists every major section (key pages, proof-points, the press/news index), not a
  hand-written placeholder that drifts. Flag missing sections.

### Sitemap
Use `WebFetch` on the sitemap URL from robots.txt (or `{domain}/sitemap.xml`). Check:
- Does it exist?
- Does it list all discovered pages?
- Are lastmod dates recent?

---

## Scoring

### Per-Page Score (out of 52)
| Category | Max Points |
|----------|-----------|
| Meta tags + OG | 12 |
| Structured data — entity spine | 16 |
| Heading + content | 8 |
| Internal links | 4 |
| Image optimization | 4 |
| Citability signals | 8 |

Normalize to 0-100 scale: `(raw / 52) * 100`. The entity-spine `escaping`
penalty (−1 / −3) is applied to the schema sub-score before summing (floor 0).

### Site-Wide Score
Average of all page scores, adjusted by:
- robots.txt allows AI crawlers: **+5** — and **this is a gate, not a bonus**: if
  robots.txt is `Disallow: /` (or blocks the major AI crawlers), all the structured
  data is *crawler-invisible*. Lead the report with this; cap the headline score and
  state it plainly (the schema work scores its real potential, but the live GEO value
  is ≈0 until crawling is allowed). Flipping robots is a human decision — flag, don't assume.
- llms.txt present and covers all sections: +5
- Sitemap present and current: +5
- Canonical `@id` entity spine consolidated site-wide (Org + people resolve to one
  `@id` each across pages, `sameAs` KG precondition met): +5
- No JSON-LD escaping risk anywhere (`escaping.risk === 'none'` on every page): +5

---

## Report Format

Write to `{output-dir}/GEO-REPORT.md`:

```markdown
# GEO Report: [Site Name]

> **URL:** [base URL]
> **Date:** [YYYY-MM-DD]
> **Pages audited:** [N]
> **Site GEO Score:** [X/100]

## ⚠️ Crawler Gate
[If robots.txt blocks AI crawlers: state HERE, first, that the live GEO value is ≈0
until it is flipped — every structured-data finding below is potential, not realised.
Note it is a human decision.]

## Site-Wide

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt | Allows AI / Blocks AI / Missing | [which crawlers; Disallow rules] |
| llms.txt | Present+complete / Stub / Missing | [sections covered vs missing] |
| Sitemap | Present / Missing / Stale | [detail] |
| Entity spine | Consolidated / Fragmented / Absent | [one `@id` per Org+person? sameAs KG?] |
| JSON-LD escaping | Clean / Latent / XSS | [worst `escaping.risk` across pages] |

## Entity Spine (site-wide)

| Entity | Canonical `@id` | `sameAs` (KG) | Notes |
|--------|-----------------|---------------|-------|
| Organization | [`…#organization` / MISSING] | Wikipedia ✓/✗ · Wikidata ✓/✗ · N socials | [offices w/ hasMap?] |
| [Person] | [`…/#slug` / MISSING] | [LinkedIn ✓/✗ · other] | [worksFor → Org?] |

[Flag every Person with no authoritative `sameAs` (weak entity) and every `@id`-less
duplicate node. These are the concrete gaps to fill.]

## Page Scores

| Page | Score | Meta | Schema | Content | Links | Images | Citability |
|------|-------|------|--------|---------|-------|--------|-----------|
| [url] | X/100 | X/12 | X/16 | X/8 | X/4 | X/4 | X/8 |

## Detailed Findings
[Per-page breakdown with specific issues — for schema, cite the exact detector field:
dangling refs, `@id`-less duplicates, people missing `sameAs`, coverage not entity-linked,
escaping risk.]

## Recommendations
1. [Prioritised by impact on AI visibility. Entity-spine fixes (canonical `@id`,
   `sameAs` gaps, entity-linking) and the crawler gate rank above cosmetic meta tweaks.]

## Deep Dive
For full analysis on any page: `/site-geo <url>` (single-page deep pass)
For content restructuring and citability: `/triple-audience`
For technical SEO: `/review-seo`
```

---

## Rendered vs Raw: Which Tool for Which Check

Checks 1-6 run in the browser and see the JS-rendered page, as a person does. Check 7 and the
site-wide checks use `curl`/`WebFetch`, which see what a non-JS crawler sees. Report both: a page
can score well rendered and still be close to empty for an AI crawler (SPAs, client-only schema).
Behind a login or Cloudflare Access, `curl` gets the wall; say so rather than scoring the wall.

---

## References

### GEO-specific
- [GEO quick checklist](references/geo-quick-checklist.md)
- [Schema entity-spine detector](scripts/schema-entity-spine.js) — the `schemaEntitySpine` `javascript_tool` body for check #2

### Shared (site-tools suite)
- [Discovery protocol](~/.claude/skills/_site-shared/references/discovery-protocol.md)
- [Chrome MCP patterns](~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md)
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md) — Claude in Chrome setup
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
- [Link check script](~/.claude/skills/_site-shared/scripts/link-check.js)
