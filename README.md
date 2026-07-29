# opencode-legion

> ⚔️ **ARISE!** A Shadow Slave themed orchestrator harness for OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, token-efficient orchestrator layer that extends [OpenCode](https://opencode.ai) with a legion of specialized Shadow Agents. Inspired by Shadow Slave.

## Features

- **Shadow Legion** - 8 specialized agents for different tasks
- **Smart Delegation** - Sunless orchestrates with minimal token usage
- **Parallel Execution** - Background tasks for concurrent exploration
- **Quality-Safe Output** - Never truncates errors or stack traces
- **Configurable** - Customize models, disable shadows, tweak behavior

## Installation

```bash
opencode plugin @RukiV/opencode-legion
```

This registers the plugin with OpenCode and creates a default config.

Or add manually to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": [
    "@RukiV/opencode-legion"
  ]
}
```

## Quick Start

After installation, just run OpenCode as usual:

```bash
opencode
```

You'll see the "ARISE!" banner, and **Sunless** becomes your default agent. Talk naturally — Sunless decides when to delegate to shadows.

```
You: "Find all React components using useState and add error boundaries"

Sunless: "I'll have Nightmare scout the codebase, then Saint implement the changes."
```

## Shadow Legion

| Shadow | Role | Best For |
|--------|------|----------|
| ☀️ **sunless** | Lord of Shadows | Orchestration, delegation decisions |
| 🐜 **nightmare** | Shadow Scout | Fast codebase exploration, grep, file discovery |
| ⚔️ **saint** | Saint of the Legion | Precise implementation, code changes |
| 🎖️ **cassie** | Master Strategist | Strategic planning, architecture analysis |
| 🎨 **fiend** | UI Artificer | UI/UX, frontend, styling |
| 🛡️ **slayer** | Knowledge Seeker | External docs, web search, examples |
| 👁️ **weaver** | Fateweaver | Deep reasoning, complex debugging |
| 🎤 **kai** | Nightingale | Chat companion, charming conversation |

### Direct Summoning

You can bypass Sunless and summon shadows directly:

```
@nightmare find all TODO comments in src/

@cassie plan a migration from REST to GraphQL

@weaver why is this recursive function causing a stack overflow?
```

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                        USER                              │
│                          │                               │
│                          ▼                               │
│    ┌─────────────────────────────────────────────────┐  │
│    │              ☀️ SUNLESS                          │  │
│    │         (Lord of Shadows / Orchestrator)          │  │
│    │                                                  │  │
│    │     Assesses task → Delegates or handles        │  │
│    └──────────────────────┬──────────────────────────┘  │
│                           │                              │
│       ┌──────┬──────┬─────┼──────┬──────┬──────┐        │
│       ▼      ▼      ▼     ▼      ▼      ▼      ▼        │
│      🐎     ⚔️     🔮    🎨     📚     👁️     🎤     │
│   NIGHT-  SAINT  CASSIE FIEND  SLAYER WEAVER   KAI    │
│   MARE                                                     │
│   scout  imple-  plan   UI    search reason  chat       │
│          ment                                           │
└─────────────────────────────────────────────────────────┘
```

**Sunless's Principles:**
1. Assess intent before acting — don't over-delegate
2. Handle trivial tasks directly
3. Use parallel background tasks for exploration
4. Only summon weaver for complex problems
5. Verify changes work before declaring done

## Custom Tools

The plugin provides these tools to Sunless:

| Tool | Description |
|------|-------------|
| `arise_summon` | Invoke a shadow (sync or background) |
| `arise_background` | Launch parallel background task |
| `arise_background_output` | Get result from background task |
| `arise_background_status` | List all background tasks |
| `arise_background_cancel` | Cancel a running task |

## Hooks

| Hook | Description |
|------|-------------|
| `arise-banner` | Shows "ARISE!" toast on session start |
| `output-shaper` | Quality-safe output truncation (preserves errors) |
| `compaction-preserver` | Preserves critical context during session compaction |
| `todo-enforcer` | Reminds about incomplete TODOs on session idle |

## Configuration

Create `~/.config/opencode/opencode-legion.json`:

```json
{
  "show_banner": true,
  "disabled_shadows": [],
  "disabled_hooks": [],
  "agents": {
    "sunless": {
      "model": "opencode/big-pickle"
    },
    "nightmare": {
      "model": "opencode/big-pickle"
    },
    "saint": {
      "model": "opencode/deepseek-v4-flash-free"
    },
    "cassie": {
      "model": "opencode/mimo-v2.5-free"
    },
    "fiend": {
      "model": "opencode/mimo-v2.5-free"
    },
    "slayer": {
      "model": "opencode/big-pickle"
    },
    "weaver": {
      "model": "opencode/big-pickle"
    },
    "kai": {
      "model": "opencode/big-pickle"
    }
  },
  "output_shaping": {
    "max_chars": 12000,
    "preserve_errors": true
  },
  "compaction": {
    "threshold_percent": 80,
    "preserve_todos": true
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `show_banner` | boolean | `true` | Show "ARISE!" toast on session start |
| `banner_every_session` | boolean | `false` | Show banner for every session (not just first) |
| `disabled_shadows` | string[] | `[]` | Shadows to disable (e.g., `["fiend", "slayer"]`) |
| `disabled_hooks` | string[] | `[]` | Hooks to disable |
| `agents.<name>.model` | string | varies | Override model for a shadow |
| `agents.<name>.disabled` | boolean | `false` | Disable specific shadow |
| `output_shaping.max_chars` | number | `12000` | Max output length before truncation |
| `output_shaping.preserve_errors` | boolean | `true` | Never truncate error outputs |
| `compaction.threshold_percent` | number | `80` | Context threshold for compaction |
| `compaction.preserve_todos` | boolean | `true` | Keep TODOs during compaction |

### Project-Level Config

You can also create `.opencode/opencode-legion.json` in your project root. Project config merges with (and overrides) global config.

## Default Models

| Shadow | Default Model |
|--------|---------------|
| sunless | `opencode/big-pickle` |
| nightmare | `opencode/big-pickle` |
| saint | `opencode/deepseek-v4-flash-free` |
| cassie | `opencode/mimo-v2.5-free` |
| fiend | `opencode/mimo-v2.5-free` |
| slayer | `opencode/big-pickle` |
| weaver | `opencode/big-pickle` |
| kai | `opencode/big-pickle` |

## Examples

### Parallel Codebase Exploration

```
You: "I need to understand how authentication works and find security best practices"

Sunless: *launches nightmare (codebase) and slayer (research) in background*
         "Nightmare is exploring the auth implementation while Slayer researches
          security best practices. I'll compile their findings."
```

### Complex Refactoring

```
You: "Refactor the payment module to use the new Stripe API"

Sunless: "This requires planning. Let me consult Cassie first."

Cassie: *analyzes codebase, creates migration plan*

Sunless: "Cassie's plan looks good. Saint will implement it step by step."

Saint: *implements changes, runs tests after each step*
```

### Deep Debugging

```
You: "This async function is causing race conditions but I can't figure out why"

Sunless: "This needs deep analysis. Summoning Weaver."

Weaver: *deep reasoning analysis*
       "The issue is a closure capturing a stale reference..."
```

## Uninstall

Remove from OpenCode config:

```bash
# Edit ~/.config/opencode/opencode.jsonc
# Remove "@RukiV/opencode-legion" from the "plugin" array
```

Or manually:

```bash
# Remove config
rm ~/.config/opencode/opencode-legion.json
```

## Requirements

- [OpenCode](https://opencode.ai) CLI installed
- [Bun](https://bun.sh) runtime (v1.0.0+)

## Philosophy

- **Minimal sufficient delegation** — Don't over-delegate simple tasks
- **Parallel exploration** — Use background tasks for concurrent scouting
- **Quality-safe truncation** — Never lose errors, tracebacks, or critical output
- **Token efficiency** — Lean prompts, smart delegation patterns

## Contributing

Contributions are welcome! Please read the contributing guidelines first.

```bash
# Clone the repo
git clone https://github.com/RukiV/opencode-legion.git
cd opencode-legion

# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build
```

## License

[MIT](LICENSE) © RukiV

---

<p align="center">
  <i>"Even a shadow can grow long enough to cover the sun."</i><br>
  — Sunless
</p>
