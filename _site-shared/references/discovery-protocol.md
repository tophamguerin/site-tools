# Discovery Protocol -- Shared Site Exploration Pattern

All browser-driven site-* skills (site-qa, site-archive, site-chaos, site-docs, site-geo) follow
this pattern before their skill-specific pass. The browser is **Claude in Chrome**
(`mcp__claude-in-chrome__*`): Ben's real Chrome with his logins and CF Access cookie. Only
site-performance uses chrome-devtools. Tool map, safety list and auth handling:
`chrome-mcp-patterns.md`. Frugal call patterns: `~/.claude/skills/verify/references/token-budget.md`.

**All browser work stays in the main context.** Never hand it to a sub-agent: the extension holds
one connection per session.

## Phase 1: Connect

1. **Load the tools in ONE ToolSearch call:**
   `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__find,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__read_network_requests,mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__resize_window,mcp__claude-in-chrome__tabs_close_mcp`
   (add `form_input`, `file_upload` or `gif_creator` if the skill needs them).
   If the tools are missing or the extension is not connected, show `setup-guide.md` and **stop**.
   If several browsers are connected and none is selected, ask Ben which (AskUserQuestion, one
   option per browser from `list_connected_browsers`). Never pick one yourself.
2. `tabs_context_mcp` (`createIfEmpty: true`), then `tabs_create_mcp` for a tab of your own.
   Never reuse tab IDs from an earlier session or hijack a tab Ben is using.
3. `read_console_messages` with `clear: true`, `limit: 1` so console tracking is live before the
   first load (console and network reads only cover the current domain).
4. `navigate` to the target URL, then `computer` `screenshot` at `scale: 0.5` for a first look.
5. **Auth wall** (CF Access page, `/login`, password field): stop and ask Ben to sign in in his
   Chrome, then continue. Never type credentials.

## Running the bundled scripts

The `.js` files under `scripts/` each define one arrow function (`const navDiscovery = () => …`).
`javascript_tool` has REPL semantics (last expression returned, top-level `await` works). Read the
file, then send it wrapped so re-runs on the same page never collide on `const`:

```js
(() => { /* paste the file contents */ ; return navDiscovery(); })()
```

For a helper you call many times on one page (site-docs' `cssAnnotateApply` / `cssAnnotateRemove`),
install it once on `window` and call it by name afterwards; re-install after every navigation:

```js
window.__siteTools = (() => { /* paste file */ ; return { cssAnnotateApply, cssAnnotateRemove }; })(); 'ok'
```

Return small objects. Never return `innerHTML` or a whole store.

`console-monitor.js` is **not needed** with Claude in Chrome: `read_console_messages` with
`onlyErrors: true` and a `pattern` replaces install/retrieve. Keep the script only for a
devtools-driven run.

## Phase 2: Map the site

1. Run `nav-discovery.js` (wrapper above). The returned nav items are your site structure.
2. Group into sections. Prioritise primary nav, then settings/admin (commonly missed, high
   value), footer links, and user/profile menus.
3. **Single-page sites:** nav results may be sparse. Look for scroll sections, tabs/accordions,
   and hash routes (`/#/section`).

## Phase 3: Iterate pages

For each page or section:

1. Clear the baselines in one `browser_batch`: `read_console_messages` (`clear: true`, `limit: 1`),
   `read_network_requests` (`clear: true`, `limit: 1`), then `navigate`.
2. Check auth (session-expiry snippet in `chrome-mcp-patterns.md`). Logged out: pause for Ben.
3. Run the skill-specific checks.
4. After the checks: `read_console_messages` with `onlyErrors: true`, `pattern: "."`; and
   `read_network_requests` with a `urlPattern` for the app's API path when a failure would matter.
5. Move on.

## Interaction rules (every skill)

- **Locate with `find`** (natural language, returns refs), not screenshot-and-guess. Use
  `read_page` with `filter: "interactive"` only when you need to see all the controls.
- **Batch predictable steps** in `browser_batch` (find → click → wait → read value). Coordinates in
  a batch refer to the screenshot taken before it, so prefer refs.
- **Check a click took effect.** A `computer` click by `ref` has been seen to report success and do
  nothing. After any click that matters, read the resulting state with `javascript_tool` (URL,
  `aria-expanded`, a dialog in the DOM). If nothing changed, take a scaled screenshot and click by
  coordinate.
- **Never trigger a native `alert` / `confirm` / `prompt`.** One open native dialog blocks every
  later extension command. Before clicking a control on a site you don't own that might confirm
  natively, stub the dialogs for this page (reinstall after each navigation):
  `window.alert = m => console.warn('[native-alert]', m); window.confirm = () => false; window.prompt = () => null; 'ok'`
  `confirm` returning `false` means Cancel, which is also the safe answer.
- **Screenshots:** `scale: 0.5` for looking, `zoom` for a small region. For a file on disk, pass
  `save_to_disk: true`, which returns a path; `cp` it into the output directory under the skill's
  naming scheme. Viewport only: see site-archive for full-page capture.

## Context window management

- A full `read_page` on an app page can be 20-50k characters. Prefer `find`, a one-value
  `javascript_tool`, or `get_page_text` for text-heavy pages.
- Write findings and guides to disk as you go. Don't accumulate page dumps in context.

## Large site protocol

For sites with more than ~15 pages:

1. After discovery, tell the user how many pages were found.
2. Ask: full audit, priority pages only, or a specific section.
3. Write partial reports as you go.
4. If context runs out mid-audit, write what you have and list the remaining pages.

## Clean up

Restore the window size (1440x900 or the original), close the tabs you opened with
`tabs_close_mcp`, and report any state change you caused.
