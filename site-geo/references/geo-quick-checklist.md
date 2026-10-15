# GEO Quick Checklist

Per-page checklist for the site-geo quick pass. Optimized for speed across many pages; a single URL gets the deeper single-page pass described in SKILL.md.

## What We Check (and Why)

### Meta Tags
AI systems use title and description as primary summary sources. Missing or poor meta = missed citation opportunity.

- Title present and 50-60 chars
- Meta description present and 150-160 chars
- Canonical URL set (prevents duplicate content confusion)
- Language attribute on <html>

### Open Graph
AI systems and social platforms use OG tags to understand page content at a glance.

- og:title, og:description, og:image all present
- og:type appropriate (website, article, product)
- twitter:card present

### Schema Markup — Entity Spine
Structured data is the strongest signal for AI systems, but the win is **entity
consolidation**, not "has schema". AI-search engines merge entities into a knowledge
graph and cite the site that owns a clean, canonical entity. Run the
`schema-entity-spine.js` detector (check #2 in SKILL.md). It checks:

- **Canonical `@id`** on every primary entity (Org `#organization`, Person `/#slug`) —
  referenced by `@id` everywhere, full node emitted once per page. Google merges `@id`
  across separate `<script>` blocks; an `@id`-less duplicate Person/Org on each page
  can't be consolidated.
- **`sameAs` is the KG precondition** — Org needs Wikipedia **+** Wikidata + socials;
  every Person needs ≥1 authoritative profile (LinkedIn minimum). Without `sameAs`, the
  on-page assertions help AI crawlers but may never merge into the knowledge graph.
- **Offices** as `Place` + `PostalAddress` + Google Maps `hasMap` (local SEO).
- **Coverage entity-linking** — Article/NewsArticle reference the named people/Org by
  `@id` via `about` / `author` / `mentions`; quotes → `Quotation.spokenByCharacter`.
  (Op-ed the subject *wrote* → `author`; external coverage *about* them → `about`.)
- **`CollectionPage`** on list/index pages (`mainEntity`/`about` → Org, `hasPart` → items).
- Type coverage: Organization/WebSite on homepage, Article on news/blog, Product on
  product pages, FAQ where Q&A exists.
- **Escaping** — JSON-LD routed through a hardened serializer (escapes `<` `>` `&`).
  Bare `JSON.stringify` in `set:html` is a stored-XSS vector (`</script>` breakout).

### Content Structure
AI systems prefer well-structured content with clear hierarchy.

- Single h1 per page
- Logical heading hierarchy (h1 > h2 > h3)
- Sufficient word count (300+ minimum, 1000+ ideal for articles)
- Lists and tables (structured, scannable content)

### Internal Linking
Good internal linking helps AI crawlers discover and understand content relationships.

- 5+ internal links per page (minimum)
- Descriptive anchor text (not "click here")

### Image Alt Text
AI systems use alt text to understand visual content.

- All meaningful images have alt text
- Alt text is descriptive (>20 chars), not just filenames

### Citability Signals
Content patterns that AI systems prefer to cite:

- **Direct answers:** "X is..." definitions
- **Statistics:** Numbers with context ("increased by 40%")
- **Lists:** Numbered or bulleted recommendations
- **FAQ format:** Question headings with answer paragraphs
- **Attribution:** Author name, date, credentials visible

### Bing & IndexNow
Site-wide, not per page. Bing's index feeds ChatGPT search and Copilot, so a site Bing
hasn't indexed (or indexes late) is a site those assistants can't cite. Run
`scripts/bing-indexnow-check.sh` for the automated part.

Automated:
- Bing ownership verified via `/BingSiteAuth.xml` or `<meta name="msvalidate.01">`
- Bingbot not blocked in robots.txt, sitemap referenced there
- IndexNow key file `/{key}.txt` live, with a body that exactly matches the key
- IndexNow submission code present in the repo

Confirm with the user (no public trace):
- Site verified in [Bing Webmaster Tools](https://www.bing.com/webmasters). DNS CNAME and
  "Import from Google Search Console" verification can't be seen from outside
- Sitemap submitted in BWT, with no crawl errors in its report
- BWT's IndexNow report shows recent submissions (proves the submitter actually fires)
- On Cloudflare: is Crawler Hints switched on? (It submits via IndexNow automatically)

Setup, if missing:
1. Verify the site in BWT. Importing from Google Search Console is fastest; otherwise use the XML file or meta tag
2. Submit the sitemap in BWT
3. Generate a key (BWT → IndexNow, or any 8–128 char `[A-Za-z0-9-]` string)
4. Commit `public/{key}.txt` containing only the key, then deploy and confirm `https://{host}/{key}.txt` serves it
5. Wire a submitter: on publish/deploy, POST changed URLs to `https://api.indexnow.org/indexnow`
   (`{ host, key, urlList }`), e.g. from a CMS webhook or post-deploy step. Or enable Cloudflare Crawler Hints

## What We Skip (out of scope; `/triple-audience` covers content strategy)

- Brand mention scanning across external platforms
- Platform-specific optimization (ChatGPT vs Perplexity vs Gemini)
- Deep citability scoring with rewrite suggestions
- Competitor comparison
- llms.txt generation
- Full E-E-A-T assessment
