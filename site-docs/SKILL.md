---
name: site-docs
description: >
  Generate user-facing help docs with annotated screenshots in Ben's Chrome (Claude in Chrome).
  Discovers flows, walks each step-by-step, and produces how-to guides in
  markdown with optional HTML export. Triggers: "write help docs",
  "create user guide", "document how to use".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, ToolSearch, AskUserQuestion, mcp__claude-in-chrome
argument-hint: "<url> [output-dir] [--flows \"a, b\"] [--html] [--embed-images]"
effort: high
---

# Site Docs — User-Facing Help Documentation

> **Prerequisite:** Requires the **Claude in Chrome** extension (Ben's real Chrome, with his logins). See `~/.claude/skills/_site-shared/references/setup-guide.md`.
>
> **All browser work stays in this (main) context.** Never delegate it to a sub-agent.

> **Philosophy:** Show, don't tell. Every step gets a screenshot. Every screenshot gets an annotation.
> You are writing documentation for the person who will use this site tomorrow.

**Do NOT use for:** visual inventory/catalogue (use site-archive), QA bug reports (use site-qa), SEO/GEO audits (use site-geo).

## Quick Start

`$ARGUMENTS`: `<url> [output-dir] [--flows "task1, task2"] [--html] [--embed-images]`

```
/site-docs https://app.example.com

/site-docs https://app.example.com docs/help/example

/site-docs https://app.example.com docs/help --flows "create project, invite member"

/site-docs https://app.example.com docs/help --html --embed-images
```

---

## How It Works

1. **Discover** — Navigate the site, find every documentable user flow (forms, wizards, creation actions, settings)
2. **Document** — Walk through each flow step-by-step, annotating and screenshotting each action
3. **Assemble** — Write per-flow how-to guides in markdown, build a master index
4. **Verify** — Spot-check output, report what was documented

---

## Operational Constraints

### Context Window Management
Each flow generates many tool calls (annotate → screenshot → write → act → wait per step).

1. **Write each guide to disk immediately** after completing its flow — before starting the next
2. Save screenshots with `computer` `screenshot` `save_to_disk: true`, then `cp` the returned path into `images/`. Only save the ones that go in a guide
3. Locate targets with `find` or `read_page` `filter: "interactive"`, never a full `read_page`
4. After completing a flow, summarise what was documented, then move on

### Session Expiry
SaaS apps time out after 1-2 hours. At the start of each flow, run site-archive's session-expiry check (`~/.claude/skills/site-archive/SKILL.md` § Session Expiry). If expired → **STOP. Ask Ben to sign in again in his Chrome.** Do not capture login screens as documentation content.

### Large Sites
If discovery finds more than 10 documentable flows:
1. Tell the user how many flows were discovered
2. Present the list and ask which to document (unless `--flows` was specified)
3. Write guides incrementally — don't batch to the end

---

## Parsing $ARGUMENTS

Extract from the user's invocation string:

| Token | Meaning | Default |
|-------|---------|---------|
| First URL-like string | Target site URL | _(required)_ |
| Second non-flag string | Output directory | `./site-docs-output/{domain}/` |
| `--flows "x, y, z"` | Specific flows to document (comma-separated) | _(discover all, ask user)_ |
| `--html` | Also generate `HELP-DOCS.html` | off |
| `--embed-images` | Base64-embed images in HTML (requires `--html`) | off |

---

## STATE 1: ORIENT

**Goal:** Connect to the site, map its structure, discover documentable flows.

### 1a-1b. Connect and Map: reuse site-archive's discovery pass

Don't re-derive discovery here. Run **site-archive's STATE 1 (ORIENT)** as written in `~/.claude/skills/site-archive/SKILL.md` (1a Connect, 1b Map the Navigation, 1c Build the Site Map), which follows the shared protocol in `~/.claude/skills/_site-shared/references/discovery-protocol.md` (one ToolSearch call, own tab, script wrapper, click checks, native-dialog guard). Write its `SITE-MAP.md` into this skill's output directory.

**Already archived?** If a site-archive `SITE-MAP.md` for this site exists (ask, or look in `docs/screenshots/`), reuse it and skip straight to 1c. Its section READMEs also describe modals and forms you can turn into flows.

Then build an ordered list of pages to visit from the site map.

### 1c. Discover Flows (per page)

For each discovered page:

1. `navigate` to the page
2. Check for auth walls (login form, redirect). If detected → ask Ben to sign in in his Chrome, wait, re-navigate.
3. **Scroll to bottom** to trigger lazy-loaded content, then scroll back to top (`javascript_tool`: `window.scrollTo(0, document.body.scrollHeight)`, short wait, `window.scrollTo(0, 0)`)
4. Read `~/.claude/skills/_site-shared/scripts/interactive-elements.js`, run `interactiveElements` via `javascript_tool` (wrapper in the discovery protocol)
5. Read `~/.claude/skills/site-docs/scripts/flow-discovery.js`, run `flowDiscovery` via `javascript_tool`
6. Collect discovered flows with their page, type, title, entry selector, and complexity

### 1d. Build Documentation Plan

After scanning all pages:

1. **If `--flows` was specified:** Match discovered flows against the user's list. Report any that couldn't be found.
2. **If no `--flows`:** Present all discovered flows to the user in a table:
   ```
   | # | Page | Flow | Type | Complexity |
   ```
   Ask which to document. Wait for confirmation.
3. Order selected flows logically (group by page, simplest first within a page)
4. Create the output directory structure:
   ```bash
   mkdir -p {output-dir}/guides {output-dir}/images
   ```
5. Write a `.gitignore` in the output directory:
   ```
   images/*.png
   ```

---

## STATE 2: DOCUMENT (repeat per flow)

**Goal:** Walk through each selected flow step-by-step, annotating and capturing every action.

Read `~/.claude/skills/site-docs/scripts/css-annotate.js` once at the start of this state. Install it on the page with the `window.__siteTools` pattern from the discovery protocol, then call `window.__siteTools.cssAnnotateApply({...})` / `window.__siteTools.cssAnnotateRemove()`. **Re-install after every navigation** (a new page has no `window.__siteTools`).

For guidance on handling modals, drawers, loading states, empty states, and error states during walkthroughs, reference `~/.claude/skills/site-archive/references/exploration-algorithm.md`.

### Per-Flow Setup

1. Clear the console baseline (`read_console_messages` `clear: true`, `limit: 1`), then `navigate` to the flow's starting page
2. Install the annotation helpers and the native-dialog stub (discovery protocol)
3. Record the starting URL (`location.href`)
4. Set step counter to 1

### Per-Step Loop

For each step in the flow:

**Step A — Clean up previous annotations:**
Run `window.__siteTools?.cssAnnotateRemove()` via `javascript_tool`. Safe even if no annotations exist (tolerant of navigation).

**Step B — Check for navigation boundary:**
Compare current `window.location.href` to expected URL. If the previous action caused a page navigation:
- Previous annotations are already gone (DOM was destroyed) — cleanup in Step A was a no-op
- Take an orientation screenshot of the new page
- Re-install the annotation helpers and dialog stub on the new page
- Run `interactiveElements` on the new page if needed to find the next target

**Step C — Identify the target element:**
`find` the element for this step (the button, field, or control the user needs); keep its `ref` for the click. `cssAnnotateApply` needs a CSS selector: use the flow's `entrySelector` from `flowDiscovery`, or tag the element and target the tag, e.g. `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Create project')?.setAttribute('data-sd-target', 'N')`, then selector `[data-sd-target="N"]`.

**Step D — Scroll into view and annotate:**
Run via `javascript_tool`:
```js
window.__siteTools.cssAnnotateApply({
  selector: '[the target selector]',
  stepNumber: N,
  style: 'highlight',  // or 'border' or 'badge-only'
  color: '#FF6B35',
  label: ''  // optional: short label like "Click here"
})
```
The function automatically scrolls the element into view if off-screen. Check the return value — if `error`, the element may be hidden or the selector invalid. Adjust and retry.

**Step E — Capture annotated screenshot:**
`computer` `screenshot` with `save_to_disk: true`, then `cp` the returned path to `{output-dir}/images/{NN}-{flow-slug}-step-{SS}.png`.

**Step F — Remove annotations:**
Run `window.__siteTools.cssAnnotateRemove()` via `javascript_tool`.

**Step G — Write step instruction:**
Write the step text for the guide. Follow the writing style rules in `~/.claude/skills/site-docs/references/guide-template.md`:
- Start with a verb: "Click", "Enter", "Select"
- Bold exact UI text: Click **Create Project**
- Be specific about location: "in the top-right corner"

**Step H — Perform the action:**
Click (`computer` `left_click` with the `ref`), type (`computer` `type`), or `form_input`. **Check the action took effect** before the next step (read the new state with `javascript_tool`; a ref click can silently no-op, so retry by coordinate). Otherwise the next screenshot documents the wrong state. Follow safety rules from `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`:
- **NEVER** click Submit, Send, Publish, Delete, Remove on real forms
- **DO** click to open forms, modals, dropdowns — then Cancel/Escape to close
- **DO** fill fields with placeholder text if needed to progress through a wizard
- **NEVER** trigger a native `alert`/`confirm`/`prompt` (it blocks every later browser call); keep the dialog stub installed

**Step I — Wait and observe:**
Wait for the UI to settle (transitions, spinners, loading states). Then:
1. `read_console_messages` with `onlyErrors: true`, `pattern: "."` — check for JS errors from the interaction
2. If errors found: note them as a warning in the guide, but continue documenting
3. Increment step counter, continue to next step

### Annotation Style Guide

Choose the annotation style based on what you're highlighting:

| Situation | Style | Example |
|-----------|-------|---------|
| Single button/link to click | `highlight` | Translucent overlay + badge |
| Form field to fill | `border` | Colored border + badge |
| Element to notice (read-only) | `badge-only` | Just the numbered badge |
| Secondary element in same step | Use `color: '#2196F3'` (blue) | Distinguish from primary |

### Completing a Flow

After the last step:
1. Screenshot the result state: `{NN}-{flow-slug}-result.png`
2. **Restore state:** Cancel/Escape/navigate back. Never leave the app in a modified state.
3. **Write the guide immediately** — see STATE 3 for the template. Don't wait until all flows are done.

---

## STATE 3: ASSEMBLE

**Goal:** Write structured guides from captured steps.

### Per-Flow Guide

After completing each flow's step loop, write its guide immediately.

1. Read `~/.claude/skills/site-docs/references/guide-template.md` for the template structure
2. Write `{output-dir}/guides/{NN}-how-to-{flow-slug}.md` using the template:
   - Title: "How to [verb] [noun]"
   - Metadata: section path, step count, date
   - Overview: 1-2 sentences
   - Before You Start: prerequisites
   - Steps: each step with image reference and instruction text
   - Result: what the user should see when done
3. Use the image naming convention: `../images/{NN}-{flow-slug}-step-{SS}.png`

### Master Index

After all flows are documented, write `{output-dir}/HELP-DOCS.md`:
- Site name, URL, date, flow count
- Table of contents linking to each guide
- Follow the HELP-DOCS.md skeleton in the guide template reference

### HTML Export (if --html)

If the user requested `--html`:

1. Read `~/.claude/skills/site-docs/references/html-template.md`
2. Extract the HTML template from the code block
3. Replace tokens: `{{SITE_TITLE}}`, `{{DATE}}`, `{{URL}}`, `{{TOC_ENTRIES}}`, `{{GUIDE_SECTIONS}}`
4. Convert each guide's markdown content into HTML sections following the comment structure in the template
5. If `--embed-images`: read each PNG, base64-encode via Bash, replace `src="images/..."` with data URIs
6. Write to `{output-dir}/HELP-DOCS.html`

---

## STATE 4: VERIFY

**Goal:** Spot-check output and report results.

### Quick Verification

1. Open one of the generated guides — verify image references are correct paths
2. Check that the output directory has the expected structure
3. If `--html` was used, verify the HTML file contains all guide sections

### Report

Tell the user:

```
Documentation complete.

Flows documented: [N]
Guides: {output-dir}/guides/
Index: {output-dir}/HELP-DOCS.md
[If HTML: HTML export: {output-dir}/HELP-DOCS.html]
Screenshots: {output-dir}/images/ ([N] images)

Flows:
1. How to [flow 1] — [N] steps
2. How to [flow 2] — [N] steps
...
```

---

## Gotchas

1. **Annotation cleanup between steps** — Always run `cssAnnotateRemove` at the START of each step, not just after screenshotting. If the previous action crashed or navigated away, the old annotations are either gone (navigation) or stale (error). Defensive cleanup handles both.

2. **Never submit real forms** — Document the flow by opening forms, filling placeholder data, and screenshotting — then Cancel/Escape. Never click Submit, Send, Publish, or Delete. See `~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md`.

3. **SPA bounding rect invalidation** — After any navigation or route change in a single-page app, bounding rects from previous queries are stale. Always re-query `getBoundingClientRect()` (cssAnnotateApply does this automatically).

4. **Multi-page flows** — Wizards, checkout flows, and creation processes often navigate across pages. After each action, check if the URL changed. If yes: old DOM is gone, annotations cleaned automatically, re-establish context on the new page.

5. **Zero-size elements** — `cssAnnotateApply` automatically scrolls elements into view if their bounding rect is zero-size or off-screen. If it still reports zero dimensions, the element is truly hidden (collapsed accordion, display:none). Expand/reveal it first.

6. **Shadow DOM** — `flowDiscovery` and `cssAnnotateApply` use `document.querySelector` which cannot pierce Shadow DOM boundaries. If a site uses Web Components heavily, flows inside shadow roots will be invisible. Fall back to manual flow identification.

7. **Dark-themed sites** — The default annotation colours (orange `#FF6B35`, blue `#2196F3`) assume light backgrounds. On dark themes, use lighter variants: `#FF9966` (orange), `#64B5F6` (blue).

8. **Context accumulation** — Each flow generates many tool calls. Write guides to disk immediately after each flow. Batch predictable steps (annotate → screenshot → remove) in one `browser_batch`. If context feels sluggish, summarise and continue.

9. **Clean up** — restore state, restore the window size, close your tabs with `tabs_close_mcp`.

---

## File Organization

```
{output-dir}/
  .gitignore                # images/*.png
  HELP-DOCS.md              # Master index with TOC (git tracked)
  HELP-DOCS.html            # HTML export, only if --html (git tracked)
  guides/
    01-how-to-{slug}.md     # Per-flow guide (git tracked)
    02-how-to-{slug}.md
  images/
    01-{slug}-step-01.png   # Annotated screenshots (gitignored)
    01-{slug}-step-02.png
    01-{slug}-result.png
```

**Git tracked:** HELP-DOCS.md, HELP-DOCS.html, all guide .md files
**Gitignored:** images/*.png

---

## References

### Site-docs specific
- [Guide template + writing style rules](references/guide-template.md)
- [HTML export template](references/html-template.md)
- [Flow discovery script](scripts/flow-discovery.js)
- [CSS annotation script](scripts/css-annotate.js)

### Shared (site-tools suite)
- [Discovery protocol](~/.claude/skills/_site-shared/references/discovery-protocol.md) — shared connect + map phases
- [Chrome MCP patterns](~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md) — safety rules, auth walls, SPA handling
- [Viewport presets](~/.claude/skills/_site-shared/references/viewport-presets.md) — standard screenshot sizes
- [Site-archive STATE 1](~/.claude/skills/site-archive/SKILL.md) — the discovery pass this skill reuses
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md) — Claude in Chrome setup
- [Exploration algorithm](~/.claude/skills/site-archive/references/exploration-algorithm.md) — modal/drawer/loading-state handling
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
- [Interactive elements script](~/.claude/skills/_site-shared/scripts/interactive-elements.js)
