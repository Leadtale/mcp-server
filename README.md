# @leadtale/mcp-server

Official [Model Context Protocol](https://modelcontextprotocol.io) server for [LeadTale](https://leadtale.com). Connect your AI tools to LeadTale's contact and company intelligence via stdio.

Works with **Claude Desktop**, **Cursor**, **Zed**, **Continue**, and any MCP client.

## What it does

Six task-oriented tools your AI assistant can call directly:

| Tool | What it does |
|------|-------------|
| `find_leads` | Search contacts by job title, seniority, industry, location, company, and more |
| `search_companies` | Search companies by industry, size, tech stack, location |
| `enrich_contacts` | Reveal email + phone numbers for contacts or an entire list (consumes credits) |
| `manage_list` | Create / add to / read / delete contact lists |
| `push_to_integration` | Push a list to a connected CRM / outreach tool |
| `get_account` | Check credit balance, plan, connected integrations, saved searches |

Every tool result includes credit-usage info so you always know what an action cost.

## Install

### Prerequisites

1. A LeadTale account — [sign up](https://leadtale.com/signup) if you don't have one.
2. An API key from **Settings → Developer → API Keys** in your LeadTale dashboard.
3. Node.js 20 or higher (Claude Desktop ships with its own Node — you don't need to install separately).

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "leadtale": {
      "command": "npx",
      "args": ["-y", "@leadtale/mcp-server"],
      "env": {
        "LEADTALE_API_KEY": "lt_live_..."
      }
    }
  }
}
```

Restart Claude Desktop. Then ask Claude:

> "Find marketing directors at B2B SaaS companies in San Francisco with 50-200 employees."

### Cursor

In **Settings → MCP → Add new global MCP server**:

```json
{
  "leadtale": {
    "command": "npx",
    "args": ["-y", "@leadtale/mcp-server"],
    "env": {
      "LEADTALE_API_KEY": "lt_live_..."
    }
  }
}
```

### Zed

Edit `settings.json`:

```json
{
  "context_servers": {
    "leadtale": {
      "command": {
        "path": "npx",
        "args": ["-y", "@leadtale/mcp-server"],
        "env": {
          "LEADTALE_API_KEY": "lt_live_..."
        }
      }
    }
  }
}
```

### Continue

In `config.json`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "@leadtale/mcp-server"],
          "env": {
            "LEADTALE_API_KEY": "lt_live_..."
          }
        }
      }
    ]
  }
}
```

## Configuration

| Env var | Required | Default | What |
|---------|----------|---------|------|
| `LEADTALE_API_KEY` | yes | — | Your API key from LeadTale → Settings → Developer |
| `LEADTALE_API_BASE` | no | `https://api.leadtale.com` | Override for local dev or staging |

## Credits

Some tools consume credits from your account:

- `enrich_contacts` — 1 credit per email reveal, 1 per phone reveal
- All other tools are free

Every tool response tells you how many credits you used and how many remain. Run `get_account` any time to check your balance.

## Example prompts

```
Find 20 VPs of Engineering at Series B SaaS companies in the US, then reveal their emails.
```

```
Build a list of companies in fintech with more than 100 employees that use Stripe.
Push it to my HubSpot connection.
```

```
Which of my saved searches had the most new matches this week?
```

## Troubleshooting

**"Invalid API key"** — Double-check the key in `LEADTALE_API_KEY` matches exactly what's in your dashboard. Test keys (`lt_test_...`) only work against test data.

**"Rate limit exceeded"** — LeadTale enforces per-plan rate limits. Wait a minute and retry, or upgrade your plan at [leadtale.com/pricing](https://leadtale.com/pricing).

**No tools showing up in Claude Desktop** — Quit Claude Desktop fully (menu bar → Quit, not just close the window) and reopen. Then check the logs at `~/Library/Logs/Claude/mcp*.log` for errors.

## Source

This server's source is public. Inspect it anytime at [github.com/Leadtale/mcp-server](https://github.com/Leadtale/mcp-server).

Bug reports and feature requests welcome in [Issues](https://github.com/Leadtale/mcp-server/issues).

## License

MIT — see [LICENSE](./LICENSE).
