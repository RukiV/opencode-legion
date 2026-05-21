# Prompt 修改同步檢查清單
# Prompt Modification Synchronization Checklist

## 概述 / Overview

修改工具描述（description）、參數說明（args meta.description）、shortDescription 或相關 prompt 時，Agent 行為會直接受影響。本文件列出所有需要同步更新的檔案，確保修改後一致性。

When modifying tool descriptions, parameter descriptions, shortDescriptions, or related prompts, agent behavior is directly affected. This document lists all files that need synchronized updates to ensure consistency after modifications.

---

## 分層架構 / Layered Architecture

```
                     Agent 行為 (Agent Behavior)
                              │
                              ▼
              ┌──────────────────────────────┐
              │   Tier 1: Source of Truth     │  ← 修改此層直接改變 Agent 行為
              │   (直接影響 Agent 行為)        │
              └──────────────────────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │   Tier 2: 間接 Prompt 檔案    │  ← 引用 Tier 1 的內容
              │   (Indirect Prompt Files)     │
              └──────────────────────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │   Tier 3: 人類參考文件        │  ← 需手動同步
              │   (Human Reference Docs)      │
              └──────────────────────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │   Tier 4: 測試檔案            │  ← 驗證修改正確性
              │   (Test Files)               │
              └──────────────────────────────┘
```

---

## Tier 1 — Source of Truth（核心檔案）

> **修改此層直接改變 Agent 的工具選擇和參數傳遞行為。**
> Modifying this layer directly changes agent tool selection and argument passing behavior.

| # | 檔案 | 內容 | 備註 |
|---|------|------|------|
| 1 | `src/agents/shadows.ts` | `ARISE_TOOLS` 的 `description`（完整描述） | 等同 Agent System Prompt |
| 2 | `src/agents/shadows.ts` | `ARISE_TOOLS` 的 `args.*.meta.description`（參數說明） | 影響 Agent 參數填寫方式 |
| 3 | `src/agents/lib/arise-tools-descriptions.ts` | `TOOL_SHORT_DESCRIPTIONS`（shortDescription） | 工具列表顯示用 |
| 4 | `src/tools/lib/types/shared-schema.ts` | `SHARED_SUMMON_ARGS`（共用參數描述） | 多個工具共用的參數說明 |

### 修改此層的影響

- description → 影響 Agent 何時選擇此工具
- args.meta.description → 影響 Agent 如何填寫參數值
- shortDescription → 影響工具列表摘要顯示

---

## Tier 2 — 間接 Prompt 檔案（Indirect Prompt Files）

> **引用 Tier 1 的內容或作為 Agent prompt 的一部分。**
> References Tier 1 content or serves as part of agent prompts.

| # | 檔案 | 內容 | 關係說明 |
|---|------|------|---------|
| 5 | `src/agents/lib/tool-guides.ts` | `SUMMONING_METHOD_RULES` | Agent 召喚方式決策指南 |
| 6 | `src/agents/lib/tool-guides.ts` | `SUMMONING_STRATEGY_FLOWCHART` | 召喚策略流程圖 |
| 7 | `src/agents/lib/tool-guides.ts` | `WHEN_TO_SUMMON` | 何時召喚哪個 Agent 的指南 |
| 8 | `src/agents/lib/tool-guides.ts` | `getInitialTestDescription()` | 初始測試描述 |
| 9 | `src/agents/lib/tool-guides.ts` | `getThenDecideDescription()` | 後續決策描述 |
| 10 | `src/agents/lib/shadow-prompts.ts` | Shadow Agent 自身的 prompt | 引用召喚策略 |
| 11 | `src/agents/lib/shadow-prompt-monarch.ts` | Monarch 的 system prompt | 包含 `createSummoningStrategy()` |
| 12 | `src/agents/lib/rules-skills-ref.ts` | Rules & Skills 索引 | 可能引用工具描述 |

---

## Tier 3 — 人類參考文件（Human Reference Docs）

> **不影響 Agent 行為，但必須手動同步以確保文件正確性。**
> Does not affect agent behavior, but must be manually synced for documentation accuracy.

| # | 檔案 | 內容 | 優先級 |
|---|------|------|--------|
| 13 | `docs/features/tools/shadow-summoning-methods.md` | 暗影召喚方式對比文件 | ⭐ 高 |
| 14 | `docs/references/available-tools.md` | 可用工具列表與決策表 | ⭐ 高 |
| 15 | `AGENTS.md` | Agent 行為指南（專案根目錄） | 中 |
| 16 | `README.md` | 英文專案說明 | 低（僅工具列表變動時） |
| 17 | `README.zh.md` | 中文專案說明 | 低（僅工具列表變動時） |
| 18 | `CHANGELOG.md` | 版本變更記錄 | 視情況 |

---

## Tier 4 — 測試檔案（Test Files）

> **修改 prompts 後應執行測試確認無回歸問題。**
> Run tests after modifying prompts to confirm no regressions.

| # | 檔案 | 測試內容 |
|---|------|---------|
| 19 | `src/tools/tools.test.ts` | 工具參數驗證測試 |
| 20 | `src/agents/__tests__/shadows.test.ts` | Shadow 定義測試 |
| 21 | `src/agents/lib/__tests__/tool-guides.test.ts` | 工具指南測試（如存在） |

---

## 修改流程檢查清單 / Modification Checklist

### 步驟 1：修改 Source of Truth

- [ ] 更新 `src/agents/shadows.ts` 中的 `description`
- [ ] 更新 `src/agents/shadows.ts` 中的 `args.*.meta.description`
- [ ] 更新 `src/agents/lib/arise-tools-descriptions.ts` 中的 `TOOL_SHORT_DESCRIPTIONS`
- [ ] 如共用參數變動，更新 `src/tools/lib/types/shared-schema.ts`

### 步驟 2：同步間接 Prompt 檔案

- [ ] 更新 `tool-guides.ts` 中的使用指南（`SUMMONING_METHOD_RULES`、`WHEN_TO_SUMMON` 等）
- [ ] 更新 `tool-guides.ts` 中的流程圖（`SUMMONING_STRATEGY_FLOWCHART`）
- [ ] 更新 `tool-guides.ts` 中的輔助函式（`getInitialTestDescription`、`getThenDecideDescription`）
- [ ] 檢查 `shadow-prompts.ts` 和 `shadow-prompt-monarch.ts` 是否需要更新

### 步驟 3：同步人類參考文件

- [ ] 更新 `docs/features/tools/shadow-summoning-methods.md`
- [ ] 更新 `docs/references/available-tools.md`
- [ ] 更新 `AGENTS.md`（如適用）
- [ ] 更新 `README.md` / `README.zh.md`（如工具列表變動）

### 步驟 4：驗證

- [ ] 執行 `pnpm run typecheck` 確認 TypeScript 編譯正確
- [ ] 執行 `pnpm run test:agent` 確認測試通過
- [ ] 確認修改後的 prompts 語意正確、無矛盾

---

## 修改範例 / Modification Example

以下以「修改 `arise_background` 的定位」為例，展示完整的同步流程：

### 實際修改記錄

```
修改內容：將 arise_background 的定位從「通用平行任務」改為
         「僅用於 20+ 分鐘且需並行的任務」

修改範圍：
├── Tier 1: shadows.ts (description + args)
├── Tier 1: arise-tools-descriptions.ts (shortDescription)
├── Tier 2: tool-guides.ts (SUMMONING_METHOD_RULES, 流程圖, 輔助函式)
├── Tier 2: tool-guides.ts (WHEN_TO_SUMMON)
├── Tier 3: docs/features/tools/shadow-summoning-methods.md
├── Tier 3: docs/references/available-tools.md
└── Tier 3: AGENTS.md (若適用)
```

---

## 注意事項 / Important Notes

1. **description 與 shortDescription 的關係**：
   - `description` 的第一行應與 `shortDescription` 一致
   - 當 description 為空時，系統會以 shortDescription 替代
   - 參考 `I_AriseToolsConfigEntry` 介面的說明

2. **prompt 修改的不可逆性**：
   - Agent 行為完全由 prompts 決定，修改 = 改變行為
   - 無對應的「編譯期檢查」，需靠人工審查確保語意正確

3. **雙向同步原則**：
   - 修改 Agent prompt → 同步更新人類文件
   - 設計新功能 → 同步更新 Agent prompt
   - 任一方向的不同步都會導致「人機認知不一致」

4. **測試覆蓋**：
   - tools.test.ts 驗證工具參數 schema 正確性
   - 工具描述的文字修改通常不需要更新測試
   - 但參數結構變動（增減參數）必須更新測試

---

## 相關資源 / Related Resources

- [`src/agents/shadows.ts`](../../src/agents/shadows.ts) — 工具定義 source of truth
- [`src/agents/lib/arise-tools-descriptions.ts`](../../src/agents/lib/arise-tools-descriptions.ts) — shortDescription 定義
- [`src/agents/lib/tool-guides.ts`](../../src/agents/lib/tool-guides.ts) — 工具使用指南
- [`src/tools/lib/types/shared-schema.ts`](../../src/tools/lib/types/shared-schema.ts) — 共用參數定義
- [`docs/features/tools/shadow-summoning-methods.md`](../features/tools/shadow-summoning-methods.md) — 召喚方式對比
- [`docs/references/available-tools.md`](../references/available-tools.md) — 可用工具列表
- [`AGENTS.md`](../../AGENTS.md) — Agent 行為指南
