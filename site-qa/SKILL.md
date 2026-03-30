---
name: site-qa
description: >
  Comprehensive QA audit of any website using Chrome MCP. Clicks every link,
  reads every line of text, tests every interactive element, checks responsive
  layouts, captures console errors, and produces a structured bug report.
  No backend access needed. Use when: "QA this site", "test this website",
  "check for bugs", "review this site", "site QA", "find issues".
  Do NOT use for: performance testing (use site-performance),
  SEO/GEO audits (use site-geo), or screenshot archives (use site-archive).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: "<url> [output-dir]"
disable-model-invocation: false
compatibility: "Requires Chrome MCP server (chrome-devtools). See ~/.claude/skills/_site-shared/references/setup-guide.md"
---

# Site QA -- Comprehensive Website Quality Audit

> **Philosophy:** You are a meticulous QA tester, not a casual browser.
> Every link, every word, every interaction. If a user could encounter it, you test it.

## Quick Start

```
/site-qa https://example.com
/site-qa https://staging.example.com qa-reports/example
```

Output defaults to `./site-qa-reports/{domain}/` if no output dir specified.

---

## Workflow Overview

1. **Prerequisite check** -- verify Chrome MCP
2. **Discover** -- map site structure (shared protocol)
3. **Audit each page** -- 8 check categories per page
4. **Report** -- structured bug report with severities

For the shared discovery protocol (phases 1-2), see `~/.claude/skills/_site-shared/references/discovery-protocol.md`.

For safety rules, auth handling, session management, and viewport patterns, see `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.

For severity definitions (Critical/Major/Minor/Note), see `~/.claude/skills/_site-shared/references/severity-definitions.md`.

---

## Per-Page Audit: 8 Check Categories

For each discovered page, run all 8 categories in order. Record every finding with a severity level.

### 1. Console Errors

Run **before any interaction** so you capture errors from page load.

1. Read `~/.claude/skills/_site-shared/scripts/console-monitor.js`
2. Run the `consoleMonitorInstall` function via `evaluate_script`
3. Take a screenshot (baseline state)
4. At the end of all other checks, run `consoleMonitorRetrieve` to collect errors/warnings

**Flag as:**
- Console errors on page load → **Critical** (if unhandled exception) or **Major**
- Console errors on interaction → **Major**
- Console warnings → **Minor** (unless excessive)

### 2. Links

1. Read `~/.claude/skills/_site-shared/scripts/link-check.js`
2. Run the `linkCheck` function via `evaluate_script`
3. Review the `issues` array for automatic detections (empty hrefs, javascript: hrefs, broken anchors)
4. For internal links: navigate to each and verify the page loads (no 404, no error state)
5. For external links: note them but don't navigate (they're outside scope)

**Flag as:**
- Broken internal link → **Major**
- `href="#"` on clickable element → **Major** (should be a button)
- `javascript:` href → **Major**
- Broken anchor target → **Minor**
- External link with no `rel="noopener"` on `target="_blank"` → **Minor**

### 3. Copy & Content

Read every visible text element on the page. Look for:

- **Placeholder text:** "Lorem ipsum", "TODO", "TBD", "[placeholder]", "example.com" in content
- **Typos and grammar:** obvious misspellings, missing punctuation, broken sentences
- **Encoding issues:** `&amp;`, `&#39;`, mojibake, broken special characters
- **Empty elements:** headings, buttons, or links with no text content
- **Inconsistent casing:** mixed Title Case and sentence case in similar elements
- **Truncated text:** text cut off mid-word or with "..." where full text should show

Read `scripts/text-scan.js` and run via `evaluate_script` for automated detection, then visually inspect the screenshot for issues the script can't catch.

**Flag as:**
- Placeholder text visible to users → **Major**
- Garbled/encoded text → **Major**
- Empty interactive elements → **Major**
- Typos → **Minor**
- Inconsistent casing → **Minor**

### 4. Images

Check every image on the page:

1. Read `scripts/image-audit.js` and run via `evaluate_script`
2. Review results for broken images, missing alt text, oversized assets

**Flag as:**
- Broken image (failed to load) → **Major**
- Missing alt text on meaningful image → **Minor**
- Missing alt text on decorative image → **Note** (should have `alt=""`)
- Image >500KB → **Minor** (performance concern, note for site-performance)

### 5. Interactive Elements

1. Read `~/.claude/skills/_site-shared/scripts/interactive-elements.js`
2. Run the `interactiveElements` function via `evaluate_script`
3. For each element, in priority order:

   **Tabs:** Click each tab. Does content change? Is the active state clear?
   **Dropdowns:** Open each. Are options populated? Can you select one?
   **Buttons:** Click action buttons (Add, Edit, New). Does a form/modal appear? Cancel/close after.
   **Accordions:** Expand each. Does content render correctly?
   **Overflow menus:** Open each. Are menu items functional?
   **Forms:** See category 6 below for detailed form testing.

**Safety:** Follow the safety rules in `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`. Never click destructive actions. Cancel/close after opening forms.

**Flag as:**
- Button/link does nothing on click → **Major**
- Dropdown with no options → **Major**
- Tab doesn't switch content → **Major**
- Accordion animation broken → **Minor**
- Interactive element has no hover/focus state → **Minor**

### 6. Forms

For each form on the page:

1. Read `scripts/form-tester.js` and run via `evaluate_script` to discover forms
2. For each form found:
   - **Empty submit:** Try submitting with no data. Does validation fire? Are error messages clear?
   - **Field types:** Are email fields validated? Are required fields marked?
   - **Error states:** Do errors appear inline or as a toast? Are they helpful?
   - **Tab order:** Tab through fields. Is the order logical?
3. **NEVER submit a form with real data.** Test validation only, then cancel/close.

**Flag as:**
- Form submits with empty required fields → **Critical**
- No validation feedback on invalid input → **Major**
- Error message unclear or generic → **Minor**
- Tab order illogical → **Minor**

### 7. Responsive Layout

For each page, check three viewports:

1. **Desktop (1440x900)** -- already captured as baseline
2. **Tablet (768x1024)** -- `resize_page({ width: 768, height: 1024 })`
3. **Mobile (375x812)** -- `resize_page({ width: 375, height: 812 })`

At each size, screenshot and check:
- Content overflowing horizontally (horizontal scroll)
- Text too small to read
- Touch targets too small (<44px)
- Navigation accessible (hamburger menu works?)
- Images scaling correctly
- No content hidden unintentionally

**Reset to desktop (1440x900) before moving to the next page.**

**Flag as:**
- Content completely broken/unreadable at a viewport → **Critical**
- Horizontal overflow → **Major**
- Touch targets too small → **Minor**
- Minor spacing issues → **Note**

### 8. Accessibility Basics

Quick a11y pass (not a full WCAG audit -- use `/review-a11y` for that):

- **Heading hierarchy:** h1 → h2 → h3 (no skips?)
- **Image alt text:** covered in category 4
- **Link text:** any "click here" or "read more" without context?
- **Focus visibility:** Tab through key elements. Can you see where focus is?
- **Colour contrast:** any obviously low-contrast text? (visual check)

**Flag as:**
- No h1 on page → **Minor**
- Heading hierarchy skip (h1 → h3) → **Minor**
- "Click here" link text → **Minor**
- Focus completely invisible → **Major**
- Very low contrast text → **Major**

---

## Report Format

Write the report to `{output-dir}/QA-REPORT.md`:

See `references/report-template.md` for the full template.

Key sections:
- **Executive summary:** total issues by severity, pages tested, date
- **Per-page findings:** grouped by page URL, each finding with severity, description, screenshot reference
- **Cross-site issues:** patterns that appear on multiple pages
- **Recommendations:** prioritised fix list

---

## Gotchas

1. **Install console monitor FIRST** on each page -- before any clicks. Otherwise you miss load errors.
2. **Forms are the highest-risk area.** Never submit with real data. Always cancel/close.
3. **SPAs may not have distinct URLs.** Track by visible state, not URL bar.
4. **Dynamic content** (dashboards, feeds) will differ between runs. Note this.
5. **Rate your findings honestly.** Not everything is Critical. Use the severity definitions.
6. **Large sites:** After discovery, tell the user how many pages were found. For 15+ pages, ask if they want full audit or priority pages.
7. **Resume protocol:** If interrupted, check which page sections exist in the report. Resume from first incomplete.

---

## References

### QA-specific
- [QA checklist detail](references/qa-checklist.md)
- [Report template](references/report-template.md)
- [Form tester script](scripts/form-tester.js)
- [Text scanner script](scripts/text-scan.js)
- [Image audit script](scripts/image-audit.js)

### Shared (site-tools suite)
- [Discovery protocol](~/.claude/skills/_site-shared/references/discovery-protocol.md)
- [Chrome MCP patterns](~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md)
- [Severity definitions](~/.claude/skills/_site-shared/references/severity-definitions.md)
- [Viewport presets](~/.claude/skills/_site-shared/references/viewport-presets.md)
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md)
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
- [Interactive elements script](~/.claude/skills/_site-shared/scripts/interactive-elements.js)
- [Console monitor script](~/.claude/skills/_site-shared/scripts/console-monitor.js)
- [Link check script](~/.claude/skills/_site-shared/scripts/link-check.js)
