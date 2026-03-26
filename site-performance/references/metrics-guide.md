# Performance Metrics Guide

Reference for interpreting Chrome MCP performance data.

## Core Web Vitals

### LCP (Largest Contentful Paint)
**What:** Time until the largest visible content element renders.
**Why:** Users perceive the page as loaded when the main content appears.
**Thresholds:** Good <2.5s | Needs Improvement 2.5-4s | Poor >4s

**Common causes of poor LCP:**
- Large hero images not optimized (no WebP/AVIF, no responsive srcset)
- Render-blocking CSS/JS in <head>
- Slow server response (high TTFB)
- Web fonts blocking text rendering (no font-display: swap)
- Third-party scripts blocking the main thread

**Use `performance_analyze_insight` with `LCPBreakdown` to see the breakdown.**

### CLS (Cumulative Layout Shift)
**What:** Total of unexpected layout shifts during page life.
**Why:** Content jumping around is disorienting and causes mis-clicks.
**Thresholds:** Good <0.1 | Needs Improvement 0.1-0.25 | Poor >0.25

**Common causes of poor CLS:**
- Images without width/height attributes (or CSS aspect-ratio)
- Ads/embeds injected without reserved space
- Dynamically injected content above the fold
- Web fonts causing text reflow (FOIT/FOUT)

### INP (Interaction to Next Paint)
**What:** Time from user interaction to the next visual update.
**Why:** Measures responsiveness -- how fast does the UI react to clicks/taps?
**Thresholds:** Good <200ms | Needs Improvement 200-500ms | Poor >500ms

**Common causes of poor INP:**
- Long JavaScript tasks blocking the main thread
- Expensive re-renders after state changes
- Synchronous API calls in event handlers
- Heavy third-party scripts (chat widgets, analytics)

**Note:** INP requires actual interaction during the trace. Click a button or link.

## Navigation Timing

| Metric | What It Means |
|--------|--------------|
| TTFB | Server response time (includes DNS, connection, TLS, server processing) |
| DOM Interactive | HTML parsed, but not all resources loaded |
| DOM Content Loaded | HTML + synchronous scripts complete |
| Load Complete | Everything loaded (images, fonts, iframes) |

**Good TTFB:** <200ms (static), <600ms (dynamic/SSR)

## Page Weight Benchmarks

| Category | Budget | Note |
|----------|--------|------|
| Total page weight | <2MB | Median web page is ~2.4MB (too high) |
| JavaScript | <300KB compressed | Most impactful on performance |
| Images | <1MB | Use WebP/AVIF, responsive srcset |
| CSS | <100KB compressed | |
| Fonts | <200KB | Use woff2, subset where possible |

## Lighthouse Score Interpretation

| Score | Rating | Action |
|-------|--------|--------|
| 90-100 | Good | Minor optimizations only |
| 50-89 | Needs improvement | Address flagged issues |
| 0-49 | Poor | Significant problems, prioritise fixes |

Lighthouse does NOT measure Core Web Vitals in this Chrome MCP integration.
Use performance traces for CWV.
