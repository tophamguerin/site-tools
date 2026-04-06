# Chaos Report Template

Use this structure for the final `CHAOS-REPORT.md`.

---

```markdown
# Chaos Report: {site name}

**URL:** {url}
**Date:** {date}
**Persona:** The Chaos User
**Pages tested:** {count}

## Survival Summary

| Category | Tested | Survived | Broke |
|----------|--------|----------|-------|
| Adversarial input | {n} | {n} | {n} |
| Race conditions | {n} | {n} | {n} |
| Impatient clicks | {n} | {n} | {n} |
| Viewport stress | {n} | {n} | {n} |
| Keyboard chaos | {n} | {n} | {n} |
| Asset integrity | {n} | {n} | {n} |

**Verdict:** {one-line summary}

## Critical Findings (fix now)

### {finding title}
- **Page:** {url}
- **Action:** {what the chaos user did}
- **Result:** {what broke}
- **Screenshot:** {reference}
- **Impact:** {who this affects and how}

## Major Findings (fix this sprint)

### {finding title}
...

## Minor Findings (track)

### {finding title}
...

## What Survived

Noteworthy resilience worth calling out:

- {thing that handled chaos gracefully}
- {thing that recovered from abuse}

## Methodology

Tested as a deliberately adversarial user via Chrome MCP:
- {list of chaos categories exercised}
- {any auth context: logged in as X, or unauthenticated}
- {viewport sizes tested}
```
