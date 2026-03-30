# Site Tools Setup Guide

This guide gets you running `/site-archive`, `/site-clone`, `/site-docs`, `/site-qa`, `/site-performance`, and `/site-geo`.

## Prerequisites

1. **Claude Code** installed and authenticated
2. **Chrome browser** installed on your machine
3. **Git** access to `tophamguerin/claude-config`

## Step 1: Install the Chrome MCP Server

The site tools use the Chrome DevTools MCP server to control a browser.

### Option A: Via Claude Code settings UI
1. Open Claude Code
2. Go to Settings > Extensions > MCP Servers
3. Add the `chrome-devtools` server
4. Follow the prompts to configure

### Option B: Manual configuration
Add to your `~/.claude/settings.json` (or `settings.local.json`):

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

### Verify it works
1. Start a new Claude Code conversation
2. Type: "List open Chrome pages"
3. If Chrome MCP is connected, you'll see a list of open tabs
4. If it fails, see Troubleshooting below

## Step 2: Clone the claude-config repo

```bash
git clone https://github.com/tophamguerin/claude-config.git ~/GitHub/claude-config
```

## Step 3: Symlink to your Claude Code config

```bash
# Back up existing config if needed
# ln -s creates symlinks -- if these dirs already exist as symlinks, this will fail (expected for existing users)

ln -s ~/GitHub/claude-config/skills ~/.claude/skills
ln -s ~/GitHub/claude-config/agents ~/.claude/agents
ln -s ~/GitHub/claude-config/hooks ~/.claude/hooks
ln -s ~/GitHub/claude-config/scripts ~/.claude/scripts
ln -s ~/GitHub/claude-config/commands ~/.claude/commands
```

If you already have these symlinks (existing claude-config user), just `git pull` to get the latest skills.

## Step 4: Verify

Start a new Claude Code session and type `/site-qa`. If the skill loads, you're set.

## Troubleshooting

### "navigate_page tool is not available"
Chrome MCP server is not connected. Check:
- Is Chrome browser running? Some MCP servers need Chrome open.
- Did you add the MCP server config to settings.json?
- Restart Claude Code after adding MCP config.

### Chrome MCP connects but pages don't load
- Check if Chrome is blocking the DevTools connection (only one DevTools client can connect at a time)
- Close any open Chrome DevTools panels
- Try restarting Chrome

### Scripts fail with "Refused to evaluate" errors
- The site has a strict Content-Security-Policy
- This is rare with the DevTools Protocol but can happen
- The skill will fall back to snapshot-based analysis

### Skills not showing in /slash menu
- Check that `~/.claude/skills` symlink points to `~/GitHub/claude-config/skills`
- Run `ls -la ~/.claude/skills/site-qa/SKILL.md` -- file should exist
- Restart Claude Code to reload skills

### Permission prompts for Chrome MCP tools
- Claude Code may ask permission the first time you use Chrome MCP tools
- Approve them -- they're needed for all site-* skills
- You can add permissions to settings.json to avoid repeated prompts
