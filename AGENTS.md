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

## Testing Guidelines

- **僅限新建立的測試** - 不需要更動舊有測試的描述
- **測試描述語言**：
  - 如果測試描述足夠簡短，可以使用雙語（中文 + 英文）
  - 否則請使用英文
- **範例**：
  ```typescript
  // ✅ 簡短描述可使用雙語
  test("monarch is primary mode") { ... }

  // ✅ 複雜描述使用英文
  test("should correctly handle nested configuration merging with environment overrides") { ... }

  // ✅ 舊有測試保持原樣
  test("has all expected shadows") { ... }
  ```

### 測試路徑管理 / Test Path Management

使用 `__root.ts` 定義的路徑常數，**禁止使用 `../../../` 相對路徑**。

```typescript
import { __TEST_TEMP } from "../../__root";

// ✅ 正確 - 永遠在 __TEST_TEMP 下建立子資料夾
const TEST_DIR = join(__TEST_TEMP, "module-name");

// ❌ 錯誤 - 直接操作 __TEST_TEMP 根目錄
const TEST_DIR = __TEST_TEMP;

// ❌ 錯誤 - 使用深層相對路徑
const TEST_DIR = resolve(__dirname, "../../../test-temp");
```

**目錄結構：**
```
test/
├── fixtures/                 ← 測試資料夾（唯讀），使用 __TEST_FIXTURES
│   └── ...
└── temp/                    ← 臨時檔案（可寫），使用 __TEST_TEMP
    ├── fake-bun/            ← bun-shim.test.ts
    ├── temp-paths/          ← paths.test.ts
    └── ...                  ← 未來其他測試
```

**原則：**
1. `__TEST_TEMP` 只作為父目錄，**永遠建立子資料夾**
2. 子資料夾命名與測試模組名稱對應
3. 每個測試模組使用獨立的子資料夾，隔離性更好

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

4. **Do NOT create re-exports**
   - Unless explicitly requested by the user
   - Avoid adding barrel exports (e.g., `export * from './module'`)
   - Import directly from the source module when needed

## Architecture

```
agents/     - Shadow agents (monarch, beru, igris, bellion, tusk, tank, shadow-sovereign)
hooks/      - Lifecycle hooks (arise-banner, output-shaper, compaction-preserver, todo-enforcer)
tools/      - Custom tools (call-arise-agent, background tasks)
config/     - Schema and path utilities
types/      - TypeScript type definitions
```

## Skills/Rules to Load

| Skill/Rules | When to Use                                              |
|-------|----------------------------------------------------------|
| `js-git-friendly-coding-style` | JavaScript code style optimized for Git diff readability |
| `typescript-naming-convention` | Creating or modifying TypeScript naming                  |
| `analyze-code-commenter` | Editing, refactoring, implementing code or comment       |
| `typescript-unimplemented-handler` | TypeScript type system limitations                       |
| `test-file-best-practices` | Creating, Editing, refactoring test                   |

---

## Comment Update Rules (防止註解更新錯誤)

### 規則 1：保留原始錯誤資訊

當程式碼包含錯誤碼、錯誤訊息等原始技術資訊時，**只添加翻譯，不刪除**。

```typescript
// ✅ 正確 - 保留原始錯誤碼和訊息
/**
 * 工具建立函式（避免 TypeScript 推導錯誤）
 * Tool creation function (avoids TypeScript inference errors)
 *
 * > error TS2742: 原始錯誤訊息 (保留不刪)
 */

// ❌ 錯誤 - 刪除原始錯誤資訊
/**
 * 工具建立函式
 * Tool creation function
 */
```

### 規則 2：Issue 連結必須驗證相關性

新增 Issue/文件連結前，必須確認內容確實相關。

```
新增條件：
1. 已閱讀 Issue 內容
2. 確認與程式碼問題有直接關聯
3. 無法確認時 → 不新增，或標註「可能相關，未驗證」
```

### 規則 3：錯誤訊息的價值

| 資訊類型 | 價值 |
|----------|------|
| 錯誤碼 (`TS2742`) | 可搜尋、可引用 |
| 完整路徑 (`.pnpm/zod@4.1.8/...`) | 有助於定位問題 |
| 錯誤描述 | 社群已知問題的驗證 |

**這些都不應被視為「冗餘」而刪除。**

### 規則 4：註解更新檢查清單

每次更新他人註解前，確認：

- [ ] 原始註解的技術資訊是否保留？（錯誤碼、版本號、檔案路徑等）
- [ ] 新增的連結是否已驗證相關性？
- [ ] 新增內容是否真的與原文相關？
