> **Plan file:** `site-docs/PLAN.md`

# site-docs — User-Facing Help Documentation Skill

> Validated by: review-code-quality, pr-reviewer, codebase-navigator. 3 blocking findings incorporated, 17 advisory noted, 6 edge cases added.

## Context

The site-tools suite has 4 skills (site-qa, site-performance, site-geo, site-archive) sharing infrastructure via `_site-shared/`. This plan adds a 5th skill that generates **user-facing help documentation** (how-to guides, feature walkthroughs) with **annotated screenshots** from a live website.

**Key distinction from site-archive:** site-archive documents *what exists* (inventory/catalogue). site-docs documents *how to use it* (task-oriented guides with step-by-step instructions).

## Pre-Flight Checklist

### Credentials & Secrets
- _None required_ — no API keys or secrets needed

### User Decisions Required
- [ ] **Annotation color palette** — Plan proposes orange `#FF6B35` primary, blue `#2196F3` secondary. Note: these assume light backgrounds. For dark-themed sites, SKILL.md will include guidance to use lighter fallbacks. Confirm or change.
- [ ] **HTML template styling** — System fonts, 800px max-width, TOC sidebar. Confirm design direction or provide reference.

### Access & Permissions
- _None_ — all files are within this repo

### Files/Assets Needed
- _None_ — all referenced reuse assets verified to exist

### Environment Setup
- Chrome MCP server connected (existing prerequisite for all site-tools skills)

**BLOCKING: Cannot proceed until all items checked.**

## Success Criteria

- [ ] `/site-docs https://example.com` invokes the skill and completes the 4-state workflow
- [ ] `flow-discovery.js` discovers documentable flows (forms, buttons, wizards) on a test site
- [ ] `css-annotate.js` applies/removes overlay annotations without stale DOM artifacts
- [ ] Output folder matches structure: `HELP-DOCS.md` + `guides/` + `images/` + local `.gitignore`
- [ ] `--html` flag produces valid single-page HTML with working image references
- [ ] `--html --embed-images` produces self-contained HTML with base64-embedded images
- [ ] Multi-page flows (wizards, creation flows) are handled gracefully with navigation boundary detection
- [ ] README.md and setup-guide.md correctly list site-docs as the 5th skill
- Verification: symlink skill, run against a real site with forms/buttons, inspect output

## Planned Files

~7 files total (5 new, 2 modified):

**New:**
- `site-docs/SKILL.md` — Main skill definition (~250-350 lines, 4-state workflow)
- `site-docs/scripts/flow-discovery.js` — Discovers documentable user flows on a page
- `site-docs/scripts/css-annotate.js` — Injects/removes DOM annotation overlays (apply/remove pattern)
- `site-docs/references/guide-template.md` — Per-flow markdown guide template + writing style rules + HELP-DOCS.md index skeleton
- `site-docs/references/html-template.md` — Self-contained HTML export template with embedded CSS

**Modified:**
- `README.md` — Add site-docs to skill table, directory tree, symlink loop, output table, usage examples, and update "All four skills" → "All five skills"
- `_site-shared/references/setup-guide.md` — Add site-docs to opening sentence and skill list

## Reuse Summary

| Existing asset | Reused in site-docs | How |
|---|---|---|
| `_site-shared/scripts/nav-discovery.js` | STATE 1 site mapping | Run via evaluate_script to map pages |
| `_site-shared/scripts/interactive-elements.js` | STATE 1 flow context + STATE 2 walkthrough | Run before flow-discovery to provide element context; reused during step walkthrough |
| `_site-shared/scripts/console-monitor.js` | STATE 2 flow walkthrough (runtime tool) | Install on each page during walkthrough to catch JS errors from interactions |
| `_site-shared/references/discovery-protocol.md` | STATE 1 prerequisite + discovery phases | Referenced for Connect + Map phases (3-phase shared protocol) |
| `_site-shared/references/chrome-mcp-patterns.md` | Safety rules, auth, SPA handling | Referenced from SKILL.md |
| `_site-shared/references/viewport-presets.md` | Screenshot dimensions | Referenced for capture sizes |
| `_site-shared/references/setup-guide.md` | Prereq check | Modified to include site-docs |
| `site-qa/scripts/form-tester.js` | flow-discovery.js field detection | Selector patterns referenced (not imported) |
| `site-archive/SKILL.md` | 4-state workflow pattern, file org, gotchas | Primary structural pattern for SKILL.md (ORIENT/EXPLORE/CHECK/INDEX → ORIENT/DOCUMENT/ASSEMBLE/VERIFY) |
| `site-archive/references/section-readme-template.md` | guide-template.md | Pattern reference for template format |
| `site-archive/references/exploration-algorithm.md` | STATE 2 modal/drawer/loading-state handling | Referenced for what happens after clicking elements |

**New capabilities:** CSS annotation overlays (apply/remove pattern), flow discovery, HTML export, writing style guide.

**Deferred to Parking Lot:** Canvas post-processing annotations (arrows, callouts between elements). See Parking Lot section.

---

## Phase 1: Discovery & Annotation Scripts

**Goal:** Build the two new JavaScript scripts — flow discovery and CSS annotation injection.
**Files:** 2 new (~80-120 lines each) | **Risk:** Medium — css-annotate is a new "apply/remove" pattern not in existing codebase | **Verify:** code-only
**Exit criteria:**
- [ ] `flow-discovery.js` follows codebase script conventions (`const fn = () => {...}`, eslint-disable, structured return with `url`, results, `summary`)
- [ ] `flow-discovery.js` scans for all 6 flow types: creation, forms, wizards, settings, import/export, CRUD
- [ ] `flow-discovery.js` is designed to run AFTER `interactive-elements.js`, consuming its context rather than re-scanning the DOM independently
- [ ] `css-annotate.js` has apply/remove pattern with idempotent install guard (`window.__siteDocsAnnotations`)
- [ ] `css-annotate.js` only creates new overlay elements (no modification of target element styles)
- [ ] All injected overlay elements appended to `document.body` (not component subtrees) and tagged with `data-site-docs-annotation`
- [ ] `pointer-events: none` and `z-index: 99999` on all injected elements
- [ ] `cssAnnotateRemove()` tolerant of missing elements (DOM changed by navigation — empty querySelectorAll is fine)
- [ ] Both scripts have header comments matching convention (purpose, usage, returns)
- [ ] Safe serialization used throughout (`.slice()` on strings, try-catch for fragile DOM)

**Commit:** `feat(site-docs): phase-1 discovery and annotation scripts`

### Implementation Notes

**flow-discovery.js:**
- Returns `{ url, flows: [{ type, title, entrySelector, entryText, complexity, relatedElements }], summary: { total, byType } }`
- Complexity heuristic based on **estimated step count** (not field count): simple (1-2 steps), moderate (3-6 steps), complex (7+ steps). A multi-field form with one submit = simple (one step to fill, one to submit). A wizard with 5 pages = complex.
- Reference selector patterns from `site-qa/scripts/form-tester.js` — document which selectors are borrowed with a comment pointing back to source
- Exclude single-input search bars: `form` with exactly 1 visible `input` where `type="search"` or inside `[role="search"]` or `name`/`placeholder` matches `/search|query|find/i`
- Deduplication via `Set` on `entrySelector`
- Run AFTER `interactive-elements.js` — the SKILL.md will instruct: run interactive-elements first, then run flow-discovery which can leverage the same DOM state

**css-annotate.js:**
- Two functions: `cssAnnotateApply(config)` and `cssAnnotateRemove()`
- This is a NEW "apply/remove" pattern — distinct from console-monitor's "install/retrieve". The idempotent guard and `window.__` global are borrowed; the DOM mutation + cleanup lifecycle is new.
- Config: `{ selector, stepNumber, style: 'border'|'highlight'|'badge-only', color, label }`
- All three styles create NEW overlay elements positioned via `getBoundingClientRect()`:
  - `border`: positioned div with colored border around target
  - `highlight`: translucent colored overlay covering target
  - `badge-only`: numbered circle badge at top-right of target
- All overlays appended to `document.body` (not target's parent — survives SPA re-renders)
- Before annotating: check bounding rect has non-zero width/height. If zero, call `element.scrollIntoView({ block: 'center' })` and re-query.
- `cssAnnotateRemove()`: queries `[data-site-docs-annotation]`, removes all. Tolerant of empty results (page may have navigated). Called defensively at start of every step.

---

## Phase 2: Reference Templates

**Goal:** Create the markdown guide template (with writing style rules and HELP-DOCS.md skeleton) and HTML export template.
**Files:** 2 new | **Risk:** Low — templates are prose/HTML with placeholder tokens | **Verify:** code-only
**Exit criteria:**
- [ ] `guide-template.md` has all sections: title, metadata block, Overview, Before You Start, Steps (with image refs), Result
- [ ] Writing style rules embedded: imperative verbs, second person, bold UI text, location specificity, one action per step
- [ ] Annotation color constants documented: orange `#FF6B35` primary, blue `#2196F3` secondary (with dark-theme fallback note)
- [ ] Image naming convention settled and documented: `{NN}-{flow-slug}-step-{SS}.png` (NN=flow number, SS=step number)
- [ ] HELP-DOCS.md index skeleton included (title, metadata, TOC with per-flow links)
- [ ] `html-template.md` has placeholder tokens: `{{SITE_TITLE}}`, `{{DATE}}`, `{{URL}}`, `{{TOC_ENTRIES}}`, `{{GUIDE_SECTIONS}}`
- [ ] HTML template: responsive layout, TOC sidebar on wide screens, print-friendly `@media print`
- [ ] HTML template supports both `<img src>` and `data:image/png;base64` modes
- [ ] HTML output is explicitly a single combined file with all guides concatenated
- [ ] Size warning documented: `--embed-images` with many flows can produce multi-megabyte HTML

**Commit:** `feat(site-docs): phase-2 guide and HTML templates`

### Implementation Notes

**guide-template.md** — Structure:
```
# How to [verb] [noun]
> Section: [nav path] | Steps: [N] | Last updated: [date]
## Overview
## Before You Start
## Steps (### Step N: [Action title] with ![Step N](../images/{NN}-{flow-slug}-step-{SS}.png))
## Result (![Result](../images/{NN}-{flow-slug}-result.png))
```
Pattern reference: `site-archive/references/section-readme-template.md`

**HELP-DOCS.md skeleton:**
```
# Help Documentation: [Site Name]
> URL: [base URL] | Generated: [date] | Flows documented: [N]
## Table of Contents
- [How to {flow title}](guides/01-how-to-{slug}.md) — [1-line summary]
```

**html-template.md** — Self-contained HTML with `<style>` block:
- System fonts, `max-width: 800px`, centered
- Step blocks: numbered circle + screenshot + instruction text
- TOC: `position: sticky` sidebar at `>1024px`, inline `<nav>` otherwise
- `@media print`: hide TOC, `break-inside: avoid` on step blocks
- Output filename: `HELP-DOCS.html` alongside `HELP-DOCS.md`

**Output structure (documented in both templates):**
```
{output-dir}/
  .gitignore               # Contains: images/*.png
  HELP-DOCS.md             # Master index (git-tracked)
  HELP-DOCS.html           # Only when --html flag (git-tracked)
  guides/
    01-how-to-{slug}.md    # Per-flow guide (git-tracked)
  images/
    01-{slug}-step-01.png  # Annotated screenshots (gitignored)
    01-{slug}-result.png
```

---

## Phase 3: SKILL.md — Main Skill Definition

**Goal:** Write the SKILL.md that orchestrates the 4-state workflow, referencing scripts from Phase 1 and templates from Phase 2.
**Files:** 1 new | **Risk:** Medium — largest single file, orchestration logic for the entire skill | **Verify:** code-only
**Exit criteria:**
- [ ] YAML frontmatter matches suite convention: name, description (including "Do NOT use for" guidance distinguishing from site-archive), allowed-tools, argument-hint, disable-model-invocation, compatibility
- [ ] Philosophy statement + Quick Start section present
- [ ] 4-state workflow: ORIENT → DOCUMENT → ASSEMBLE → VERIFY (derived from site-archive's 4-state pattern)
- [ ] STATE 1 references shared `discovery-protocol.md` for Connect + Map phases, then runs `interactive-elements.js` followed by `flow-discovery.js`
- [ ] STATE 1 includes scroll-and-rescan for lazy-rendered below-fold content
- [ ] STATE 2 references `css-annotate.js`, `interactive-elements.js` (shared), `console-monitor.js` (runtime error detection)
- [ ] STATE 2 includes annotation approach: CSS overlays only (numbered badges + borders/highlights). Canvas post-processing deferred to future.
- [ ] STATE 2 per-step loop includes: scroll-to-element → annotate → screenshot → write instruction → perform action → wait → detect navigation boundary
- [ ] STATE 2 multi-page flow handling: after each action, check if page URL changed. If yes, re-establish context (annotation cleanup is moot — old DOM gone), run element discovery on new page, continue documenting steps on new page
- [ ] STATE 2 error recovery: unexpected state (error modal, unsaved changes dialog) → screenshot, note in guide, Escape/Cancel, continue
- [ ] STATE 2 references `exploration-algorithm.md` for modal/drawer/loading-state handling patterns
- [ ] STATE 3 references `guide-template.md` and `html-template.md`
- [ ] STATE 3 includes `$ARGUMENTS` parsing for `--html` and `--embed-images` flags
- [ ] STATE 4 includes verification and reporting
- [ ] Operational constraints section (context window management: write each guide to disk immediately after flow, flush screenshots, don't accumulate)
- [ ] Safety rules and gotchas section including:
  - Annotation cleanup between steps (defensive cssAnnotateRemove)
  - Flow state management — always Cancel/Escape, never Submit (from chrome-mcp-patterns.md)
  - SPA bounding rect invalidation — re-query after navigation
  - Navigation boundary detection for multi-page flows
  - Zero-size bounding rects → scroll into view first
  - Shadow DOM limitation (flows inside shadow roots invisible to discovery)
  - Dark-themed sites may need lighter annotation colors
- [ ] File organization section showing output structure with .gitignore
- [ ] Default output directory: `./site-docs-output/{domain}/`
- [ ] References section pointing to shared + skill-specific reference files
- [ ] ~250-350 lines, consistent with suite (site-archive: 355, site-qa: 242)

**Commit:** `feat(site-docs): phase-3 main skill definition`

### Implementation Notes

**Description with disambiguation:**
```yaml
description: >
  Generate user-facing help documentation with annotated screenshots.
  Discovers user flows, walks through each step-by-step, captures
  annotated screenshots, and produces how-to guides.
  Use when: "write help docs", "document how to use", "create user guide",
  "how-to guides for this site".
  Do NOT use for: visual inventory/catalogue of a site (use site-archive),
  QA bug reports (use site-qa), or SEO audits (use site-geo).
```

**STATE 2 per-step loop (expanded):**
1. `cssAnnotateRemove()` — defensive cleanup (tolerant of missing elements)
2. Check URL — did previous action cause navigation? If yes → fresh page context, skip to element discovery
3. Identify target element (via snapshot/evaluate_script + interactive-elements.js)
4. Check bounding rect non-zero. If zero → `scrollIntoView({ block: 'center' })`, re-query
5. `cssAnnotateApply(config)` → `take_screenshot({ savePng: path })` → `cssAnnotateRemove()`
6. Write step instruction (action-oriented: "Click **Create Project** in the top-right corner")
7. Perform action (click/fill via safe patterns from chrome-mcp-patterns.md)
8. Wait for UI settle. Check `consoleMonitorRetrieve()` for JS errors from the interaction
9. If errors: note in guide as warning, continue

**Multi-page flow protocol:**
- After step 7, compare `window.location.href` to pre-action URL
- If URL changed: this is a navigation boundary
  - Previous page's annotations already gone (DOM destroyed) — no cleanup needed
  - Take orientation screenshot of new page
  - Re-run `consoleMonitorInstall()` on new page
  - Continue step loop on new page context

**Context window management:**
- Write each guide's markdown to disk immediately after completing the flow (before starting next flow)
- Save all screenshots via `take_screenshot({ savePng })` directly to disk (never hold base64 in context)
- After completing a flow: summarize what was documented, then release context

---

## Phase 4: Suite Integration

**Goal:** Wire site-docs into the suite by updating README.md and setup-guide.md.
**Files:** 2 modified | **Risk:** Low — additive changes to existing files | **Verify:** code-only
**Exit criteria:**
- [ ] README.md line 13: "All four skills" → "All five skills" (or equivalent)
- [ ] README.md skill table has site-docs row with command, description
- [ ] README.md Usage section has `/site-docs` example command
- [ ] README.md directory tree listing includes `site-docs/` with files
- [ ] README.md symlink loop includes `site-docs`
- [ ] README.md "What each skill produces" table has site-docs row
- [ ] `_site-shared/references/setup-guide.md` opening sentence includes `/site-docs`

**Commit:** `feat(site-docs): phase-4 suite integration`

### Implementation Notes

**README.md additions:**

Skill table row:
```
| **Site Docs** | `/site-docs <url> [dir]` | User-facing help documentation. Discovers flows, walks through step-by-step, captures annotated screenshots, produces how-to guides. |
```

Usage example:
```bash
# Help documentation -- generate how-to guides
/site-docs https://example.com docs/help/example
```

Symlink loop update:
```bash
for skill in _site-shared site-archive site-docs site-qa site-performance site-geo; do
```

Output table row:
```
| site-docs | `HELP-DOCS.md` + per-flow `guides/*.md` | Flow discovery, step-by-step instructions, annotated screenshots, optional HTML export |
```

Directory tree:
```
site-docs/                   Help documentation skill
  SKILL.md                   Main instructions
  scripts/                   flow-discovery, css-annotate
  references/                Guide template, HTML template
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Context window exhaustion** from multi-step flows with many screenshots | High | High | Write each guide to disk immediately after flow. Flush screenshots via `savePng`. Limit flow depth. Bail-out protocol when context runs low. |
| Annotation cleanup missed between steps → stale overlays in screenshots | Medium | High | Defensive `cssAnnotateRemove()` at start of every step. All overlays appended to `document.body` with `data-` attribute. Tolerant of empty querySelectorAll. |
| Flow state management — accidentally submitting real forms | Low | High | SKILL.md safety rules: always Cancel/Escape, never Submit. Inherited from chrome-mcp-patterns.md. |
| `getBoundingClientRect()` returns stale/zero rects | Medium | Medium | Re-query after navigation. Scroll into view if zero-size. Document in gotchas. |
| Flow discovery false positives (decorative buttons detected as flows) | Medium | Low | Complexity heuristic + user confirmation in STATE 1 (no `--flows` = ask user). |
| Multi-page flows break single-page DOM assumptions | Medium | Medium | Navigation boundary detection after each action. Re-establish context on new page. |
| Shadow DOM boundaries invisible to flow/element discovery | Low | Low | Document as known limitation in gotchas. Manual flow identification as fallback. |
| Dark-themed sites → poor annotation color contrast | Low | Low | Document in gotchas with lighter fallback color guidance. |

## Complexity Signals

| Phase | Files | New Deps | External APIs | Risk |
|-------|-------|----------|---------------|------|
| 1: Scripts | 2 | 0 | None (browser APIs only) | Medium |
| 2: Templates | 2 | 0 | None | Low |
| 3: SKILL.md | 1 | 0 | None | Medium |
| 4: Integration | 2 | 0 | None | Low |

**Total:** 7 files, 0 new packages, 0 external services

## Rollback Strategy

- Pre-implementation: `git tag pre-site-docs`
- Phase N complete: committed with conventional message
- Nuclear: `git reset --hard pre-site-docs`
- Partial rollback: individual phase commits can be reverted independently

## Parking Lot

- [ ] **Canvas post-processing annotations** — arrows between elements, circles spanning multiple elements, callout text in empty space. Deferred because: (a) passing large base64 payloads through `evaluate_script` has payload size limits, (b) `Image` loading is async which breaks the synchronous script convention, (c) CSS overlays handle the 80% case (single-element highlights + numbered badges). If needed later, implement as a Node.js script via Bash rather than browser-side canvas.
- [ ] Future: `--video` flag for screen recording of flows
- [ ] Future: i18n support for multi-language help docs
- [ ] Future: integration with help center platforms (Zendesk, Intercom)
- [ ] Future: `--update` flag to re-capture screenshots for existing guides without rewriting text
- [ ] Consider: flow-discovery consuming interactive-elements output directly (currently runs independently with borrowed selectors — could be tighter integration)
