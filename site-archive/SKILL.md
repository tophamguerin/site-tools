---
name: site-archive
description: >
  Systematic screenshot archive of any website in Ben's Chrome (Claude in Chrome). Discovery-driven
  exploration capturing every screen at multiple viewports with per-section docs.
  Triggers: "archive this site", "screenshot everything", "document this platform".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, ToolSearch, AskUserQuestion, mcp__claude-in-chrome, mcp__chrome-devtools
argument-hint: "<url> [output-dir]"
effort: high
---

# Site Archive — Systematic Website Documentation

> **Prerequisite:** Requires the **Claude in Chrome** extension (Ben's real Chrome, with his logins). chrome-devtools is optional, for stitched full-page images of public pages only. See `~/.claude/skills/_site-shared/references/setup-guide.md`.
>
> **All browser work stays in this (main) context.** Never delegate it to a sub-agent.

> **Philosophy:** Duplicates over gaps. You are an explorer, not a checklist runner.
> You don't know what this website contains. Go find out.

**Do NOT use for:** single-page screenshots (use Claude in Chrome directly), QA (use site-qa), or SEO/GEO audits (use site-geo).

## Quick Start

`$ARGUMENTS`: `<url> [output-dir]`

```
/site-archive https://app.example.com docs/screenshots/example
```

---

## Core Principle: Discovery-Driven Exploration

You are entering an unfamiliar website. You have no prior knowledge of its structure,
features, or navigation. Your job is to **systematically discover and document everything**
by actually navigating the site, clicking every element, and recording what you find.

**Never work from a pre-made checklist.** The site itself is the source of truth.
The exploration protocol below teaches you HOW to explore — what you find is up to the site.

---

## Operational Constraints

### Browser and Context Window
Follow `~/.claude/skills/_site-shared/references/discovery-protocol.md` (connect, script wrapper, click checks, native-dialog guard).

1. Locate click targets with `find` (returns refs) or `read_page` with `filter: "interactive"`. Never a full `read_page` on an app page (20-50k characters).
2. After clicking, move on. Don't accumulate page dumps.
3. **Saving captures:** `computer` `screenshot` with `save_to_disk: true` returns a path. `cp` it straight to `{output-dir}/{NN}-{section}/{NN}-{description}.png`. For your own look, use `scale: 0.5` without saving.
4. **Check each click took effect** before screenshotting the "new state": read it with `javascript_tool` (a ref click can silently no-op). Otherwise you archive the old state twice.

### Full-Page Captures (say which method you used)
Claude in Chrome screenshots the **viewport only**. Pick one method per archive and record it in SITE-MAP.md and each section README (`Full-page method: scroll-capture` or `devtools`):

- **Default: scroll-and-capture (Claude in Chrome).** Works behind logins. Read `scrollHeight` / `innerHeight` with `javascript_tool`, then `browser_batch` a `window.scrollTo(0, n*innerHeight)` + `screenshot` (`save_to_disk: true`) per viewport. Save as `{NN}-{description}-part-{P}.png`. Hide or note sticky headers that repeat in every part.
- **devtools `take_screenshot` with `fullPage: true`.** One stitched image, but its automation profile has **no logins** (Cloudflare Access and SaaS sessions fail). Use only for public pages where a single image matters.

### Session Expiry
SaaS apps timeout after 1-2 hours. At the start of each new section, verify you're still authenticated:

```js
// Via javascript_tool — adapt selectors per platform
(() => {
  const loggedIn = document.querySelector('[class*="avatar"], [class*="user-menu"], [class*="profile"]');
  const loginForm = document.querySelector('[type="password"], [class*="login"], [class*="sign-in"]');
  return { authenticated: !!loggedIn && !loginForm, url: window.location.href };
})()
```

If expired → **STOP. Prompt for manual re-login.** Do not capture login screens as section content.

### Throughput
Realistic: 15-25 screenshots per hour. For time-pressured archives, tell the user upfront
how many sections you've discovered and roughly how long the full capture will take.

---

## STATE 1: ORIENT

**Goal:** Land on the site and understand its shape before capturing anything.

### 1a. Connect

1. **Connect:** Phase 1 of the discovery protocol: one ToolSearch call for the Claude in Chrome tools, `tabs_context_mcp` then `tabs_create_mcp` for your own tab. Tools missing: show the setup guide and **stop**.
2. `navigate` to the URL from `$ARGUMENTS`
3. `computer` `screenshot` at `scale: 0.5` — your first look at the site
4. `read_page` with `filter: "interactive"` — the controls and structure

### 1b. Map the Navigation

Identify every way to navigate this site. Look at what's actually on the page:

- **Top/header navigation** — horizontal nav bar, logo links
- **Sidebar navigation** — vertical menu, collapsible sections
- **Tab bars** — within-page section switching
- **Footer links** — often contains settings, help, legal
- **User/profile menus** — avatar dropdowns, account settings
- **Breadcrumbs** — reveals hierarchy
- **"More" or "..." menus** — hidden nav items

Run the **nav discovery script** to extract everything programmatically:
read `~/.claude/skills/_site-shared/scripts/nav-discovery.js` and run `navDiscovery` via `javascript_tool` (wrapper in the discovery protocol).

### 1c. Build the Site Map

From what you found, write `{output-dir}/SITE-MAP.md`:

```markdown
# Site Map: [Platform Name]

> Discovered: [date]
> Entry URL: [url]

## Primary Navigation
[List every top-level nav item you found, with URLs where available]

## Sub-Navigation
[Any secondary nav discovered — sidebar sections, settings sub-menus, etc.]

## Discovered Actions
[Buttons, dropdowns, or menu items that suggest additional screens — "New X", "Settings", etc.]

## Sections to Explore
[Numbered list of distinct sections, grouped logically. This becomes your exploration order.]
```

**This is your map. You built it from the site. Now explore it.**

---

## STATE 2: EXPLORE (repeat per section)

For each section in your site map, run this full exploration cycle.

### 2a. Arrive & Capture

1. Navigate to the section (desktop, 1440x900 via `resize_window`)
2. `screenshot` with `save_to_disk: true`, copy to `{NN}-overview.png`
3. If the page scrolls: full-page capture with the method you chose (above)
4. `find` / `read_page` `filter: "interactive"` to list interactive elements

### 2b. Find Everything Clickable

Identify every interactive element on this page. Look for:

- **Tabs** — click each, screenshot each state
- **Accordions / expandable sections** — expand each
- **Dropdown selects** — open to see options
- **Sub-navigation within the page** — sidebar items, breadcrumb branches
- **Action buttons** — "Add", "New", "Create", "Edit", "Manage", "Configure"
- **Overflow menus** — "...", kebab icons, "More" buttons
- **Filter/search controls** — open panels, see what's filterable
- **Table headers** — clickable for sort?
- **Toggle switches** — note current state
- **Pagination** — how many pages? Capture first page, note count.
- **Icons without text** — gear icons, bell icons, question mark icons — click them

**Use the interactive elements script** from `~/.claude/skills/_site-shared/scripts/interactive-elements.js` via `javascript_tool`
if `read_page` doesn't make the clickable elements obvious.

### 2c. Click Through Everything

For each element found:

1. **Click** it (`computer` `left_click` with the `ref`; batch click + wait + check in one `browser_batch`)
2. **Wait** for content to settle (spinners, transitions), then confirm the state changed
3. **Look at what appeared** — is it a modal? A new page? An inline expansion? A dropdown?
4. **Screenshot** the new state
5. **Check if the new state has its own interactive elements** — sub-tabs inside a tab, form fields inside a modal, nested menus
6. **If yes → explore those too** (depth-first recursion)
7. **Close/cancel/navigate back** to restore state before moving to the next element

**Safety rules:**
- NEVER click "Delete", "Remove", "Archive", "Deactivate" — screenshot the label only
- NEVER click "Submit", "Send", "Publish" on real forms
- DO click "Edit" / "Add" / "New" to see forms — then Cancel/Escape/X to close
- DO click all tabs, accordions, filters, sorts, and navigation elements
- NEVER trigger a native `alert`/`confirm`/`prompt`: it blocks every later extension command. Install the dialog stub from the discovery protocol before clicking anything that might confirm

### 2d. Scroll & Check for Hidden Content

Before leaving a page:
1. **Scroll to the bottom** — does more content lazy-load?
2. If yes, redo the full-page capture after it has loaded
3. Check for **"Show more"** or **"Load more"** buttons — click them
4. Look for **footer navigation** or **contextual actions** at the bottom

### 2e. Responsive Capture

Resize and recapture the section overview at each viewport:

| Viewport | Width | Height |
|----------|-------|--------|
| Desktop | 1440 | 900 | (already captured)
| Tablet | 768 | 1024 |
| Mobile | 375 | 812 |

At each size, note:
- Does the navigation change? (hamburger menu, bottom bar, collapsed sidebar)
- Do tables reflow to cards or scrollable views?
- Are any features hidden or rearranged?

Screenshot each. Use `resize_window` to switch viewports (window size only: no touch or mobile user agent; note it if the site sniffs devices). **Reset to desktop (1440x900) before moving to the next section.**

### 2f. Write the Section README

After exhausting the section, immediately write `{NN}-{section}/README.md`:

```markdown
# [Platform]: [Section Name]

> URL: [section URL]
> Captured: [date]
> Screenshots: [N] (desktop: N, tablet: N, mobile: N)

## Overview
[What is this section for? What's the primary use case?]

## How to Get Here
[Navigation path from landing page]

## What I Found

### [Sub-area 1]
![Description](NN-filename.png)
[What does this show? What are the fields/columns/options?
What happens when you click things?]

### [Sub-area 2]
![Description](NN-filename.png)
[Continue for each distinct view or interaction captured]

## Interactive States

### [Modal / Form / Dropdown name]
![State](NN-filename.png)
[What triggers this? What fields/options? Required fields?]

## Responsive
### Tablet (768px)
![Tablet](NN-tablet.png)
[What changed?]

### Mobile (375px)
![Mobile](NN-mobile.png)
[What changed?]

## Notes
[Anything surprising, broken, unusual, or worth flagging for future reference]
```

**Write this while it's fresh. Don't batch READMEs to the end.**

---

## STATE 3: COVERAGE CHECK

After all discovered sections are explored:

### 3a. Re-scan Navigation

Go back to the landing page. Run the nav extraction script again.
Compare against your SITE-MAP.md. Did you miss anything?

### 3b. Check for Settings / Admin Areas

Settings pages are the most commonly missed and the most valuable.
Explicitly look for:
- A "Settings" or "Admin" link anywhere in the nav
- User profile / account settings
- Organization / workspace settings
- Integration / API / webhook pages
- Billing / subscription pages

If found and not yet captured → go capture them now.

### 3c. Check for Hidden Features

Look for features that aren't in the main navigation:
- Keyboard shortcuts (try `?` key — many apps show shortcuts)
- Help / support pages
- API documentation links
- Export / import functions
- Notification preferences
- Email template management

---

## STATE 4: INDEX

Write the master `{output-dir}/INDEX.md`:

```markdown
# [Platform Name] — Screenshot Archive

> Captured: [date(s)]
> Purpose: [why this archive exists]
> Total: [N] screenshots across [N] sections

## Sections

| # | Section | Screenshots | Key Features |
|---|---------|-------------|-------------|
| 01 | [name](01-name/README.md) | N | brief description |
| ... | ... | ... | ... |

## Coverage Notes
[Any known gaps, areas not captured, features behind paywalls, etc.]
```

---

## Gotchas

1. **Session expiry** — check auth at each section start. Re-login if needed.
2. **SPA routing** — SPAs may not have distinct URLs per view. Track state by what's visible, not the URL bar.
3. **Lazy loading** — scroll to bottom of every page before screenshotting.
4. **Modals over modals** — close inner modal before moving on.
5. **Destructive buttons** — NEVER click. Screenshot the label in context.
6. **Dynamic content** — dashboards with live data will look different each time. Note this.
7. **Full-page screenshots** — any page with below-fold content gets a full-page capture, by the method recorded in SITE-MAP.md.
8. **Resume protocol** — if interrupted, check which section READMEs exist. Resume from first incomplete.
9. **Context accumulation** — if the conversation feels sluggish, you've loaded too many page reads or unscaled screenshots. Use `find` and `scale: 0.5`.
11. **Clean up** — restore 1440x900 and close your tabs with `tabs_close_mcp`.
10. **Rate limiting** — if pages fail to load, pause briefly. Some apps throttle rapid navigation.

---

## File Organization

```
{output-dir}/
  SITE-MAP.md            # Navigation structure discovered during orient (git tracked)
  INDEX.md               # Master index with all sections (git tracked)
  {NN}-{section}/
    README.md            # Behaviour documentation (git tracked)
    {NN}-{description}.png           # Desktop captures (gitignored)
    {NN}-{description}-tablet.png    # Tablet captures (gitignored)
    {NN}-{description}-mobile.png    # Mobile captures (gitignored)
    {NN}-{description}-part-{P}.png  # Scroll-capture parts (gitignored)
```

**Git tracked:** SITE-MAP.md, INDEX.md, all README.md files
**Gitignored:** *.png, *.jpg

The archive is designed to be useful even without the images — the README files
document behaviour, interactions, and UX patterns as prose.

---

## References

### Archive-specific
- [Exploration algorithm detail](references/exploration-algorithm.md)
- [Section README template](references/section-readme-template.md)

### Shared (site-tools suite)
- [Viewport presets](~/.claude/skills/_site-shared/references/viewport-presets.md)
- [Chrome MCP patterns](~/.claude/skills/_site-shared/references/chrome-mcp-patterns.md) -- safety rules, session handling, auth walls
- [Discovery protocol](~/.claude/skills/_site-shared/references/discovery-protocol.md) -- connect, script wrapper, click checks, dialog guard (site-docs reuses this skill's discovery pass)
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md) -- Claude in Chrome setup
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
- [Interactive elements script](~/.claude/skills/_site-shared/scripts/interactive-elements.js)
