# AGENTS.md

Guidance for agents working in this repository.

## Project Overview

| Property | Value |
|----------|-------|
| **Type** | OpenCode plugin (orchestrator harness with Solo Leveling orchestrator theme) |
| **Runtime** | Bun |
| **Language** | TypeScript (strict mode) |
| **Package Manager** | pnpm |
| **Testing** | Bun |
| **Type Safety** | Zod validation |

## Commands

> **Note:** When validating TypeScript, only run `pnpm run typecheck`. No need to run `pnpm run build`.
> If you need to run tests, `pnpm test` already includes type checking, so no need to run typecheck separately.

```bash
# Install dependencies
pnpm install

# Type check TypeScript (validation only, no build output)
pnpm run typecheck

# Build (outputs to dist/)
pnpm run build

# Run all tests
pnpm run test

# Run a single test file
pnpm test -- <test-file-path>
# Example: pnpm test -- src/index.test.ts

# Run tests matching a pattern
pnpm test -- --testNamePattern="Shadow Agents"
pnpm test -- -t "has all expected"

# Clean build output
pnpm run clean

# Full publish workflow
pnpm run prepublishOnly
```

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled** - all strict flags are on
- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **Always use explicit types** for function parameters and return types
- **Use `import type`** for type-only imports to improve build performance

### Imports
```typescript
// ✅ Good - grouped by external, internal, relative
import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { AriseConfigSchema, DEFAULT_CONFIG } from "./config/schema";
import { getAriseConfigPaths } from "./config/paths";
import { cacheSessionModel } from "./config/model-cache";

// ✅ Good - local relative imports
import { FakeBun as Bun } from './utils/bun-shim';
import type { ShadowName } from "../config/schema";

// ❌ Avoid - mixing type and value imports
import { type PluginInput, someFunction } from "package";
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `getPollInterval`, `backgroundManager` |
| Types/Classes/Enums | PascalCase | `AriseConfig`, `EnumOpencodeAgentMode` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_POLL_INTERVAL` |
| Config properties | snake_case | `poll_interval`, `retry_delay_max` |
| Enum values | lowercase | `PRIMARY = "primary"`, `DENY = "deny"` |

### Error Handling
```typescript
// ✅ Good - empty catch for expected non-critical errors
try {
  await ctx.client.tui.showToast({ ... });
} catch {
  // TUI might not be available (non-interactive mode)
}

// ✅ Good - capture error message safely
.catch((err) => {
  task.error = err instanceof Error ? err.message : String(err);
});

// ✅ Good - use safeParse for validation
const result = AriseConfigSchema.safeParse(merged);
if (!result.success) {
  console.warn("[opencode-arise] Invalid config:", result.error.message);
  return DEFAULT_CONFIG;
}
```

### Type Definitions
```typescript
// ✅ Good - use Zod for runtime validation
export const ShadowName = z.enum(["monarch", "beru", "igris"]);
export type ShadowName = z.infer<typeof ShadowName>;

// ✅ Good - use interfaces for data structures
export interface BackgroundTask {
  id: string;
  status: "running" | "completed" | "error";
  error?: string;
}

// ✅ Good - use type for computed/mapped types
export type IShadowAgents = {
  [P in IAllShadowAgentsName]-?: IShadowAgent<P>;
};
```

### Comments (Bilingual)
```typescript
/**
 * 取得輪詢間隔的輔助函式
 * Helper function to get polling interval
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 輪詢間隔（毫秒）
 */
export function getPollInterval(config: AriseConfig, agentName?: ShadowName): number
```

**註釋放置位置原則：**
- 如果代碼基於特定理由/邏輯，應將邏輯註釋寫入代碼中（邏輯區塊內）
- 除非邏輯對呼叫者有幫助，否則邏輯的註釋應在邏輯區塊內，而不是在函式文檔裡
- 把註釋放在代碼邏輯附近，而不是放在 JSDoc 註釋裡

```typescript
// ✅ Good - 註釋放在邏輯附近
if (task.retryCount > 0) {
  // 遞增量 = retryCount * increment，但最多不超過 maxDelay
  const additionalDelay = Math.min(task.retryCount * increment, maxDelay);
  interval = baseInterval + additionalDelay;
}

// ❌ Bad - 註釋放在 JSDoc 而非邏輯附近
/**
 * @param retryCount - 重試次數
 */
async function poll(retryCount: number) {
  const delay = Math.min(retryCount * 1000, 5000); // 為什麼用 1000 和 5000？
}
```

### File Structure
```
src/
├── agents/        # Shadow agent definitions
├── config/        # Schema and path utilities
├── hooks/          # Lifecycle hooks
├── tools/         # Custom tools
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── index.ts        # Main entry (MUST export default only)
└── *.test.ts       # Test files (co-located with source)
```

## Plugin Rules (CRITICAL)

1. **MUST export ONLY `default`** from `src/index.ts`
   - OpenCode calls ALL exports as plugin functions
   - Type exports are fine: `export type { AriseConfig }`
   - Never export non-type values besides default

2. **Use FakeBun APIs** for file operations
   - Config loading uses `FakeBun.file()` not native fs
   - This ensures compatibility with OpenCode's sandboxed environment

3. **Configuration file**: `opencode-arise.json`
   - Search paths (local takes precedence):
     1. `./.opencode/opencode-arise.json`
     2. `~/.config/opencode/opencode-arise.json`
   - Validated with Zod schema

## Architecture

```
agents/     - Shadow agents (monarch, beru, igris, bellion, tusk, tank, shadow-sovereign)
hooks/      - Lifecycle hooks (arise-banner, output-shaper, compaction-preserver, todo-enforcer)
tools/      - Custom tools (call-arise-agent, background tasks)
config/     - Schema and path utilities
types/      - TypeScript type definitions
```

## Skills to Load

| Skill | When to Use                                              |
|-------|----------------------------------------------------------|
| `js-git-friendly-coding-style` | JavaScript code style optimized for Git diff readability |
| `typescript-naming-convention` | Creating or modifying TypeScript naming                  |
| `analyze-code-commenter` | Editing, refactoring, implementing code or comment       |
| `typescript-unimplemented-handler` | TypeScript type system limitations                       |
