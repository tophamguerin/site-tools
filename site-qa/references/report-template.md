# QA Report Template

Use this structure for the report written to `{output-dir}/QA-REPORT.md`.

---

```markdown
# QA Report: [Site Name]

> **URL:** [base URL]
> **Date:** [YYYY-MM-DD]
> **Pages tested:** [N]
> **Total issues:** [N] (Critical: N, Major: N, Minor: N, Note: N)

## Executive Summary

[2-3 sentences. Overall site quality. Biggest concerns. Ready for launch?]

### Issue Breakdown

| Severity | Count | Examples |
|----------|-------|---------|
| Critical | N | [top 1-2 issues] |
| Major | N | [top 1-2 issues] |
| Minor | N | [categories] |
| Note | N | [categories] |

---

## Page: [Page Name / URL]

### Critical

**[C-001] [Issue title]**
- **URL:** [full URL]
- **Description:** [what's wrong and why it matters]
- **Screenshot:** [filename.png]
- **Steps to reproduce:** [if relevant]

### Major

**[M-001] [Issue title]**
- **URL:** [full URL]
- **Description:** [description]
- **Screenshot:** [filename.png]

### Minor

**[m-001] [Issue title]**
- **Description:** [description]

### Notes

- [observation]
- [observation]

---

## Page: [Next Page]
[repeat structure]

---

## Cross-Site Issues

Issues that appear on multiple pages:

| Issue | Pages Affected | Severity |
|-------|---------------|----------|
| [description] | [list pages] | [severity] |

---

## Responsive Summary

| Page | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| [name] | OK | [issues?] | [issues?] |

---

## Console Errors Summary

| Page | Errors | Warnings | Details |
|------|--------|----------|---------|
| [name] | N | N | [brief] |

---

## Recommendations

### Must Fix (before launch)
1. [Critical and Major items that block launch]

### Should Fix (soon after launch)
1. [Major items that degrade experience]

### Nice to Fix (when time allows)
1. [Minor items and improvements]

---

## Test Environment

- **Browser:** Chrome (via Chrome MCP DevTools Protocol)
- **Viewports tested:** Desktop (1440x900), Tablet (768x1024), Mobile (375x812)
- **Date/time:** [timestamp]
- **Network:** [any throttling applied?]
```

## Numbering Convention

- Critical: C-001, C-002, ...
- Major: M-001, M-002, ...
- Minor: m-001, m-002, ...
- Note: N-001, N-002, ...

Prefix with page abbreviation for large sites: `home-M-001`, `about-C-001`.

## Screenshot Convention

Save screenshots alongside the report:
```
{output-dir}/
  QA-REPORT.md
  screenshots/
    {page}-{issue-id}.png      # e.g. home-C-001.png
    {page}-desktop.png          # baseline
    {page}-tablet.png           # responsive
    {page}-mobile.png           # responsive
```
