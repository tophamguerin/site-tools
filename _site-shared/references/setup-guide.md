# Site Tools Setup Guide

Gets you running `/site-qa`, `/site-archive`, `/site-docs`, `/site-chaos`, `/site-geo` and
`/site-performance`.

## What each skill needs

| Skill | Browser |
|-------|---------|
| site-qa, site-archive, site-docs, site-chaos, site-geo | **Claude in Chrome** extension only |
| site-performance | chrome-devtools MCP (Lighthouse, traces, CPU/network emulation) |
| site-archive full-page captures | chrome-devtools MCP, optional (see site-archive) |

Most people only need Step 1.

## Step 1: Claude in Chrome (required)

1. Install the **Claude in Chrome** extension from the Chrome Web Store and sign in with your
   Claude account.
2. In the extension's settings, allow the sites you want to test (it asks per site).
3. In Claude Code, run `/chrome` and check the extension shows as connected.
4. Log in to the site under test in that same Chrome yourself. The skills drive your real browser,
   so they use your existing sessions (including Cloudflare Access). They never type passwords.

**Check it works:** ask Claude "open example.com in Chrome and tell me the page title".

## Step 2: chrome-devtools MCP (performance only)

Needed for `/site-performance` (Lighthouse, performance traces, CPU and network throttling,
device emulation) and optional full-page screenshots in `/site-archive`. It launches its own
automation Chrome profile, so it has none of your logins.

Add to `~/.claude/settings.json` (or `settings.local.json`):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

Restart Claude Code after adding it.

## Step 3: Get the skills

```bash
git clone https://github.com/tophamguerin/claude-config.git ~/GitHub/claude-config
ln -s ~/GitHub/claude-config/skills ~/.claude/skills
```

If `~/.claude/skills` already points at claude-config, `git pull` is enough. Start a new session
and type `/site-qa`: if the skill loads, you're set.

## Troubleshooting

**Claude in Chrome tools missing, or "extension not connected"**
- Is Chrome open with the extension signed in? Run `/chrome` to reconnect.
- Several machines connected: Claude will ask which browser to use.

**A command hangs or every browser call fails after a click**
- A native `alert`/`confirm`/`prompt` dialog is open in the tab. Dismiss it by hand, then continue.
  The skills stub native dialogs before risky clicks to avoid this.

**"Permission denied" for a site**
- Allow the domain in the extension's site permissions.

**chrome-devtools: "browser is already running" / pages don't load**
- It collides with a running automation profile. Close other devtools-driven Chrome windows and retry.
- Its profile has no logins: staging behind Cloudflare Access will show the Access wall.

**Scripts fail with "Refused to evaluate"**
- Strict Content-Security-Policy or Trusted Types. Fall back to `find` / `read_page`.

**Skills not in the / menu**
- `ls -la ~/.claude/skills/site-qa/SKILL.md` should resolve. Restart Claude Code.
