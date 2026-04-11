# 建立新工具的開發工作流程
# New Tool Development Workflow

本文件記錄在 opencode-arise 插件中建立新工具的完整流程、常見問題與推薦做法。
This document records the complete workflow, common issues, and recommended practices for creating new tools in the opencode-arise plugin.

---

## 目錄結構

建立一個新工具涉及以下檔案：

```
src/
├── types/enums.ts                          ← 1. 新增枚舉值
├── agents/shadows.ts                       ← 2. 新增工具描述與 Zod schema
├── config/schema/entry.ts                   ← 2b.（選用）抽離 Zod schema 常數
├── utils/<tool-name>.ts                    ← 3. 核心邏輯（推薦獨立於 opencode）
├── tools/<tool-name>.ts                    ← 4. OpenCode 工具包裝層
├── tools/index.ts                          ← 5. 註冊工具
├── hooks/                                   # Lifecycle Hooks（視需）
│    │   ├── arsie-banner.ts             # 橫幅顯示 Hook
│    ├── compaction-preserver.ts         # 對話壓縮保留 Hook
│    ├── output-shaper.ts                # 輸出格式化 Hook
│    └── todo-enforcer.ts                # TODO 強制執行 Hook
├── tests/                                  # 測試輔助目錄（Decoupled 模式）
│   ├── temp/                             # 臨時測試檔案
│   ├── issues/                           # Issues 相關測試
│   ├── lib/                              # 測試輔助庫（Mock 環境）
│   ├── fixtures/                         # 測試資料集（集中管理）
│   └── scripts/                          # 測試腳本（資料生成/環境準備）
test/temp/<tool-name>-standalone.ts           ← 6. 獨立執行驗證（選用）
```

---

## 步驟 1：新增枚舉值

**檔案：** `src/types/enums.ts`

在 `EnumAriseTools` 中新增工具名稱，並加入 `ALL_ARISE_TOOLS` 陣列。

```typescript
export enum EnumAriseTools {
  // ... 現有工具
  /** 一次性取得 Git 狀態摘要 / Get Git status summary in one shot */
  ARISE_GIT_SUMMARY = "arise_git_summary",
}

export const ALL_ARISE_TOOLS = [
  // ... 現有工具
  EnumAriseTools.ARISE_GIT_SUMMARY,
] as const satisfies EnumAriseTools[];
```

### 命名規範

| 項目 | 格式 | 範例 |
|--|--|--|
| 枚舉名 | `ARISE_{功能}` | `ARISE_GIT_SUMMARY` |
| 枚舉值 | `arise_{功能}` | `arise_git_summary` |

---

## 步驟 2：新增工具描述與 Schema

**檔案：** `src/agents/shadows.ts` → `ARISE_TOOLS` 物件

在 `ARISE_TOOLS` 中新增工具的描述和 Zod 參數 schema。

```typescript
[EnumAriseTools.ARISE_GIT_SUMMARY]: {
  description: `Get a Git repository status summary...` as const,
  shortDescription: "Get Git status summary (status + diff stat + recent log)" as const,

  args: {
    log_count: z
      .number()
      .describe("顯示近期 commit 數量 / Number of recent commits to show (default: 5)")
      .optional()
      .default(5),
    diff_stat: z
      .boolean()
      .describe("是否包含 diff --stat / Include diff --stat output (default: true)")
      .optional()
      .default(true),
  },
},
```

### 重要規則

- **`description` 的第一行應與 `shortDescription` 一致** — `getAriseToolsConfigEntry` 在 `description` 缺失時會 fallback 到 `shortDescription`
- **`as const`** — description 和 shortDescription 使用 `as const` 以保留字面量類型
- **Zod schema 規範** — 鏈結順序、語言規範等，參見 `docs/rules/zod-syntax-order.md`

---

### 從 Zod schema 推導 TypeScript 型別

當工具的選項型別需要在多處使用（如核心邏輯、測試），可從 Zod schema 推導，避免重複定義。

**Approach 1：抽離命名常數（推薦用於獨立執行）**

將 Zod schema 抽離為獨立常數，在 `ARISE_TOOLS` 中引用。

```typescript
// src/config/schema/entry.ts — 單一 source of truth
export const GIT_SUMMARY_ARGS = {
  log_count: z.number().describe("...").optional().default(5),
  diff_stat: z.boolean().describe("...").optional().default(true),
} as const;

export type IGitSummaryOptions = z.input<z.ZodObject<typeof GIT_SUMMARY_ARGS>>;

// src/agents/shadows.ts — 引用常數
import { GIT_SUMMARY_ARGS } from '../config/schema/entry';

[EnumAriseTools.ARISE_GIT_SUMMARY]: {
  args: GIT_SUMMARY_ARGS,
},

// src/utils/git-summary.ts（核心邏輯）
import type { IGitSummaryOptions } from '../config/schema/entry';
```

| 優點 | 缺點 |
|------|------|
| 核心模組可輕量匯入（僅依賴 zod） | 需要額外的 schema 檔案 |
| 適合獨立執行驗證 | 設定分散在多個檔案 |
| 可跨工具共用 schema | 需要知道 schema 的定義位置 |

**Approach 2：直接從 ARISE_TOOLS 推導（推薦用於簡單設定）**

不抽離常數，直接從 `ARISE_TOOLS` 物件索引取得 `args` 來推導型別。

```typescript
// src/agents/shadows.ts — 設定全部留在 ARISE_TOOLS 內
[EnumAriseTools.ARISE_GIT_SUMMARY]: {
  args: {
    log_count: z.number().describe("...").optional().default(5),
    diff_stat: z.boolean().describe("...").optional().default(true),
  },
},

// 需要型別時，直接從 ARISE_TOOLS 推導
import { ARISE_TOOLS } from '../agents/shadows';
import { EnumAriseTools } from '../types/enums';

export type IGitSummaryOptions = z.input<z.ZodObject<
  typeof ARISE_TOOLS[typeof EnumAriseTools.ARISE_GIT_SUMMARY]['args']
>>;
```

| 優點 | 缺點 |
|------|------|
| **不需要額外抽離設定** | 核心模組需匯入 `shadows.ts`（拉入 opencode 依賴） |
| **設定全部留在 `ARISE_TOOLS`** | 不適合獨立執行驗證 |
| **直覺，不需要查看其他檔案** | 匯入路徑較長 |
| 當 args 簡單且不跨工具共用時更簡潔 | 複雜 schema 時可讀性較差 |

**選擇建議**

| 場景 | 推薦做法 |
|--|--|
| 核心邏輯需要獨立執行（不依賴 opencode） | Approach 1（抽離常數） |
| args 簡單，設定集中管理 | **Approach 2**（直接推導） |
| schema 需要跨工具共用 | Approach 1（抽離常數） |
| 不想多建立檔案，直覺為主 | **Approach 2**（直接推導） |

---

## 步驟 3：核心邏輯獨立化（推薦）

**檔案：** `src/utils/<tool-name>.ts`

將核心邏輯抽離為獨立模組，**不依賴 opencode 框架**，僅依賴：
- Node.js 內建模組（`child_process`、`fs`、`path` 等）
- TypeScript 型別定義

```typescript
import { execSync } from 'child_process';

/** 僅使用 interface 定義型別，不匯入 opencode */
export interface IGitSummaryOptions { ... }
export interface IGitSummaryResult { ... }

export function execCommand(command: string): string { ... }
export function getGitSummary(options?: IGitSummaryOptions): IGitSummaryResult { ... }
export function formatGitSummary(result: IGitSummaryResult): string { ... }
```

**為什麼要獨立化？**

| 優點 | 說明 |
|------|------|
| **可獨立執行** | 不需啟動 OpenCode 即可測試核心邏輯 |
| **可重用** | 其他專案或腳本可直接引用 |
| **可測試** | 測試時不需要 mock 整個 opencode 環境 |
| **清晰邊界** | 核心邏輯與框架整合邏輯分離 |

---

## 步驟 4：建立 OpenCode 工具包裝層

**檔案：** `src/tools/<tool-name>.ts`

**包裝層負責：**
1. 從 `ARISE_TOOLS` 取得描述和 schema
2. 呼叫核心邏輯
3. 使用 `formatAriseMsg*` 格式化輸出

```typescript
import { EnumAriseTools } from '../types/enums';
import { getAriseToolsConfigEntry } from '../agents/shadows';
import { tool2 } from '../types/types-opencode';
import { formatAriseMsgError, formatAriseMsgSuccess } from '../utils/string/arise-message';
import { getGitSummary, formatGitSummary } from '../utils/git-summary';

export function createGitSummaryTool()
{
  const { description, args } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_GIT_SUMMARY);

  return tool2({
    description,
    args,

    async execute(args) {
      try {
        const result = getGitSummary({
          log_count: args.log_count,
          diff_stat: args.diff_stat,
        });
        return formatAriseMsgSuccess(`Git Summary:\n\n${formatGitSummary(result)}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return formatAriseMsgError(`Failed to get git summary: ${msg}`);
      }
    },
  });
}
```

### `tool2` 與 `tool` 的差異

`tool2` 是為解決 TypeScript 推導錯誤（`TS2742`）而建立的包裝函式，簽名相同但避免了類型推導問題。**請一律使用 `tool2` 而非 `tool`。**

---

## 步驟 5：註冊工具

**檔案：** `src/tools/index.ts`

```typescript
import { createGitSummaryTool } from './arise-git-summary';

export function createPluginTools(ctx: PluginInput, backgroundManager: BackgroundManager, config: IAriseConfig): IAriseTools
{
  return {
    // ... 現有工具
    /** Git 狀態摘要工具 / Git status summary tool */
    [EnumAriseTools.ARISE_GIT_SUMMARY]: createGitSummaryTool(),
  } satisfies IAriseTools
}
```

### 檢查清單

- [ ] `EnumAriseTools` 新增枚舉值
- [ ] `ALL_ARISE_TOOLS` 陣列包含新枚舉
- [ ] `ARISE_TOOLS` 包含 `description`、`shortDescription`、`args`
- [ ] `src/tools/index.ts` 匯入並註冊新工具
- [ ] `pnpm run typecheck` 通過

---

## 步驟 6：獨立執行驗證（選用）

**檔案：** `test/temp/<tool-name>-standalone.ts`（或 `test/scripts/`）

**推薦用途：**
- 用於開發階段快速驗證核心邏輯
- 記錄複雜的參數調整過程（如演算法嘗試、參數組合探索）
- 需要審閱時的參考檔案

**不推薦用途：**
- 作為最終測試（應移至正式測試目錄）
- 長期保留但未分類的臨時檔案

**範例：**

```typescript
#!/usr/bin/env tsx

/**
 * 獨立驗證腳本：Git Summary 工具
 * 可直接執行 core logic，不需啟動 OpenCode
 */

import { getGitSummary, formatGitSummary } from '../../src/utils/git-summary';
import type { IGitSummaryOptions } from '../../src/utils/git-summary';

const options: IGitSummaryOptions = {
  log_count: 5,
  diff_stat: true,
};

try {
  const result = getGitSummary(options);
  console.log(formatGitSummary(result));
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
```

---

## 常見問題

### Q1：`@opencode-ai/plugin` 無法在獨立環境匯入

**錯誤訊息：**
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: No "exports" main defined in
D:\...\node_modules\@opencode-ai\plugin\package.json
```

**原因：** `@opencode-ai/plugin` 的 `package.json` 沒有定義完整的 `exports` 欄位，導致在非 OpenCode 環境下無法解析。

**解決方案：** 將核心邏輯抽離到 `src/utils/`，避免直接或間接匯入 `@opencode-ai/plugin`。

```
❌ src/tools/arise-git-summary.ts 匯入 shadows.ts → 匯入 @opencode-ai/plugin → 失敗
✅ src/utils/git-summary.ts 僅匯入 child_process → 成功
```

### Q2：`tool2` 的 `execute` 回傳值型別錯誤

**解決方案：** `execute` 必須回傳 `Promise<string>`。使用 `formatAriseMsgSuccess` 或 `formatAriseMsgError` 確保回傳型別正確。

### Q3：如何驗證工具是否正確註冊？

執行 `pnpm run typecheck`。由於 `IAriseTools` 是 `Record<EnumAriseTools, ...>` 的映射型別，缺少任何枚舉值都會導致類型錯誤。

### Q4：Zod schema 的鏈結順序

**正確順序：** `.meta()` → `.default()` → `.optional()`

```typescript
// ✅ 正確
z.number().describe("...")?.optional().default(5)

// ❌ 錯誤：.default() 在 .optional() 後面
z.number().describe("...")?.default(5).optional()
```

---

## 推薦做法總結

| 做法 | 說明 |
|------|------|
| **核心邏輯獨立** | 放在 `src/utils/`，盡量將不依賴 opencode 的部分放在獨立的檔案中 |
| **包裝層薄** | `src/tools/` 只做「取得描述 → 呼叫核心 → 格式化輸出」 |
| **使用 `tool2`** | 避免 TypeScript 推導錯誤 |
| **`as const` 描述** | 保留字面量類型 |
| **`formatAriseMsg*`** | 統一訊息格式 |
| **錯誤處理** | `try/catch` + `formatAriseMsgError` |
| **獨立驗證腳本** | `test/temp/<tool>-standalone.ts` 可直接執行核心邏輯 (可保留作為參考或在下次需要時復用) |
| **Zod 順序** | `.meta()` → `.default()` → `.optional()` |
| **測試架構** | 依 `test-file-best-practices.md` 規範組織：issues、lib、fixtures、scripts |

---

## 開發流程時間線

1. 先探索現有工具架構（beru 偵察）
2. 依序修改：`enums` → `shadows` → 建立核心 → 建立包裝 → 註冊
3. 依選擇執行：
   - **Approach 1** 或 **Approach 2**（根據獨立執行需求）
   - `test/temp/<tool>-standalone.ts`（獨立驗證腳本）
4. 執行 `pnpm run typecheck` 驗證
5. 如需獨立執行環境測試，調整核心邏輯架構
6. 討論型別推導：`z.input` vs `z.infer`
7. 執行獨立驗證腳本確認功能正確

---

## 相關資源

- [AGENTS.md](./AGENTS.md) - Agents 執行規則與最佳實踐
- [test-file-best-practices.md](./test-file-best-practices.md) - 測試檔案最佳實踐
- [comment-format-rules.md](./comment-format-rules.md) - 註解格式規範
- [docs/rules/zod-syntax-order.md](./docs/rules/zod-syntax-order.md) - Zod Schema 鏈結順序
- [docs/STRUCTURE.md](./docs/STRUCTURE.md) - 專案結構總覽
