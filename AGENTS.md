# AGENTS.md

Guidance for agents working in this repository.

## Project Overview

| Property | Value |
|----------|-------|
| **Type** | OpenCode plugin (orchestrator harness with Solo Leveling orchestrator theme) |
| **Runtime** | `tsx` for .ts files |
| **Language** | TypeScript (strict mode) |
| **Package Manager** | pnpm |

## Agents Rules/Skills

Load these rules/skills based on context:

| Name | When to Use |
|-------|-------------|
| `typescript-naming-convention` | Creating or modifying TypeScript naming |
| `analyze-code-commenter` | Editing, refactoring, implementing code or comments |

## Commands

```bash
# Type check TypeScript (validation only, no build output)
pnpm run typecheck

# Build (outputs to dist/)
pnpm run build
```

> **Note:** When validating TypeScript types, only run `pnpm run typecheck`. No need to run `pnpm run build`.

## Plugin Rules

1. **MUST export only `default`** - `src/index.ts` must export ONLY the default async function (OpenCode calls all exports as plugin functions)
2. **Use FakeBun APIs** - Config loading uses `FakeBun.file()`

## Configuration

- **Config file**: `opencode-arise.json`
- **Search paths** (local takes precedence):
  1. `./.opencode/opencode-arise.json`
  2. `~/.config/opencode/opencode-arise.json`
- **Validation**: Zod schema with `AriseConfigSchema.safeParse()`

## Architecture

```
agents/     - Shadow agents (monarch, beru, igris, bellion, tusk, tank, shadow-sovereign)
hooks/      - Lifecycle hooks (arise-banner, output-shaper, compaction-preserver, todo-enforcer)
tools/      - Custom tools (call-arise-agent, background tasks)
config/     - Schema and path utilities
```
