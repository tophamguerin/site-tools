# Plan: `site-docs` Skill — User-Facing Help Documentation

## Context

The site-tools suite has 4 skills (site-qa, site-performance, site-geo, site-archive) sharing infrastructure via `_site-shared/`. The user wants a 5th skill that generates **user-facing help documentation** (how-to guides, feature walkthroughs) with **annotated screenshots** from a live website.

**Key distinction from site-archive:** site-archive documents *what exists* (inventory/catalogue). site-docs documents *how to use it* (task-oriented guides with step-by-step instructions).

---

## Output Format

**Primary:** Markdown folder (consistent with the suite)
```
{output-dir}/
  HELP-DOCS.md              # Master index with TOC (git tracked)
  guides/
    01-how-to-{flow}.md     # Per-flow guide with steps + screenshot refs (git tracked)
    02-how-to-{flow}.md
    ...
  images/
    01-step-01.png           # Annotated screenshots (gitignored)
    01-step-02.png
    01-result.png
    ...
```

**Optional HTML export:** `--html` flag assembles all guides into a single styled HTML page (companion images or `--embed-images` for base64).

---

## Files to Create

### 1. `site-docs/SKILL.md` (main skill definition)

YAML front matter following existing pattern:
```yaml
name: site-docs
description: >-
  Generate user-facing help documentation with annotated screenshots.
  Discovers user flows, walks through each step-by-step, and produces
  how-to guides. Use when: "write help docs", "document how to use",
  "create user guide", "how-to guides".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: "<url> [output-dir] [--flows \"task1, task2\"] [--html] [--embed-images]"
disable-model-invocation: true
compatibility: "Requires Chrome MCP server (chrome-devtools)"
```

**4-state workflow** (matching suite convention):

**STATE 1: ORIENT** — Connect, map, discover flows
- Prereq check (`navigate_page` available?)
- Navigate to URL, take initial screenshot
- Run `nav-discovery.js` to map site structure
- For each page: run `flow-discovery.js` to identify documentable tasks
- If `--flows` provided: match against discovered flows
- If no `--flows`: present discovered flows, ask user which to document
- Build ordered documentation plan

**STATE 2: DOCUMENT** (per flow) — Walk through and capture
- Navigate to flow starting point
- For each step:
  1. Identify the target element (via snapshot/evaluate_script)
  2. Get bounding rect for annotation positioning
  3. Choose annotation method (CSS overlay for single-element highlights; canvas for arrows/relationships)
  4. Apply annotation → `take_screenshot` → clean up annotation
  5. Write step instruction (action-oriented: "Click **Create Project** in the top-right corner")
  6. Perform the action (click/fill using safe patterns)
  7. Wait for UI to settle, check for next step
- Capture "result" screenshot showing outcome
- Cancel/undo to restore state before next flow

**STATE 3: ASSEMBLE** — Write the guides
- Write per-flow markdown guides using `guide-template.md` structure
- Write `HELP-DOCS.md` master index
- If `--html` flag: read `html-template.md`, assemble single HTML page

**STATE 4: VERIFY** — Review output
- Open a generated guide, verify screenshot references are correct
- Report: flows documented, steps captured, output path

**Annotation decision heuristic** (documented in SKILL.md):
- **CSS overlay** (default): Highlighting a single element in context — numbered badge + colored border/highlight box
- **Canvas post-processing**: Drawing arrows between elements, circling a region spanning multiple elements, adding callout text in empty space

**Gotchas section**: annotation cleanup between steps, flow state management (always cancel don't submit), SPA bounding rect invalidation, grouping related settings into single guides.

### 2. `site-docs/scripts/css-annotate.js`

Two functions following the install/remove pattern from `console-monitor.js`:

**`cssAnnotateApply(config)`** — Injects DOM overlays before screenshot
- Params: `{ selector, stepNumber, style: 'border'|'highlight'|'badge-only', color, label }`
- Uses `getBoundingClientRect()` to position absolutely-placed `<div>` elements
- Injects: translucent highlight overlay + numbered circle badge + optional label
- All injected elements tagged with `data-site-docs-annotation` for cleanup
- `z-index: 99999`, `pointer-events: none`
- Returns bounding rect of annotated element

**`cssAnnotateRemove()`** — Removes all injected elements
- Queries `[data-site-docs-annotation]` and removes
- Restores original inline styles (tracked via `data-site-docs-original-style`)
- Called defensively at start of each step (idempotent)

### 3. `site-docs/scripts/canvas-annotate.js`

**`canvasAnnotate(base64Screenshot, instructions)`** — Post-capture drawing

- Creates off-screen `<canvas>`, loads screenshot as image
- Iterates drawing instructions:
  - `{ type: 'arrow', from: {x,y}, to: {x,y}, color, width }`
  - `{ type: 'circle', center: {x,y}, radius, color, width }`
  - `{ type: 'rectangle', x, y, w, h, color, width }`
  - `{ type: 'callout', position: {x,y}, text, color, fontSize }`
  - `{ type: 'badge', position: {x,y}, number, color }`
- Standard Canvas 2D API, arrowheads as filled triangles
- Returns base64 PNG via `canvas.toDataURL()`
- Cleans up canvas element

### 4. `site-docs/scripts/flow-discovery.js`

Answers "what can a user DO on this page?" (vs nav-discovery's "where can I go?")

Scans for:
1. **Creation flows** — "Add", "New", "Create", "Invite", "Upload" buttons
2. **Substantive forms** — Multi-field forms (excludes single-input search bars). Can borrow field-detection from `site-qa/scripts/form-tester.js`
3. **Multi-step wizards** — Step indicators, progress bars, Next/Previous pairs
4. **Settings/config** — Toggles, selects in settings-like containers
5. **Import/export** — "Import", "Export", "Download" buttons
6. **CRUD operations** — Tables/lists with row-level action buttons

Returns:
```js
{
  url: string,
  flows: [{
    type: 'create'|'form'|'wizard'|'settings'|'import-export'|'crud',
    title: string,           // e.g. "Create a new project"
    entrySelector: string,
    entryText: string,
    complexity: 'simple'|'moderate'|'complex',
    relatedElements: number
  }],
  summary: { total, byType: { create: N, ... } }
}
```

### 5. `site-docs/references/guide-template.md`

Per-flow guide structure (markdown template):
```markdown
# How to [verb] [noun]

> Section: [nav path]
> Steps: [N]
> Last updated: [date]

## Overview
[1-2 sentences: what this accomplishes and when you'd use it]

## Before You Start
- [Prerequisites: logged in, on specific page, specific role, etc.]

## Steps

### Step 1: [Action title]
![Step 1](../images/{flow}-step-01.png)
[Action instruction in second person, present tense]

### Step 2: ...

## Result
![Result](../images/{flow}-result.png)
[What you should see when done]
```

**Writing style rules** (embedded in this reference):
- Start steps with verbs: "Click", "Enter", "Select", "Navigate to"
- Second person ("You"), present tense ("The dialog opens")
- Bold exact UI text: "Click **Create Project**"
- Be specific about location: "in the top-right corner", "in the left sidebar"
- One action per step — atomic steps
- Annotation colors: orange `#FF6B35` primary, blue `#2196F3` secondary

### 6. `site-docs/references/html-template.md`

Self-contained HTML template with embedded CSS for the `--html` option:
- Clean professional styling (system fonts, 800px max-width, comfortable spacing)
- TOC sidebar on wide screens, inline on narrow
- Step blocks with numbered indicators + screenshot + instruction
- Responsive layout + print-friendly `@media print`
- Image modes: `<img src="images/...">` default, `data:image/png;base64,...` with `--embed-images`
- Placeholder tokens: `{{SITE_TITLE}}`, `{{DATE}}`, `{{URL}}`, `{{TOC_ENTRIES}}`, `{{GUIDE_SECTIONS}}`

---

## Files to Modify

### 7. `README.md` (root)
- Add site-docs row to skill table
- Add to directory tree listing
- Add to symlink setup loop
- Add to "What each skill produces" table

### 8. `_site-shared/references/setup-guide.md`
- Add site-docs to the list of skills

---

## Reuse Summary

| Existing asset | Reused in site-docs |
|---|---|
| `_site-shared/scripts/nav-discovery.js` | Site mapping in STATE 1 |
| `_site-shared/scripts/interactive-elements.js` | Finding clickable elements during flow walkthrough |
| `_site-shared/references/discovery-protocol.md` | 4-state workflow pattern |
| `_site-shared/references/chrome-mcp-patterns.md` | Safety rules, auth detection, SPA handling |
| `_site-shared/references/viewport-presets.md` | Screenshot dimensions |
| `_site-shared/references/setup-guide.md` | Prereq check instructions |
| `site-qa/scripts/form-tester.js` | Field-detection logic referenced by flow-discovery |
| `site-archive/SKILL.md` | Structural pattern for SKILL.md, file org, gotchas |
| `site-archive/references/section-readme-template.md` | Pattern for guide-template.md |

**New capabilities:** annotation scripts (CSS + canvas), flow discovery, HTML export, writing style guide.

---

## Verification

1. **Symlink and invoke:** `ln -sf ~/GitHub/site-tools/site-docs ~/.claude/skills/site-docs` → `/site-docs https://some-test-site.com test-output`
2. **Check SKILL.md loads:** Verify prereq check works when Chrome MCP is/isn't connected
3. **Test flow discovery:** Run against a site with forms/buttons, verify flows are detected
4. **Test CSS annotation:** Apply + screenshot + remove cycle, verify no stale overlays
5. **Test canvas annotation:** Arrow/badge drawing on a captured screenshot
6. **Test markdown output:** Verify folder structure, guide files, image references
7. **Test HTML export:** `--html` flag produces valid HTML with working image links
8. **Test embedded mode:** `--html --embed-images` produces single self-contained file
