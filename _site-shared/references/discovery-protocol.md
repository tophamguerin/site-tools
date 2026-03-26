# Discovery Protocol -- Shared Site Exploration Pattern

All site-* skills follow this three-phase pattern before their skill-specific pass.

## Phase 1: Connect + Prerequisite Check

1. Verify `navigate_page` tool is available. If not, read `~/.claude/skills/_site-shared/references/setup-guide.md` and show setup instructions. **Stop.**
2. `navigate_page` to the target URL
3. `take_screenshot` -- first look at the site
4. Install console monitor: read `~/.claude/skills/_site-shared/scripts/console-monitor.js`, run the `consoleMonitorInstall` function body via `evaluate_script`

## Phase 2: Map the Site

1. Read `~/.claude/skills/_site-shared/scripts/nav-discovery.js`
2. Run the `navDiscovery` function body via `evaluate_script`
3. Review the returned nav items -- this is your site structure
4. Build a mental model of sections to visit (group by nav area)

**For multi-page sites:** Plan an ordered visit list. Prioritise:
- Primary navigation items first
- Settings/admin areas (commonly missed, high value)
- Footer links (legal, help, API docs)
- User/profile menus

**For single-page sites:** The nav discovery results may be sparse. Look for:
- Scroll-triggered sections
- Tab or accordion interfaces
- Hash-route navigation (`/#/section`)

## Phase 3: Iterate Pages

For each discovered page/section:

1. `navigate_page` to the URL
2. Check for auth walls (login form, redirect to SSO, 401/403). If detected:
   - **Stop and tell the user** to log in manually in the Chrome MCP browser
   - Wait for confirmation before continuing
3. Run the skill-specific checks for this page
4. Move to the next page

**Between pages:** Verify you're still on the expected site (session expiry detection). If logged out, pause for re-authentication.

## Context Window Management

`take_snapshot` dumps the full a11y tree into conversation context. This accumulates fast.

- Save snapshots to disk: `take_snapshot({ filePath: "path/to/file.txt" })`
- Only load a snapshot into context when you need a specific `uid` to click
- After clicking, move on -- don't accumulate snapshot text
- Prefer `take_screenshot` (visual, for documentation) over `take_snapshot` (text, for finding click targets)
- **If context feels sluggish:** you've loaded too many snapshots. Dump intermediate results to disk and summarise.

## Large Site Protocol

For sites with more than ~15 pages:

1. After discovery, tell the user how many pages were found
2. Ask if they want: full audit, priority pages only, or a specific section
3. Write partial reports as you go (don't batch to the end)
4. If context runs out mid-audit, write what you have and note remaining pages
