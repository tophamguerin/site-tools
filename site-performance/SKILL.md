---
name: site-performance
description: >
  Performance audit of any website using Chrome MCP. Runs Lighthouse audits,
  measures Core Web Vitals (LCP, CLS, INP) via performance traces, analyzes
  network waterfalls, and identifies heavy assets. Produces a per-page
  performance scorecard. Use when: "performance test", "speed test",
  "site performance", "is this site fast", "Core Web Vitals", "Lighthouse".
  Do NOT use for: QA/bug finding (use site-qa), SEO audits (use site-geo),
  or screenshot archives (use site-archive).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: "<url> [output-dir]"
disable-model-invocation: true
compatibility: "Requires Chrome MCP server (chrome-devtools). See ~/.claude/skills/_site-shared/references/setup-guide.md"
---

# Site Performance -- Website Performance Audit

> **Philosophy:** Numbers over opinions. Every finding has a metric, a threshold, and a verdict.

## Quick Start

```
/site-performance https://example.com
/site-performance https://example.com perf-reports/example
```

Output defaults to `./site-performance-reports/{domain}/` if no output dir specified.

---

## Workflow

1. **Prerequisite check** -- verify Chrome MCP available
2. **Discover pages** -- shared discovery protocol
3. **Audit each page** -- Lighthouse + performance trace + network analysis
4. **Report** -- per-page scorecard + site-wide summary

For discovery protocol, see `~/.claude/skills/_site-shared/references/discovery-protocol.md`.
For Chrome MCP patterns, see `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.

---

## Per-Page Audit: 3 Passes

### Pass 1: Lighthouse Audit

Run `lighthouse_audit` twice per page -- desktop and mobile:

```
lighthouse_audit({ device: "desktop", mode: "navigation" })
lighthouse_audit({ device: "mobile", mode: "navigation" })
```

This returns scores for: **Accessibility**, **Best Practices**, **SEO**.
(Performance is covered by Pass 2.)

Record scores. Flag anything below 90 as needing attention, below 50 as critical.

### Pass 2: Performance Trace (Core Web Vitals)

1. Navigate to the page
2. Run `performance_start_trace({ reload: true, autoStop: true })`
3. Wait for trace to complete
4. Review the returned insight sets

For any failing metrics, drill deeper:
```
performance_analyze_insight({ insightSetId: "<id>", insightName: "LCPBreakdown" })
performance_analyze_insight({ insightSetId: "<id>", insightName: "DocumentLatency" })
```

#### CWV Thresholds (Google's standards)

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s |
| CLS (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 |
| INP (Interaction to Next Paint) | <200ms | 200-500ms | >500ms |

For INP measurement: click a primary interactive element (button, link, tab) during the trace to generate interaction data.

### Pass 3: Network Analysis

1. Navigate to the page (fresh load)
2. Run `list_network_requests` to capture the waterfall
3. Read `scripts/network-categorize.js` and run via `evaluate_script` for automated categorization

Look for:
- **Total page weight** -- sum of all transferred bytes
- **Request count** -- total HTTP requests
- **Heavy assets** -- any single resource >200KB
- **Render-blocking resources** -- CSS/JS in <head> without async/defer
- **Third-party requests** -- analytics, fonts, widgets (note their weight)
- **Slow requests** -- any single request >1s
- **Uncompressed resources** -- missing gzip/brotli

---

## Report Format

Write to `{output-dir}/PERFORMANCE-REPORT.md`:

```markdown
# Performance Report: [Site Name]

> **URL:** [base URL]
> **Date:** [YYYY-MM-DD]
> **Pages tested:** [N]

## Site-Wide Summary

| Metric | Average | Worst Page | Verdict |
|--------|---------|-----------|---------|
| LCP | Xs | [page] (Xs) | Good/Needs Work/Poor |
| CLS | X | [page] (X) | Good/Needs Work/Poor |
| INP | Xms | [page] (Xms) | Good/Needs Work/Poor |
| Lighthouse A11y | X | [page] (X) | |
| Lighthouse Best Practices | X | [page] (X) | |
| Lighthouse SEO | X | [page] (X) | |
| Page Weight | XMB avg | [page] (XMB) | |
| Requests | X avg | [page] (X) | |

## Page: [URL]

### Core Web Vitals
| Metric | Value | Threshold | Verdict |
|--------|-------|-----------|---------|
| LCP | Xs | <2.5s | PASS/FAIL |
| CLS | X | <0.1 | PASS/FAIL |
| INP | Xms | <200ms | PASS/FAIL |

### Lighthouse Scores
| Category | Desktop | Mobile |
|----------|---------|--------|
| Accessibility | X | X |
| Best Practices | X | X |
| SEO | X | X |

### Network
- **Total weight:** XMB (X requests)
- **Largest assets:** [list top 5]
- **Render-blocking:** [list]
- **Third-party:** X requests, XKB total

### Findings
- [specific issues with impact quantified]

---

## Recommendations (prioritised by impact)

1. [highest impact fix with estimated improvement]
2. [next fix]
```

---

## Gotchas

1. **Lighthouse excludes performance scores** -- use performance traces for CWV instead.
2. **Performance traces need a page reload** -- `reload: true` ensures clean measurement.
3. **INP requires interaction** -- click something during the trace or INP won't be measured.
4. **Network analysis needs a fresh load** -- navigate away and back to get a clean waterfall.
5. **Mobile scores are usually worse** -- always test both desktop and mobile.
6. **Third-party scripts** skew results. Note them but don't blame the site for Google Analytics weight.
7. **Caching** -- first visit vs repeat visit matters. Test with fresh navigation (no cache).

---

## References

### Performance-specific
- [Network categorizer script](scripts/network-categorize.js)
- [Metrics guide](references/metrics-guide.md)

### Shared (site-tools suite)
- [Discovery protocol](~/.claude/skills/_site-shared/references/discovery-protocol.md)
- [Chrome MCP patterns](~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md)
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md)
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
