---
name: site-chaos
description: >
  Adversarial user testing via Chrome MCP. Acts as a deliberately reckless,
  impatient, and provocative user -- doing everything site-qa carefully avoids.
  Submits garbage into forms, rapid-fires clicks, hammers back/forward, resizes
  mid-interaction, pastes XSS payloads, and stress-tests race conditions.
  Complements site-qa: site-qa finds bugs a careful tester would catch,
  site-chaos finds bugs only a hostile or chaotic user would trigger.
  Use when: "chaos test this", "break this site", "adversarial test",
  "stress test the UI", "chaos user", "try to break it".
  Do NOT use for: methodical QA (use site-qa), performance (use site-performance),
  SEO/GEO (use site-geo), screenshots (use site-archive).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: "<url> [output-dir]"
disable-model-invocation: false
compatibility: "Requires Chrome MCP server (chrome-devtools). See ~/.claude/skills/_site-shared/references/setup-guide.md"
---

# Site Chaos -- Adversarial User Testing

> **Philosophy:** You are not a QA tester. You are the worst user imaginable --
> impatient, reckless, adversarial, and creative. You click things before they load,
> paste garbage into every field, mash keyboard shortcuts, resize the window mid-modal,
> and navigate away without finishing anything. If the site survives you, it can survive anyone.

## Quick Start

```
/site-chaos https://staging.example.com
/site-chaos https://localhost:5173 chaos-reports/vera
```

Output defaults to `./site-chaos-reports/{domain}/` if no output dir specified.

**Safety boundary:** This skill tests aggressively. Only run against staging, preview, or localhost environments. If the URL looks like a production domain, confirm with the user before proceeding.

---

## STATE 1: ORIENT

Follow the shared discovery protocol: `~/.claude/skills/_site-shared/references/discovery-protocol.md`

1. Verify Chrome MCP (`navigate_page` available)
2. Navigate to target URL, screenshot
3. Install console monitor
4. Run nav discovery to map the site
5. Build visit list -- prioritise pages with forms, interactive elements, and data mutation

**Auth handling:** If the site requires login, tell the user to authenticate in the Chrome MCP browser first. Chaos testing behind auth is more valuable than testing login walls.

After discovery, tell the user how many pages were found and the chaos plan:
- Which pages have forms (highest chaos value)
- Which pages have interactive elements (medium value)
- Which pages are read-only (lowest value, skip unless comprehensive run requested)

---

## STATE 2: CHAOS

Work through each page running all six chaos categories. Install the console monitor fresh on each page to catch errors triggered by chaos actions.

**Core principle:** After each chaos action, check for crashes (console errors, blank page, unhandled exceptions). The goal is not to verify correct behavior -- site-qa does that. The goal is to verify the site does not *break* under abuse.

### Category 1: Adversarial Input

For every form and text input on the page:

1. Read `scripts/chaos-payloads.js` and run via `evaluate_script` to get payload sets
2. For each visible text field, use Chrome MCP `fill` or `type_text` to inject payloads from each set:
   - **XSS probes** -- after filling, check if `<script>` or event handlers rendered in the DOM
   - **Boundary values** -- empty submit, whitespace-only, 10k characters, 100k characters
   - **Unicode edge cases** -- RTL overrides, null bytes, emoji ZWJ sequences, zero-width spaces
   - **Format strings** -- template injection attempts
3. After each payload: screenshot, check console for errors, check page is not blank
4. For XSS probes specifically: run `document.body.innerHTML.includes('<script>alert')` via `evaluate_script` -- if true, flag as **Critical (security)**

**Do submit forms with garbage data.** This is the point. site-qa avoids this; we deliberately do it. The form should either validate and reject, or accept and sanitize. It should never crash.

### Category 2: Race Conditions

Test what happens when the user is faster than the app:

1. **Click during loading:** Navigate to a page, immediately click buttons/links before spinners resolve
2. **Double-click everything:** Every submit button, every save button, every action button -- click twice rapidly using two `click` calls with no wait between them
3. **Rapid navigation:** Navigate to 8-10 pages in quick succession without waiting for each to fully load. Use `navigate_page` immediately after each previous one.
4. **Back/forward hammering:** Build up 4-5 pages of history, then rapidly alternate back/forward 8+ times
5. **Type during navigation:** Start filling a form, then navigate away mid-keystroke, then come back

After each: check console for uncaught exceptions, check page is not blank or stuck in a loading state.

### Category 3: Impatient Clicks

The user who clicks everything without reading:

1. **Click all the buttons:** Find every button on the page (use `evaluate_script` with the shared `interactiveElements` script). Click them all in rapid succession -- including ones that open modals, drawers, and confirmations.
2. **Don't close what you open:** Open a modal, then instead of closing it, click something behind it or navigate away. Come back -- is the modal ghost still there?
3. **Escape spam:** Open something, then press Escape 5 times rapidly. Does it close cleanly? Does it close *too much* (parent elements)?
4. **Click disabled things:** Find disabled buttons and inputs. Click them anyway. Tab to them and press Enter.
5. **Scroll and click:** Scroll rapidly while clicking. The target moves but the user doesn't care.

### Category 4: Viewport Stress

Not the careful responsive check site-qa does -- this is violent resizing:

1. Read `scripts/overflow-detector.js`
2. **Resize mid-interaction:** Open a modal or dropdown at desktop (1440px), then resize to mobile (375px) while it's open. Does it survive?
3. **Rapid resize oscillation:** Alternate between 375px and 1440px width 5 times rapidly using `resize_page`
4. **Extreme viewports:** Test at 320px wide (old phones) and 2560px wide (ultrawide monitor). Run overflow detector at each.
5. **Zoom simulation:** If the site uses `vh`/`vw` units, resize to unusual aspect ratios (375x375 square, 1440x400 ultrawide strip)

At each viewport where the overflow detector fires, note the specific offending elements.

Reset to desktop (1440x900) before moving to the next page.

### Category 5: Keyboard Chaos

The keyboard-only user who tabs through everything:

1. Read `scripts/focus-visibility.js` and run it to check focus indicators
2. **Tab storm:** Tab 50+ times rapidly using `press_key`. Does focus loop correctly or get trapped?
3. **Enter on everything:** Tab to each focusable element and press Enter. Buttons should activate. Links should navigate. Inputs should not submit the form.
4. **Keyboard shortcuts:** Try common shortcuts that the app might intercept:
   - `Ctrl+S` / `Cmd+S` (save) -- does it trigger a browser save dialog or is it captured?
   - `Ctrl+Z` / `Cmd+Z` (undo) -- does it undo form input or do something unexpected?
   - `Ctrl+A` (select all) -- in a text field vs outside one
   - `Escape` -- at various depths of nested UI
5. **Arrow keys everywhere:** In dropdowns, tables, tabs -- arrow keys should navigate. Outside these, they should do nothing harmful.

### Category 6: Asset Integrity

Structural checks that don't require user interaction:

1. Read `scripts/asset-monitor.js` and run it -- flag any broken images, scripts, fonts, stylesheets
2. Check `list_network_requests` for any 4xx or 5xx responses
3. Check `list_console_messages` for errors that accumulated during the chaos pass

---

## STATE 3: ASSEMBLE

Write the report to `{output-dir}/CHAOS-REPORT.md` using the template in `references/report-template.md`.

**Severity mapping for chaos findings:**

| Finding | Severity |
|---------|----------|
| XSS payload renders in DOM | **Critical** |
| Page crashes (blank, unhandled exception) under any chaos action | **Critical** |
| Form submits invalid data with no validation feedback | **Major** |
| Double-click causes duplicate submission/action | **Major** |
| Modal/drawer left in broken state after chaos | **Major** |
| Horizontal overflow at standard viewport | **Major** |
| Console errors triggered by chaos (but page survives) | **Minor** |
| Focus indicator invisible on interactive elements | **Minor** |
| Broken asset (image, font) | **Minor** |
| Cosmetic issues under extreme viewports only | **Note** |
| Keyboard shortcut not intercepted (browser default fires) | **Note** |

For severity definitions: `~/.claude/skills/_site-shared/references/severity-definitions.md`

**Include "What Survived" section.** Chaos testing is demoralizing if it only lists failures. Call out things that handled abuse gracefully -- good error messages, resilient loading states, proper input sanitization.

Save screenshots as `{output-dir}/screenshots/chaos-{page}-{category}-{n}.png`.

---

## STATE 4: VERIFY

1. Re-read the report. Does every finding have a specific reproduction path (what you did, what broke)?
2. For any Critical finding: re-navigate to the page and reproduce it once more to confirm it's real, not a flake.
3. Present the summary table to the user with total findings by severity.

---

## Gotchas

1. **Console monitor goes first.** Install it before any chaos actions on each page, or you miss the errors you caused.
2. **Session expiry.** Aggressive testing burns through session tokens faster. Check auth state every 3-4 pages. See `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.
3. **Context accumulation.** Chaos generates a LOT of console errors and screenshots. Write findings to the report file incrementally. Don't accumulate everything in context.
4. **Don't confuse "by design" with "broken."** A form that rejects garbage input with a clear error message is working correctly. Only flag if the rejection is a crash, blank page, or missing feedback.
5. **Double-click on delete buttons.** Even chaos has limits. Don't double-click anything matching `/delete|remove|destroy|drop/i` on staging with real data unless the user explicitly says to.
6. **Chrome MCP from sub-agents doesn't work.** All Chrome MCP calls must happen in the main context. Do not delegate chaos actions to Agent sub-agents.
7. **Rate yourself honestly.** Most chaos findings will be Minor or Note. A Critical means the site is genuinely broken for users, not just ugly under a 320px square viewport.

---

## File Organization

```
{output-dir}/
  CHAOS-REPORT.md          # Full report (git-tracked)
  screenshots/             # Visual evidence (gitignored if large)
    chaos-{page}-{category}-{n}.png
```

---

## References

### Chaos-specific
- [Chaos payloads](scripts/chaos-payloads.js)
- [Overflow detector](scripts/overflow-detector.js)
- [Focus visibility checker](scripts/focus-visibility.js)
- [Asset monitor](scripts/asset-monitor.js)
- [Report template](references/report-template.md)

### Shared (site-tools suite)
- [Discovery protocol](~/.claude/skills/_site-shared/references/discovery-protocol.md)
- [Chrome MCP patterns](~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md)
- [Severity definitions](~/.claude/skills/_site-shared/references/severity-definitions.md)
- [Viewport presets](~/.claude/skills/_site-shared/references/viewport-presets.md)
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md)
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
- [Interactive elements script](~/.claude/skills/_site-shared/scripts/interactive-elements.js)
- [Console monitor script](~/.claude/skills/_site-shared/scripts/console-monitor.js)
- [Form tester script](~/.claude/skills/site-qa/scripts/form-tester.js)
