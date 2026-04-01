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
>
> **AGENTS 執行測試規則：** AGENTS 在執行測試時，應使用 `pnpm run test:agent` 替代 `pnpm run test`。
> **Agent test execution rule:** When running tests, agents should use `pnpm run test:agent` instead of `pnpm run test`.

```bash
# Install dependencies
pnpm install

# Type check TypeScript (validation only, no build output)
pnpm run typecheck

# Build (outputs to dist/)
pnpm run build

# Run all tests (for agents)
pnpm run test:agent
# Run all tests (for humans)
pnpm run test

# Run a single test file
pnpm test -- <test-file-path>
pnpm run test:agent -- <test-file-path>
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

### JavaScript Git-Friendly Code Style

**用途**：減少 Git 差異中的視覺雜訊，提升程式碼合併時的可讀性與安全性。

**載入方式**：使用 `skill` 工具載入 `js-git-friendly-coding-style`

**使用時機**：
| 情況 | 處理方式 |
|------|----------|
| **創建新檔案** | 載入此 skill 並套用風格 |
| **用戶明確要求** | 載入此 skill 並套用風格 |
| **修改他人代碼** | 保持原有格式，不套用此風格 |
| **用戶未指定風格** | 保持原檔案格式一致性 |

**核心原則**：
- 最小化無關變更（不增加原本沒有的 `{` 或 `;`）
- 清晰的邊界識別（大括號換行）
- 一致的縮排（使用 Tab，除非原為空格）

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
   - Unless explicitly requested by the user or explicitly allowed
   - Avoid adding barrel exports (e.g., `export * from './module'`)
   - Import directly from the source module when needed
   - This rule applies to ALL files, not just `src/index.ts`
   - **禁止任何情況下的 re-export**（包含向後相容性，重構時更新引用路徑），除非使用者明確要求 re-export

### ⚠️ 重新匯出必須徵求同意

**進行任何重新匯出前，必須先徵求使用者同意。**

即使看起來像是合理的解決方案，也不能自行決定添加 re-export。必須先詢問使用者，例如：

```
我發現需要使用 createDefaultConfig，但目前沒有從 schema.ts 匯出。
選項 A：直接在 io.ts 等檔案中從 ../types/config-defaults 匯入（不允許重新匯出）
選項 B：在 schema.ts 中新增重新匯出

請問您希望採用哪個方案？或者有其他建議？
```

### 處理 TS2459 匯入錯誤

當遇到 `Module '"./module"' declares 'X' locally, but it is not exported` 錯誤時：

**決策流程：**
```
遇到 TS2459 錯誤
    │
    ▼
搜尋 'X' 的原始匯出位置 (使用 grep)
    │
    ▼
直接從該位置匯入，而非透過中介模組
    │
    ▼
驗證 typecheck 通過
```

**錯誤示範：**
```typescript
// ❌ 錯誤：嘗試透過重新匯出解決問題
// schema.ts
export { createDefaultConfig } from "../types/config-defaults";

// io.ts (依然會失敗)
import { createDefaultConfig } from "./schema";
```

**正確做法：**
```typescript
// ✅ 正確：直接從原始模組匯入
// io.ts
import { createDefaultConfig } from "../types/config-defaults";
```

## Architecture

```
agents/     - Shadow agents (monarch, beru, igris, bellion, tusk, tank, shadow-sovereign)
hooks/      - Lifecycle hooks (arise-banner, output-shaper, compaction-preserver, todo-enforcer)
tools/      - Custom tools (call-arise-agent, background tasks)
config/     - Schema and path utilities
types/      - TypeScript type definitions
```

## Shadow Summoning Methods

四種召喚方式的行為差異、架構洞察、以及使用時的注意事項。

See [docs/shadow-summoning-methods.md](./docs/shadow-summoning-methods.md) for:
- `arise_summon` vs `arise_background` 的差異
- 兩套追蹤系統（Session vs Task）的架構斷裂
- 結果取回能力的對比
- 提示詞注意事項

**⚠️ 修改召喚行為時，必須同時更新 `src/agents/shadows.ts`（Agent 行為的 source of truth）和 `docs/shadow-summoning-methods.md`（人類參考文件）。**

## Translation Rules / 翻譯規定

See [docs/TRANSLATION_RULES.md](./docs/TRANSLATION_RULES.md) for the complete translation rules.

---

## Skills/Rules to Load

| Skill/Rules | When to Use                                              |
|-------|----------------------------------------------------------|
| `js-git-friendly-coding-style` | JavaScript code style optimized for Git diff readability |
| `typescript-naming-convention` | Creating or modifying TypeScript naming                  |
| `analyze-code-commenter` | Editing, refactoring, implementing code or comment       |
| `typescript-unimplemented-handler` | TypeScript type system limitations                       |
| `test-file-best-practices` | 測試檔案最佳實踐規範。測試位置、命名、快照、fixtures、臨時檔案管理 |
| `test-snapshot-documentation` | 利用測試快照進行文件化、範例展示、行為展示 |
| `zod-syntax-order` (docs/rules/zod-syntax-order.md) | Zod Schema 方法鏈結順序（`.meta` → `.default` → `.optional`） |

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

### 規則 5：JSDoc 與邏輯區塊的職責分離（防止資訊冗餘）

**核心原則：** JSDoc 描述「契約/意圖」，邏輯區塊描述「實作細節」，兩者不重複。

| 位置 | 應包含 | 不應包含 |
|------|--------|----------|
| **JSDoc** | 函式用途、設計邏輯、為什麼這樣設計 | 具體如何實現、程式碼語法細節 |
| **邏輯區塊** | 具體實作邏輯、技術細節（as any、運算子等） | 為什麼要這樣設計 |

**錯誤示範（資訊冗餘）：**
```typescript
/**
 * 處理資料（錯誤：將實作細節放在 JSDoc）
 * Process data (wrong: implementation details in JSDoc)
 *
 * 使用短路運算實現：(condition && value) || default  ← ❌ 冗餘
 */
function process(result) {
  // 短路運算：(condition && value) || default  ← ✅ 正確位置
  return condition && value || [];
}
```

**正確範例：**
```typescript
/**
 * 從結果中取得舊版插件名稱
 * Get legacy plugin names from result
 *
 * 邏輯說明：
 * 1. 首先檢查 LEGACY_PLUGIN_NAME 是否與 PLUGIN_NAME 不同
 * 2. 只有當兩者不同時，才有意義區分「舊版插件」
 */
function getLegacyPluginNamesFromResult(result) {
  /**
   * 條件判斷：確保新舊插件名稱確實不同
   *
   * 使用 `as any` 繞過 TypeScript 推導
   *
   * 短路運算實現：(condition && value) || default
   * - 當 condition 為 true，回傳 value
   * - 當 condition 為 false，回傳 []
   */
  return (LEGACY_PLUGIN_NAME !== PLUGIN_NAME as any) && result[LEGACY_PLUGIN_NAME] || [];
}
```

**檢查清單：**
- [ ] JSDoc 中是否包含「如何實現」的語法細節？（如短路運算、as any）
- [ ] 邏輯區塊內的註解是否僅描述「實作」，而非重複「設計意圖」？
- [ ] 同一份資訊是否只出現一次？

### 規則 6：JSDoc 避免意思重複的描述

不需要「標題 + 與標題相同意思的描述」，兩段意思相同的註解只保留一組完整的描述即可。

**❌ 錯誤（意思重複）：**
```typescript
/**
 * 處理資料
 * Process data
 *
 * 此函數用於處理資料
 * This function is used to process data
 */
```
> 標題「處理資料」與描述「此函數用於處理資料」意思完全相同，屬於冗餘。

**✅ 正確（選擇一組完整的描述）：**
```typescript
/**
 * 此函數用於處理資料
 * This function is used to process data
 *
 * 設計邏輯：...
 */
```

**例外情況：**
當 JSDoc 需要包含多個獨立說明區塊時，可以使用簡短標題：

```typescript
/**
 * 工具函式集合
 * Utility functions collection
 *
 * 錯誤處理工具：
 * Error handling utilities:
 * ...
 *
 * 資料轉換工具：
 * Data transformation utilities:
 * ...
 */
