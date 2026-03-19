# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

- **Type**: OpenCode plugin (orchestrator harness with Solo Leveling theme)
- **Runtime**: Bun (but execute .ts files with `tsx` per project rules)
- **Language**: TypeScript with strict mode

## Build & Test Commands

```bash
# Build (outputs to dist/)
tsx src/index.ts --help  # CLI help (if needed)

# Run tests (uses bun:test framework, but execute with tsx)
tsx node_modules/bun/test/bun-test-wrapper.ts  # Or run individual test files

# Type check
tsx -e "import('typescript').then(t => t.createProgram(['src/**/*.ts'], {noEmit:true, strict:true}))"
```

## Critical Plugin Rules

1. **MUST export only `default`** - OpenCode calls all exports as plugin functions, so `src/index.ts` must export ONLY the default async function
2. **Uses Bun APIs** - Code uses `Bun.file()` for config loading (runtime dependency)

## Configuration

- Config file: `opencode-arise.json`
- Search paths (local takes precedence):
  1. `./.opencode/opencode-arise.json` (local)
  2. `~/.config/opencode/opencode-arise.json` (global)
- Uses Zod schema validation with `AriseConfigSchema.safeParse()`

## Architecture

- **agents/**: Shadow agents (monarch, beru, igris, bellion, tusk, tank, shadow-sovereign)
- **hooks/**: Lifecycle hooks (arise-banner, output-shaper, compaction-preserver, todo-enforcer)
- **tools/**: Custom tools (call-arise-agent, background tasks)
- **config/**: Schema and path utilities
