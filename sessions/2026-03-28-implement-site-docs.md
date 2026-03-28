# Session: Implement site-docs skill

**Date:** 2026-03-28
**Branch:** main

## Summary

Took a draft plan from PR #1 and converted it into a validated perfect-plan, then implemented the full site-docs skill — the 5th skill in the site-tools suite for generating user-facing help documentation with annotated screenshots.

## What Was Done

### Plan validation (perfect-plan protocol)
- Ran 3 validation agents (review-code-quality, pr-reviewer, codebase-navigator) against the draft plan
- **3 blocking findings resolved:**
  1. Removed `canvas-annotate.js` — base64 payloads too large for `evaluate_script`, async Image loading breaks sync convention. CSS-only annotations for v1.
  2. Added multi-page flow handling — original plan assumed stable DOM throughout flow walkthroughs
  3. Settled image naming convention: `{NN}-{flow-slug}-step-{SS}.png`
- 17 advisory findings incorporated, 6 edge cases added to gotchas

### Implementation (4 phases, 5 commits)
1. **Phase 1: Scripts** — `flow-discovery.js` (224 lines, 6 flow types) + `css-annotate.js` (146 lines, apply/remove pattern)
2. **Phase 2: Templates** — `guide-template.md` (writing style rules, HELP-DOCS.md skeleton) + `html-template.md` (self-contained HTML with responsive TOC)
3. **Phase 3: SKILL.md** — 361-line skill definition with 4-state workflow (ORIENT/DOCUMENT/ASSEMBLE/VERIFY)
4. **Phase 4: Integration** — README.md + setup-guide.md updated for 5th skill

### Symlink switch
- Switched all site-tools skills from claude-config copies to symlinks tracking this repo

## Files Modified

**New (5):**
- `site-docs/SKILL.md`
- `site-docs/scripts/flow-discovery.js`
- `site-docs/scripts/css-annotate.js`
- `site-docs/references/guide-template.md`
- `site-docs/references/html-template.md`

**Modified (3):**
- `README.md` — added site-docs to all relevant sections
- `_site-shared/references/setup-guide.md` — added /site-docs to skill list
- `site-docs/PLAN.md` — updated with validation findings

## Decisions Made

- CSS-only annotations for v1 (canvas deferred to Parking Lot)
- Annotation colors: orange `#FF6B35` primary, blue `#2196F3` secondary
- HTML template: system fonts, 800px max-width, sticky TOC sidebar
- Default output dir: `./site-docs-output/{domain}/`
- flow-discovery runs after interactive-elements (complementary, not redundant)

## Conversation highlights

> there is a new plan file that has just been added via PR - investigate it and make it a /perfect-plan

> good to go

> Let's push it

> I want all site-tools skills to track this repo.
