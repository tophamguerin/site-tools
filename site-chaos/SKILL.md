---
name: site-chaos
description: >
  Adversarial user testing in Ben's Chrome (Claude in Chrome): garbage and XSS
  input, rapid clicks, race conditions, violent resizing. Localhost, staging or
  BenTest data only; never real client forms in prod. Triggers: "chaos test",
  "break this site", "adversarial test", "try to break it".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, ToolSearch, AskUserQuestion, mcp__claude-in-chrome
argument-hint: "<url> [output-dir]"
effort: high
---

# Site Chaos -- Adversarial User Testing

> **Prerequisite:** Requires the **Claude in Chrome** extension (Ben's real Chrome, with his logins). See `~/.claude/skills/_site-shared/references/setup-guide.md`.
>
> **All browser work stays in this (main) context.** Never delegate chaos actions to a sub-agent.

> **Philosophy:** You are not a QA tester. You are the worst user imaginable --
> impatient, reckless, adversarial, and creative. You click things before they load,
> paste garbage into every field, mash keyboard shortcuts, resize the window mid-modal,
> and navigate away without finishing anything. If the site survives you, it can survive anyone.

**Do NOT use for:** methodical QA (use site-qa), performance (use site-performance), SEO/GEO (use site-geo), screenshots (use site-archive).

## Quick Start

`$ARGUMENTS`: `<url> [output-dir]`

```
/site-chaos https://staging.example.com
/site-chaos https://localhost:5173 chaos-reports/vera
```

Output defaults to `./site-chaos-reports/{domain}/` if no output dir specified.

## Safety Boundary (read before STATE 1)

Chaos is only worth running where junk can't hurt anyone. Classify the target first:

| Target | Junk input + submits |
|--------|----------------------|
| `localhost`, preview/staging deploys | Yes |
| Vera staging (`staging.vera-2kc.pages.dev`) | **BenTest Client records only.** Staging shares prod Supabase, so every write is a real write |
| Production, or any real client's live form | **No.** Read-only chaos only (clicks, resizing, keyboard, asset checks). Never type junk into a real form |

**Ask Ben before anything outward-facing**, on any environment: a submit that could send email, SMS, Slack or a webhook, invite a user, publish, post, pay, or reach a third party. Name the control and what it would send. If you can't tell whether a submit sends something, treat it as outward-facing.

Delete the test records you created (via the app's own delete/archive) before reporting done, and list any you couldn't remove.

---

## STATE 1: ORIENT

Follow the shared discovery protocol: `~/.claude/skills/_site-shared/references/discovery-protocol.md`

1. Connect (Phase 1): one ToolSearch call, `tabs_context_mcp` then `tabs_create_mcp` for your own tab
2. Classify the target against the safety boundary. Production: confirm the read-only plan with Ben
3. Clear the console baseline, `navigate`, scaled screenshot
4. Run nav discovery (`javascript_tool`, wrapper in the protocol) to map the site
5. Build visit list -- prioritise pages with forms, interactive elements, and data mutation

**Auth handling:** If the site requires login, ask Ben to sign in in his Chrome first. Never type credentials. Chaos testing behind auth is more valuable than testing login walls.

After discovery, tell the user how many pages were found and the chaos plan:
- Which pages have forms (highest chaos value)
- Which pages have interactive elements (medium value)
- Which pages are read-only (lowest value, skip unless comprehensive run requested)

---

## STATE 2: CHAOS

Work through each page running all six chaos categories. Before each category, clear the baseline (`read_console_messages` and `read_network_requests` with `clear: true`, `limit: 1`); after it, read `read_console_messages` with `onlyErrors: true`, `pattern: "."`.

**Native dialogs wedge the extension.** One open `alert`/`confirm`/`prompt` blocks every later browser call. After every navigation, install the dialog stub from the discovery protocol (`alert` → `console.warn('[native-alert]', …)`, `confirm` → `false`, `prompt` → `null`). The XSS payloads call `console.warn('CHAOS_XSS_n')`, never `alert`, so a stored payload that fires on a fresh page load can't open a dialog before the stub is in place.

**Check each click took effect** (read state with `javascript_tool`); a ref click can silently no-op, and a no-op is not a survived attack.

**Core principle:** After each chaos action, check for crashes (console errors, blank page, unhandled exceptions). The goal is not to verify correct behavior -- site-qa does that. The goal is to verify the site does not *break* under abuse.

### Category 1: Adversarial Input

For every form and text input on the page:

1. Read `scripts/chaos-payloads.js` and run via `javascript_tool` to get payload sets
2. For each visible text field, `find` it, then inject payloads from each set: `computer` `type` for short strings (real key events), `form_input` for the 10k/100k strings (typing them is too slow). Confirm the value landed with `javascript_tool`:
   - **XSS probes** -- after filling and after the result renders, check whether a payload executed or rendered as markup
   - **Boundary values** -- empty submit, whitespace-only, 10k characters, 100k characters
   - **Unicode edge cases** -- RTL overrides, null bytes, emoji ZWJ sequences, zero-width spaces
   - **Format strings** -- template injection attempts
3. After each payload: check console for errors, check the page is not blank (`document.body.innerText.length`); screenshot only when something broke
4. For XSS probes specifically: `read_console_messages` with `pattern: "CHAOS_XSS|native-alert"` (execution), and via `javascript_tool` check for injected markup (`!!document.querySelector('img[src="x"], svg[onload]')` or `document.body.innerHTML.includes('CHAOS_XSS')` outside input values). Either hit → **Critical (security)**. Reload the page that displays the stored value and check again

**Submit garbage only inside the safety boundary** (localhost, staging, BenTest data) and never through an outward-facing submit without Ben's yes. There, submitting is the point: site-qa avoids it; we deliberately do it. The form should validate and reject, or accept and sanitize. It should never crash.

### Category 2: Race Conditions

Test what happens when the user is faster than the app:

1. **Click during loading:** Navigate to a page, immediately click buttons/links before spinners resolve
2. **Double-click everything:** Every submit button, every save button, every action button (inside the safety boundary) -- `computer` `double_click` on the ref, or two `left_click`s in one `browser_batch` with no wait
3. **Rapid navigation:** Navigate to 8-10 pages in quick succession without waiting for each to fully load. `navigate` waits for load, so drive it from the page instead: one `javascript_tool` call that sets `location.href` (or clicks in-app links for an SPA) on a short timer.
4. **Back/forward hammering:** Build up 4-5 pages of history, then alternate `history.back()` / `history.forward()` 8+ times in one `javascript_tool` call with ~100ms awaits
5. **Type during navigation:** Start filling a form, then navigate away mid-keystroke, then come back

After each: check console for uncaught exceptions, check page is not blank or stuck in a loading state.

### Category 3: Impatient Clicks

The user who clicks everything without reading:

1. **Click all the buttons:** Find every button on the page (shared `interactiveElements` script via `javascript_tool`). Click them all in rapid succession in one `browser_batch` -- including ones that open modals and drawers. Never destructive or outward-facing ones, and stub native dialogs first.
2. **Don't close what you open:** Open a modal, then instead of closing it, click something behind it or navigate away. Come back -- is the modal ghost still there?
3. **Escape spam:** Open something, then press Escape 5 times rapidly. Does it close cleanly? Does it close *too much* (parent elements)?
4. **Click disabled things:** Find disabled buttons and inputs. Click them anyway. Tab to them and press Enter.
5. **Scroll and click:** Scroll rapidly while clicking. The target moves but the user doesn't care.

### Category 4: Viewport Stress

Not the careful responsive check site-qa does -- this is violent resizing:

1. Read `scripts/overflow-detector.js`
2. **Resize mid-interaction:** Open a modal or dropdown at desktop (1440px), then resize to mobile (375px) while it's open. Does it survive?
3. **Rapid resize oscillation:** Alternate between 375px and 1440px width 5 times rapidly: `resize_window` calls in one `browser_batch`
4. **Extreme viewports:** Test at 320px wide (old phones) and 2560px wide (ultrawide monitor). Run overflow detector at each.
5. **Zoom simulation:** If the site uses `vh`/`vw` units, resize to unusual aspect ratios (375x375 square, 1440x400 ultrawide strip)

At each viewport where the overflow detector fires, note the specific offending elements.

Reset to desktop (1440x900) before moving to the next page.

### Category 5: Keyboard Chaos

The keyboard-only user who tabs through everything:

1. Read `scripts/focus-visibility.js` and run it to check focus indicators
2. **Tab storm:** `computer` `key` `Tab` with `repeat: 50`, then read `document.activeElement` with `javascript_tool`. Does focus loop correctly or get trapped?
3. **Enter on everything:** Tab to each focusable element and press Enter. Buttons should activate. Links should navigate. Inputs should not submit the form.
4. **Keyboard shortcuts:** Try common shortcuts that the app might intercept:
   - `Ctrl+S` / `Cmd+S` (save) -- only if the app claims to capture it. If it doesn't, the browser's native save dialog opens and can wedge the tab; skip `Cmd+S` / `Cmd+P` otherwise
   - `Ctrl+Z` / `Cmd+Z` (undo) -- does it undo form input or do something unexpected?
   - `Ctrl+A` (select all) -- in a text field vs outside one
   - `Escape` -- at various depths of nested UI
5. **Arrow keys everywhere:** In dropdowns, tables, tabs -- arrow keys should navigate. Outside these, they should do nothing harmful.

### Category 6: Asset Integrity

Structural checks that don't require user interaction:

1. Read `scripts/asset-monitor.js` and run it -- flag any broken images, scripts, fonts, stylesheets
2. `read_network_requests` (with a `urlPattern` for the site's API path, then for its asset host) for any 4xx or 5xx responses
3. `read_console_messages` with `onlyErrors: true` for errors that accumulated during the chaos pass

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

Save screenshots as `{output-dir}/screenshots/chaos-{page}-{category}-{n}.png` (`screenshot` with `save_to_disk: true`, then `cp` the returned path).

---

## STATE 4: VERIFY

1. Re-read the report. Does every finding have a specific reproduction path (what you did, what broke)?
2. For any Critical finding: re-navigate to the page and reproduce it once more to confirm it's real, not a flake.
3. Present the summary table to the user with total findings by severity.

---

## Gotchas

1. **Console baseline goes first.** Clear it before each category, or you can't tell which action caused an error.
2. **Session expiry.** Aggressive testing burns through session tokens faster. Check auth state every 3-4 pages. See `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.
3. **Context accumulation.** Chaos generates a LOT of console errors and screenshots. Write findings to the report file incrementally. Don't accumulate everything in context.
4. **Don't confuse "by design" with "broken."** A form that rejects garbage input with a clear error message is working correctly. Only flag if the rejection is a crash, blank page, or missing feedback.
5. **Double-click on delete buttons.** Even chaos has limits. Don't double-click anything matching `/delete|remove|destroy|drop/i` on staging with real data unless the user explicitly says to.
6. **Browser calls from sub-agents don't work.** All Claude in Chrome calls happen in the main context.
7. **Rate yourself honestly.** Most chaos findings will be Minor or Note. A Critical means the site is genuinely broken for users, not just ugly under a 320px square viewport.
8. **Clean up.** Delete your test records, restore 1440x900, close your tabs with `tabs_close_mcp`.

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
- [Form tester script](~/.claude/skills/site-qa/scripts/form-tester.js)
