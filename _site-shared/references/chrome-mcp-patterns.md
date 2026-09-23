# Chrome MCP Patterns -- Shared Reference

Common patterns used across all site-* skills and /verify.

## Browser choice (read first)

**Default to Claude in Chrome** (`mcp__claude-in-chrome__*`). It drives Ben's real Chrome,
so it already has his Cloudflare Access cookie, Vera session and client logins, and its
clicks are real input events. Use **chrome-devtools** (`mcp__chrome-devtools__*`) only for
what exists only there: `lighthouse_audit`, performance traces, heap snapshots, device and
network `emulate`, and full-page screenshots.

Tool names below are devtools-era. Claude in Chrome equivalents:

| devtools | Claude in Chrome |
|---|---|
| `list_pages` / `select_page` / `new_page` | `tabs_context_mcp` then `tabs_create_mcp` (own tab; never reuse IDs across sessions) |
| `navigate_page` | `navigate` |
| `evaluate_script` | `javascript_tool` (REPL semantics: last expression returned, top-level `await`) |
| `take_snapshot` | `find` (natural language, returns refs) or `read_page` with `filter: "interactive"` |
| `take_screenshot` | `computer` `screenshot` (`scale: 0.5`) / `zoom`; viewport only |
| `click` / `fill` / `press_key` | `computer` `left_click` with `ref` / `type` / `key`; `form_input` |
| `list_console_messages` | `read_console_messages` with `pattern` and `onlyErrors` |
| `list_network_requests` | `read_network_requests` with `urlPattern` |
| `resize_page` | `resize_window` |
| (none) | `browser_batch`: several steps in one round trip · `gif_creator`: recorded evidence |

Never trigger a native `alert`/`confirm`/`prompt` in Claude in Chrome: it blocks the extension.
Keep all browser work in the main context, never in a sub-agent.

## Safety Rules

These apply to every Chrome MCP interaction. Non-negotiable.

### Never click destructive actions
- **NEVER** click: Delete, Remove, Archive, Deactivate, Disable, Unsubscribe, Cancel Account
- **NEVER** click: Submit, Send, Publish, Post, Confirm (on real forms with real data)
- **DO** click: Edit, Add, New, Create -- to see forms, then Cancel/Escape/X to close
- **DO** click: all tabs, accordions, filters, sorts, navigation elements
- Screenshot destructive button labels in context, but do not activate them

### Never modify site state
- Do not fill forms with real data
- Do not toggle production settings
- Do not change user preferences
- If you accidentally trigger a state change, note it in the report and alert the user

## Auth Wall Detection

Client sites often have authentication. Detect and handle gracefully.

### Signs of an auth wall
- Login form visible (password field, "Sign in" button)
- URL redirected to `/login`, `/auth`, `/sso`, or a third-party auth domain
- 401/403 HTTP status (check via `list_network_requests`)
- "Access denied" or "Please log in" text on page

### Protocol when detected
1. **Stop all automated actions**
2. Tell the user: "This page requires authentication. Please log in manually in the Chrome MCP browser, then tell me to continue."
3. Wait for user confirmation
4. Re-navigate to the target page and verify authentication succeeded
5. Resume the skill workflow

## Session Expiry Handling

SaaS apps timeout after 1-2 hours of active use.

### Detection
At the start of each new section, run a quick check:
```js
() => {
  const loggedIn = document.querySelector('[class*="avatar"], [class*="user-menu"], [class*="profile"]');
  const loginForm = document.querySelector('[type="password"], [class*="login"], [class*="sign-in"]');
  return { authenticated: !!loggedIn && !loginForm, url: window.location.href };
}
```

If `authenticated: false` --> **STOP. Prompt for manual re-login.**

### Prevention
- Work through sections efficiently -- don't leave long gaps between navigations
- Note the login URL and auth method at the start so re-login is fast

## Viewport Management

Standard viewports for responsive checks:

| Name | Width | Height | When to use |
|------|-------|--------|-------------|
| Desktop | 1440 | 900 | Default. Always capture at this size first. |
| Tablet | 768 | 1024 | Responsive check. Use `resize_page`. |
| Mobile | 375 | 812 | Responsive check. Use `resize_page`. |

**Always reset to desktop (1440x900) before moving to the next page.**

For full device emulation (touch events, user agent):
```
emulate: { viewport: "768x1024x2,mobile,touch" }   # Tablet
emulate: { viewport: "375x812x3,mobile,touch" }     # Mobile
emulate: { viewport: "1440x900x1" }                  # Reset
```

Use `resize_page` for quick layout checks. Use `emulate` when the site serves different content based on device detection.

## SPA Handling

Single-page applications behave differently from traditional sites.

### Detection
- Few or no full page navigations in `list_network_requests`
- URL changes via hash (`/#/route`) or pushState without page reload
- Same HTML shell for different "pages"

### Nav discovery adjustments
- Hash routes (`/#/section`, `#/page`) are valid navigation -- don't skip them
- Run nav-discovery after the app has fully loaded (wait for spinners/loaders)
- Some SPAs lazy-load nav items -- scroll and interact before extracting nav

### Link checking in SPAs
- HTTP requests to SPA routes all return the same HTML shell -- can't detect broken routes via fetch
- Must actually navigate to each route in the browser and check for error states
- Look for: "404" text, "not found" components, error boundaries, empty content areas

## CSP Considerations

Sites with strict Content-Security-Policy may block injected scripts.

- `evaluate_script` (devtools) and `javascript_tool` (Claude in Chrome) both run outside page CSP in most cases
- Rare edge case: Trusted Types policies may reject string-to-function conversions
- If a script fails with a CSP error, fall back to snapshot-based analysis (read the a11y tree instead)
