# Exploration Algorithm — Detailed Reference

## The Core Problem

You are exploring a website you have never seen before. You don't know:
- How many sections exist
- What interactive patterns the app uses
- Whether there are hidden settings, sub-menus, or modal flows
- How the responsive layout behaves

**The algorithm must be discovery-driven, not assumption-driven.**

## Depth-First Exploration (per page)

```
1. ARRIVE at page
2. SNAPSHOT the a11y tree
3. SCREENSHOT the default state
4. EXTRACT all interactive elements (script)
5. For each interactive element:
   a. CLICK it
   b. WAIT for load (spinner gone, content appeared)
   c. SCREENSHOT the new state
   d. SNAPSHOT again if new interactive elements appeared
   e. If new navigation appeared → RECURSE (push to stack)
   f. CLOSE/BACK to restore previous state
6. After all elements exhausted:
   a. SCROLL to bottom (trigger lazy content)
   b. SCREENSHOT full page if content extends below fold
   c. RESIZE to tablet → screenshot
   d. RESIZE to mobile → screenshot
   e. RESIZE back to desktop
7. WRITE section README
8. MOVE to next section
```

## Element Priority Order

Process elements in this order to maximise useful captures:

1. **Tabs** — highest value, reveals parallel content
2. **Sub-navigation** — reveals sub-sections
3. **Filters/search** — shows data shape and options
4. **Table/list sort** — shows data order options
5. **"Add/New/Create" buttons** — reveals creation forms (cancel after)
6. **"Edit" buttons** — reveals edit forms (cancel after)
7. **"..." / kebab menus** — reveals hidden actions
8. **Accordions/expandable sections** — reveals hidden content
9. **Toggle switches** — note state, screenshot if safe
10. **Pagination** — note total, capture if content changes significantly

## Handling Common Patterns

### Modals
- Click to open → screenshot → click Cancel/X to close
- If modal has tabs or steps, capture each
- Watch for nested modals (modal opens another modal)

### Drawers/Sidebars
- Click to open → screenshot → close
- Some drawers are persistent (settings panels) — screenshot in open state

### Inline Editing
- Click the edit icon → screenshot the editable state → press Escape
- Do NOT save any changes

### Toast Notifications
- These are transient — screenshot quickly if one appears
- Note what triggered it in the README

### Loading States
- If a page takes >2s to load, screenshot the loading state too
- Note typical load times in README

### Empty States
- If a section has no data, screenshot the empty state
- These are valuable reference for building replacement UIs

### Error States
- If navigating to a section causes an error, screenshot it
- Note the error in README — it may indicate a feature limitation

## Completeness Verification

After exploring a section, verify completeness:

1. Re-run the interactive element extraction script
2. Compare against your capture log
3. Any uncaptured elements? Go back and click them.
4. Check: did any element reveal a sub-page you didn't follow?

## Resume Protocol

If interrupted mid-archive:

1. Check which section folders have README.md files — these are complete
2. Check which section folders exist but have no README — these are partial
3. For partial sections, check screenshot count vs expected
4. Resume from the first incomplete section
5. Re-snapshot the page to get current state (UI may have changed if session expired)

## Session Management

SaaS apps have session timeouts. Strategies:

- **Before starting:** Note the login URL and credentials location
- **Every 10 minutes:** Check if screenshots are showing the actual app (not a login redirect)
- **If logged out:** Re-authenticate and navigate back to the last section
- **Between sections:** Quick check that navigation still works
