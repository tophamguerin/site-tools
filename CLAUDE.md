# Project: site-tools

<!-- CLAUDE: Read this file + recent session files before starting work -->

## Overview

A suite of Claude Code skills for auditing any website via Chrome MCP. Five skills: site-qa, site-performance, site-geo, site-archive, and site-docs. All share infrastructure in `_site-shared/`.

## Architecture & Decisions

- **Skill pattern**: YAML frontmatter + markdown body + `scripts/` (JS for evaluate_script) + `references/` (prose guides, templates)
- **Script convention**: Self-contained `const fn = () => {...}` with eslint-disable, structured return `{ url, ..., summary }`, dedup via Set, safe `.slice()` serialization
- **Shared infra**: `_site-shared/scripts/` (nav-discovery, interactive-elements, link-check, console-monitor) + `_site-shared/references/` (discovery-protocol, chrome-mcp-patterns, viewport-presets, setup-guide, severity-definitions)
- **Symlink deployment**: Each skill symlinked from `~/GitHub/site-tools/$skill` to `~/.claude/skills/$skill`
- **4-state workflows**: Each skill follows ORIENT/discovery -> skill-specific audit -> report/assemble -> verify pattern
- **canvas-annotate deferred**: Dropped from site-docs v1 due to base64 payload size limits through evaluate_script. CSS-only annotations for now. See site-docs/PLAN.md Parking Lot.

## Task Tracker

### Active
- [ ] Test site-docs against a real site with forms/buttons

## Knowledge Base

- console-monitor.js has install/retrieve (not install/remove) — css-annotate.js introduced a new "apply/remove" pattern
- discovery-protocol.md has 3 phases; site-archive/SKILL.md has 4 states. Don't conflate them.
- All site-tools skills are now symlinked to this repo (not claude-config copies)
