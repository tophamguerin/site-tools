---
name: site-qa
description: >
  [What] QA audit any website in Ben's Chrome (Claude in Chrome) -- test every link, element, form, responsive layout, and console error to produce a structured bug report.
  [When] User says "QA this site", "test this website", "check for bugs", "site QA", or "find issues".
  [Triggers] /site-qa URL. Not for performance (site-performance) or SEO (site-geo).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, ToolSearch, AskUserQuestion, mcp__claude-in-chrome
argument-hint: "<url> [output-dir]"
effort: high
---

# Site QA -- Comprehensive Website Quality Audit

> **Philosophy:** You are a meticulous QA tester, not a casual browser.
> Every link, every word, every interaction. If a user could encounter it, you test it.

## Prerequisites

Requires the **Claude in Chrome** extension (drives Ben's real Chrome, with his logins). No devtools needed. See `~/.claude/skills/_site-shared/references/setup-guide.md`.

**All browser work stays in this (main) context.** Never delegate it to a sub-agent.

## Arguments

`$ARGUMENTS` = `<url> [output-dir]`
- First argument: the URL to audit (required)
- Second argument: output directory (optional, defaults to `./site-qa-reports/{domain}/`)

## Quick Start

```
/site-qa https://example.com
/site-qa https://staging.example.com qa-reports/example
```

---

## Workflow Overview

1. **Connect** -- load tools in one ToolSearch call, own tab (shared protocol, Phase 1)
2. **Discover** -- map site structure (shared protocol, Phase 2)
3. **Audit each page** -- 8 check categories per page
4. **Report** -- structured bug report with severities

For the shared discovery protocol (connect, map, iterate, how to run the bundled scripts with `javascript_tool`, click checks, native-dialog guard), see `~/.claude/skills/_site-shared/references/discovery-protocol.md`. Run every `scripts/*.js` with the wrapper described there.

For safety rules, auth handling, session management, and viewport patterns, see `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.

For severity definitions (Critical/Major/Minor/Note), see `~/.claude/skills/_site-shared/references/severity-definitions.md`.

---

## Per-Page Audit: 8 Check Categories

For each discovered page, run all 8 categories in order. Record every finding with a severity level.

### 1. Console Errors

Set the baseline **before navigating** so you capture errors from page load.

1. `read_console_messages` with `clear: true`, `limit: 1`; `read_network_requests` with `clear: true`, `limit: 1`
2. `navigate`, then `computer` `screenshot` at `scale: 0.5` (baseline state)
3. After page load: `read_console_messages` with `onlyErrors: true`, `pattern: "."`
4. At the end of all other checks, read again (errors caused by interaction), and `read_network_requests` with a `urlPattern` for the site's API path to catch 4xx/5xx behind a normal-looking page

**Flag as:**
- Console errors on page load → **Critical** (if unhandled exception) or **Major**
- Console errors on interaction → **Major**
- Console warnings → **Minor** (unless excessive)

### 2. Links

1. Read `~/.claude/skills/_site-shared/scripts/link-check.js`
2. Run `linkCheck` via `javascript_tool` (wrapper in the discovery protocol)
3. Review the `issues` array for automatic detections (empty hrefs, javascript: hrefs, broken anchors)
4. For internal links: check status in bulk with one `javascript_tool` call (`await Promise.all(urls.map(u => fetch(u, {method:'HEAD'}).then(r => [u, r.status]).catch(e => [u, String(e)])))`, same-origin only). SPA routes all return the shell, so navigate to those and look for a not-found state instead
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

Read `scripts/text-scan.js` and run via `javascript_tool` for automated detection. For the human read, prefer `get_page_text` over a full-scale screenshot; use a scaled screenshot for what text can't show (truncation, overlap).

**Flag as:**
- Placeholder text visible to users → **Major**
- Garbled/encoded text → **Major**
- Empty interactive elements → **Major**
- Typos → **Minor**
- Inconsistent casing → **Minor**

### 4. Images

Check every image on the page:

1. Read `scripts/image-audit.js` and run via `javascript_tool`
2. Review results for broken images, missing alt text, oversized assets

**Flag as:**
- Broken image (failed to load) → **Major**
- Missing alt text on meaningful image → **Minor**
- Missing alt text on decorative image → **Note** (should have `alt=""`)
- Image >500KB → **Minor** (performance concern, note for site-performance)

### 5. Interactive Elements

1. Read `~/.claude/skills/_site-shared/scripts/interactive-elements.js`
2. Run `interactiveElements` via `javascript_tool`
3. `find` each target to get a `ref`, click with `computer` `left_click` (real input events), and **check the click took effect** (read the new state with `javascript_tool`; a ref click can silently no-op, so retry by coordinate from a scaled screenshot). Batch predictable steps with `browser_batch`. In priority order:

   **Tabs:** Click each tab. Does content change? Is the active state clear?
   **Dropdowns:** Open each. Are options populated? Can you select one?
   **Buttons:** Click action buttons (Add, Edit, New). Does a form/modal appear? Cancel/close after.
   **Accordions:** Expand each. Does content render correctly?
   **Overflow menus:** Open each. Are menu items functional?
   **Forms:** See category 6 below for detailed form testing.

**Safety:** Follow the safety rules in `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`. Never click destructive actions. Cancel/close after opening forms. **Never trigger a native `alert`/`confirm`/`prompt`**: it blocks every later extension command. On a site you don't own, install the dialog stub from the discovery protocol before clicking anything that might confirm.

**Flag as:**
- Button/link does nothing on click → **Major** (only after a coordinate click also does nothing: a ref click can no-op on its own)
- Dropdown with no options → **Major**
- Tab doesn't switch content → **Major**
- Accordion animation broken → **Minor**
- Interactive element has no hover/focus state → **Minor**

### 6. Forms

For each form on the page:

1. Read `scripts/form-tester.js` and run via `javascript_tool` to discover forms
2. For each form found:
   - **Empty submit:** Try submitting with no data. Does validation fire? Are error messages clear?
   - **Field types:** Are email fields validated? Are required fields marked?
   - **Error states:** Do errors appear inline or as a toast? Are they helpful?
   - **Tab order:** `computer` `key` `Tab` (with `repeat`), then read `document.activeElement` with `javascript_tool`. Is the order logical?
3. **NEVER submit a form with real data.** Test validation only, then cancel/close. An empty submit on a production form that could still send (no client validation) is outward-facing: ask Ben first.

**Flag as:**
- Form submits with empty required fields → **Critical**
- No validation feedback on invalid input → **Major**
- Error message unclear or generic → **Minor**
- Tab order illogical → **Minor**

### 7. Responsive Layout

For each page, check three viewports:

1. **Desktop (1440x900)** -- already captured as baseline
2. **Tablet (768x1024)** -- `resize_window({ width: 768, height: 1024 })`
3. **Mobile (375x812)** -- `resize_window({ width: 375, height: 812 })`

`resize_window` changes the window, not the device: no touch events or mobile user agent. If the site serves different content by device detection, note it and suggest a devtools `emulate` pass.

At each size, take a `scale: 0.5` screenshot and measure overflow with one `javascript_tool` expression (`document.documentElement.scrollWidth > innerWidth`). Check:
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
- **Focus visibility:** Tab through key elements (`computer` `key`), then `zoom` on the focused element. Can you see where focus is?
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

1. **Clear the console baseline FIRST** on each page (before navigating), then read errors after load and after interaction. Otherwise load errors blur into interaction errors.
2. **Forms are the highest-risk area.** Never submit with real data. Always cancel/close.
3. **SPAs may not have distinct URLs.** Track by visible state, not URL bar.
4. **Dynamic content** (dashboards, feeds) will differ between runs. Note this.
5. **Rate your findings honestly.** Not everything is Critical. Use the severity definitions.
6. **Large sites:** After discovery, tell the user how many pages were found. For 15+ pages, ask if they want full audit or priority pages.
7. **Resume protocol:** If interrupted, check which page sections exist in the report. Resume from first incomplete.
8. **Screenshots for the report:** `save_to_disk: true` returns a path; `cp` it to `{output-dir}/screenshots/`. Don't save screenshots you only looked at.
9. **Clean up:** restore 1440x900, close your tabs with `tabs_close_mcp`.

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
- [Link check script](~/.claude/skills/_site-shared/scripts/link-check.js)
