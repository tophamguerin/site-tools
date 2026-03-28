# Site Tools

A suite of Claude Code skills for auditing any website. No backend access needed -- just point at a URL and go.

| Skill | Command | What it does |
|-------|---------|-------------|
| **Site QA** | `/site-qa <url>` | Click every link, read every line of text, test every form, check responsive layouts, capture console errors. Produces a structured bug report. |
| **Site Performance** | `/site-performance <url>` | Lighthouse audits, Core Web Vitals (LCP, CLS, INP), network waterfall analysis. Per-page scorecards with pass/fail thresholds. |
| **Site GEO** | `/site-geo <url>` | AI search visibility audit. Checks meta tags, schema markup, content structure, AI crawler access, and citability signals across every page. |
| **Site Archive** | `/site-archive <url> [dir]` | Systematic screenshot documentation. Maps navigation, captures every screen and interaction, generates per-section READMEs. |
| **Site Docs** | `/site-docs <url> [dir]` | User-facing help documentation. Discovers flows, walks through step-by-step, captures annotated screenshots, produces how-to guides. |

All five skills share infrastructure (`_site-shared/`) for site discovery, Chrome browser control patterns, and consistent output formats.

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and authenticated
- Chrome browser installed
- Chrome DevTools MCP server connected (see Setup below)

## Setup

### 1. Clone this repo

```bash
git clone https://github.com/tophamguerin/site-tools.git ~/GitHub/site-tools
```

### 2. Install the Chrome DevTools MCP server

Add to your Claude Code MCP settings (`~/.claude/settings.json` or via Settings > Extensions):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["@anthropic-ai/chrome-devtools-mcp@latest"]
    }
  }
}
```

### 3. Symlink the skills

```bash
# Link each skill into your Claude Code skills directory
for skill in _site-shared site-archive site-docs site-qa site-performance site-geo; do
  ln -sf ~/GitHub/site-tools/$skill ~/.claude/skills/$skill
done
```

If `~/.claude/skills/` doesn't exist yet: `mkdir -p ~/.claude/skills`

### 4. Verify

Start a new Claude Code conversation and type `/site-qa`. If the skill loads, you're set.

## Usage

Each skill takes a URL and optionally an output directory:

```bash
# QA audit -- find bugs, broken links, copy errors
/site-qa https://example.com

# Performance audit -- Lighthouse + Core Web Vitals
/site-performance https://example.com

# GEO audit -- AI search visibility
/site-geo https://example.com

# Screenshot archive -- document everything
/site-archive https://example.com docs/screenshots/example

# Help documentation -- generate how-to guides
/site-docs https://example.com docs/help/example
```

### What each skill produces

| Skill | Output file | Contains |
|-------|------------|---------|
| site-qa | `QA-REPORT.md` | Bug report with severity levels (Critical/Major/Minor/Note), screenshots, per-page findings |
| site-performance | `PERFORMANCE-REPORT.md` | Core Web Vitals scores, Lighthouse results, network analysis, per-page scorecards |
| site-geo | `GEO-REPORT.md` | Per-page GEO scores, meta/schema/content analysis, site-wide AI visibility score |
| site-archive | `INDEX.md` + per-section `README.md` | Screenshots at 3 viewports, interaction documentation, site map |
| site-docs | `HELP-DOCS.md` + per-flow `guides/*.md` | Flow discovery, step-by-step instructions, annotated screenshots, optional HTML export |

### Authenticated sites

If the site requires login (staging environments, CMS admin panels), the skill will detect the auth wall and ask you to log in manually in the Chrome browser. Once you confirm, it continues.

## How it works

```
_site-shared/              Shared infrastructure (not a skill itself)
  scripts/                 Browser automation scripts (nav discovery, link checking, etc.)
  references/              Shared docs (safety rules, viewport presets, setup guide)

site-qa/                   QA skill
  SKILL.md                 Main instructions (241 lines)
  scripts/                 QA-specific: form tester, text scanner, image auditor
  references/              Detailed checklist + report template

site-performance/          Performance skill
  SKILL.md                 Main instructions
  scripts/                 Network resource categorizer
  references/              CWV metrics guide

site-geo/                  GEO/SEO skill
  SKILL.md                 Main instructions
  references/              Quick GEO checklist

site-archive/              Archive skill
  SKILL.md                 Main instructions
  references/              Archive-specific: exploration algorithm, README template

site-docs/                 Help documentation skill
  SKILL.md                 Main instructions
  scripts/                 Flow discovery, CSS annotation
  references/              Guide template, HTML export template
```

Every skill follows the same lifecycle:
1. **Prerequisite check** -- is Chrome MCP connected?
2. **Discover** -- navigate to the site, map all pages
3. **Audit** -- skill-specific checks on every page
4. **Report** -- structured output with consistent formatting

## Troubleshooting

**"navigate_page tool is not available"**
Chrome MCP server isn't connected. Check your MCP settings and restart Claude Code.

**Skills not showing in `/` menu**
Verify symlinks: `ls -la ~/.claude/skills/site-qa/SKILL.md` should show the file. Restart Claude Code.

**Chrome MCP connects but pages don't load**
Close any open Chrome DevTools panels (only one client can connect at a time).

**Site requires VPN/auth**
The skills will pause and ask you to handle authentication manually. They won't bypass auth walls.

## Contributing

These skills improve through use. After running an audit, if you notice:
- A check that should exist but doesn't
- A false positive pattern
- A missing severity classification

Add it to the relevant skill's Gotchas section or `_site-shared/references/`.
