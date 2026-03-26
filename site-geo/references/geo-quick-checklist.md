# GEO Quick Checklist

Per-page checklist for the site-geo quick pass. This is the curated subset of what `/geo audit` covers, optimized for speed across many pages.

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

### Schema Markup
Structured data is the strongest signal for AI systems to understand content type and entity relationships.

- Any JSON-LD present?
- Organization or WebSite schema on homepage?
- Article schema on blog/news pages?
- Product schema on product pages?
- FAQ schema where Q&A content exists?

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

## What We Skip (Leave for /geo audit)

- Brand mention scanning across external platforms
- Platform-specific optimization (ChatGPT vs Perplexity vs Gemini)
- Deep citability scoring with rewrite suggestions
- Competitor comparison
- llms.txt generation
- Full E-E-A-T assessment
