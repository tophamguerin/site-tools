---
name: site-archive
description: >
  Systematic screenshot archive of any website. Discovery-driven exploration
  that maps site navigation, captures every screen/interaction at multiple
  viewports, and generates per-section documentation linking screenshots to
  behavioral descriptions. Use when: "archive this site", "screenshot everything",
  "capture this website", "document this platform", "site archive", before a
  subscription expires, or to catalogue a competitor/tool.
  Do NOT use for: single-page screenshots (use Chrome MCP directly),
  visual QA of your own app (use visual-qa), or SEO audits (use geo).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: "<url> [output-dir]"
disable-model-invocation: true
compatibility: "Requires Chrome MCP server (chrome-devtools). See ~/.claude/skills/_site-shared/references/setup-guide.md"
---

# Site Archive — Systematic Website Documentation

> **Philosophy:** Duplicates over gaps. You are an explorer, not a checklist runner.
> You don't know what this website contains. Go find out.

## Quick Start

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

### Context Window Management
`take_snapshot` dumps the full a11y tree into conversation context. This accumulates fast.

1. Save snapshots to disk: `take_snapshot({ filePath: "{output-dir}/.snapshots/{section}-{NN}.txt" })`
2. Only load a snapshot into context when you need a specific `uid` to click
3. After clicking, move on — don't accumulate snapshot text
4. Prefer `take_screenshot` (visual, for documentation) over `take_snapshot` (text, for finding click targets)

### Session Expiry
SaaS apps timeout after 1-2 hours. At the start of each new section, verify you're still authenticated:

```js
// Via evaluate_script — adapt selectors per platform
() => {
  const loggedIn = document.querySelector('[class*="avatar"], [class*="user-menu"], [class*="profile"]');
  const loginForm = document.querySelector('[type="password"], [class*="login"], [class*="sign-in"]');
  return { authenticated: !!loggedIn && !loginForm, url: window.location.href };
}
```

If expired → **STOP. Prompt for manual re-login.** Do not capture login screens as section content.

### Throughput
Realistic: 15-25 screenshots per hour. For time-pressured archives, tell the user upfront
how many sections you've discovered and roughly how long the full capture will take.

---

## STATE 1: ORIENT

**Goal:** Land on the site and understand its shape before capturing anything.

### 1a. Connect

1. **Prerequisite check:** Verify the `navigate_page` tool is available. If not, read `~/.claude/skills/_site-shared/references/setup-guide.md` and show setup instructions. **Stop.**
2. `navigate_page` to the URL from `$ARGUMENTS` (or `list_pages` if already open)
3. `take_screenshot` — your first look at the site
4. `take_snapshot` — read the a11y tree to understand page structure

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
read `~/.claude/skills/_site-shared/scripts/nav-discovery.js` and run the `navDiscovery` function body via `evaluate_script`.

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

1. Navigate to the section
2. `take_screenshot` at **desktop** (1440x900) — save as `{NN}-overview.png`
3. `take_screenshot` with `fullPage: true` if the page scrolls
4. `take_snapshot` to disk to find interactive elements

### 2b. Find Everything Clickable

Read the snapshot. Identify every interactive element on this page. Look for:

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

**Use the interactive elements script** from `~/.claude/skills/_site-shared/scripts/interactive-elements.js` via `evaluate_script`
if the snapshot doesn't make the clickable elements obvious.

### 2c. Click Through Everything

For each element found:

1. **Click** it
2. **Wait** for content to settle (spinners, transitions)
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

### 2d. Scroll & Check for Hidden Content

Before leaving a page:
1. **Scroll to the bottom** — does more content lazy-load?
2. If yes, screenshot the full page with `fullPage: true`
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

Screenshot each. Use `resize_page` to switch viewports. **Reset to desktop (1440x900) before moving to the next section.**

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
7. **Full-page screenshots** — use `fullPage: true` for any page with below-fold content.
8. **Resume protocol** — if interrupted, check which section READMEs exist. Resume from first incomplete.
9. **Context accumulation** — if you feel the conversation getting sluggish, you've loaded too many snapshots. Save to disk.
10. **Rate limiting** — if pages fail to load, pause briefly. Some apps throttle rapid navigation.

---

## File Organization

```
{output-dir}/
  SITE-MAP.md            # Navigation structure discovered during orient (git tracked)
  INDEX.md               # Master index with all sections (git tracked)
  .snapshots/            # a11y tree dumps — working files, deletable after capture
  {NN}-{section}/
    README.md            # Behaviour documentation (git tracked)
    {NN}-{description}.png           # Desktop captures (gitignored)
    {NN}-{description}-tablet.png    # Tablet captures (gitignored)
    {NN}-{description}-mobile.png    # Mobile captures (gitignored)
```

**Git tracked:** SITE-MAP.md, INDEX.md, all README.md files
**Gitignored:** *.png, *.jpg, .snapshots/

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
- [Setup guide](~/.claude/skills/_site-shared/references/setup-guide.md) -- Chrome MCP installation for team
- [Nav discovery script](~/.claude/skills/_site-shared/scripts/nav-discovery.js)
- [Interactive elements script](~/.claude/skills/_site-shared/scripts/interactive-elements.js)
