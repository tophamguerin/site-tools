---
name: site-performance
description: >
  [What] Audit website performance via the chrome-devtools MCP -- Lighthouse, Core Web Vitals, network waterfalls, heavy assets, and a --low-end cheap-Android profile.
  [When] User says "performance test", "speed test", "site performance", "is this site fast", "Core Web Vitals", "Lighthouse", or "slow/cheap Androids".
  [Triggers] /site-performance URL. Not for QA (site-qa) or SEO (site-geo).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, ToolSearch, AskUserQuestion, mcp__chrome-devtools
argument-hint: "<url> [output-dir] [--low-end]"
effort: high
---

# Site Performance -- Website Performance Audit

> **Philosophy:** Numbers over opinions. Every finding has a metric, a threshold, and a verdict.

## Browser: chrome-devtools, not Claude in Chrome

This is the one site-* skill that **stays on the chrome-devtools MCP** (`mcp__chrome-devtools__*`). Lighthouse, performance traces, and CPU/network/device emulation exist only there. Claude in Chrome has none of them. Setup: `~/.claude/skills/_site-shared/references/setup-guide.md` (Step 2).

Consequences:
- The devtools automation profile has **none of Ben's logins**. Pages behind Cloudflare Access (Vera staging) or a SaaS login show the wall. Trace a local production build instead (see `--low-end`, step 1), or ask Ben to sign in inside the devtools window.
- Load the tools in one ToolSearch call: `select:mcp__chrome-devtools__navigate_page,mcp__chrome-devtools__new_page,mcp__chrome-devtools__evaluate_script,mcp__chrome-devtools__lighthouse_audit,mcp__chrome-devtools__performance_start_trace,mcp__chrome-devtools__performance_stop_trace,mcp__chrome-devtools__performance_analyze_insight,mcp__chrome-devtools__emulate,mcp__chrome-devtools__list_network_requests,mcp__chrome-devtools__take_screenshot`.
- Browser work stays in the main context. Never delegate it to a sub-agent.
- Discovery: run `~/.claude/skills/_site-shared/scripts/nav-discovery.js` via `evaluate_script` (the function body as-is). The Claude in Chrome connect steps in the shared discovery protocol don't apply here; its page-prioritisation and large-site rules do.

## Arguments

`$ARGUMENTS` = `<url> [output-dir]`
- First argument: the URL to audit (required)
- Second argument: output directory (optional, defaults to `./site-performance-reports/{domain}/`)
- `--low-end`: run the cheap-Android profile below instead of the default desktop + mobile passes

## Quick Start

```
/site-performance https://example.com
/site-performance https://example.com perf-reports/example
/site-performance http://localhost:4173 --low-end
```

---

## Workflow

1. **Prerequisite check** -- chrome-devtools tools load (one ToolSearch call)
2. **Discover pages** -- nav-discovery via `evaluate_script`
3. **Audit each page** -- Lighthouse + performance trace + network analysis
4. **Report** -- per-page scorecard + site-wide summary

For page prioritisation and large sites, see `~/.claude/skills/_site-shared/references/discovery-protocol.md`.
For safety rules, see `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.

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

## `--low-end` Profile: Slow, Cheap Androids

For audiences on cheap Android phones and poor mobile data. Ben built this by hand for unwc on 10 Aug 2026; this is the named version.

| Setting | Value |
|---------|-------|
| Build | **Production build**, never the dev server |
| CPU | **4x** throttle |
| Network | **Slow 4G** |
| Viewport | **360x800 @2x, mobile, touch** (low-end Android) |

1. **Production build.** A dev server's unbundled modules and HMR make every number wrong. For a live URL, the deployed build is already production. For a local project: `npm run build`, then serve the output (`npm run preview`, or `npx serve dist`) and trace that URL.
2. **Emulate** before the trace:
   ```
   emulate({ cpuThrottlingRate: 4, networkConditions: "Slow 4G", viewport: "360x800x2,mobile,touch" })
   ```
3. **Trace:** `performance_start_trace({ reload: true, autoStop: true })`, then drill into failing insights with `performance_analyze_insight` as in Pass 2. For INP, tap the primary action during a second, non-reload trace.
4. **Network pass** (Pass 3) under the same emulation: page weight matters most on Slow 4G.
5. **Reset:** `emulate({ cpuThrottlingRate: 1, networkConditions: "No emulation", viewport: "1440x900x1" })`.

Report the profile at the top of the report (`Profile: low-end (prod build, CPU 4x, Slow 4G, 360x800@2)`). CWV thresholds are the same; expect to miss them, and rank fixes by what they save under this profile.

4x is Lighthouse's mobile default and a mainstream-Android stand-in. For the floor, raise it: unwc's entry tier used 6x, and its no-performance-core floor was a 10x/12x/14x sweep, with a physical-device trace required before any claim about that tier. Emulation throttles the main thread only, not GPU, storage or memory pressure. Say so in the report.

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
8. **Leftover emulation** -- throttling persists on the page until reset. Always run the reset `emulate` call before the next page or before handing the browser back.

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
