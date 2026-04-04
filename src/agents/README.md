# Shadow Agents

Shadow Agents 系統的核心檔案與模組。

## 檔案結構

```
src/agents/
├── README.md                    ← 本檔案
├── shadows.ts                ← 主定義檔案 (Agent 註冊與 ARISE_TOOLS)
├── shadows.test.ts           ← 測試檔案
├── shadow-descriptions.test.ts  ← 描述測試
│
└── lib/                      ← 核心模組
    ├── shadow-descriptions.ts   ← 靜態描述 + 工具函式
    ├── shadow-monarch-prompt.ts ← Monarch prompt
    ├── prompts.ts          ← Sub-agents prompts
    ├── rules-skills-ref.ts  ← Rules & Skills 索引
    └── tool-guides.ts      ← 工具指南
```

## 檔案分工

### shadows.ts

**職責**：主定義檔案

- `SHADOW_AGENTS` - 所有 Shadow Agent 定義集合
- `ARISE_TOOLS` - 召喚工具定義
- `OPENCODE_OVERRIDES` - OpenCode 內建代理覆寫

**依賴**：
- `./lib/shadow-descriptions.ts` - getMonarchShadowList
- `./lib/prompts.ts` - SHADOW_PROMPTS

---

### lib/shadow-descriptions.ts

**職責**：Shadow Agents 靜態描述 + 工具函式

**內容**：
- `SHADOW_DESCRIPTIONS` - 所有 Agent 的靜態描述（name, role, capabilities, bestFor...）
- `getShortDescription()` - 取得簡短描述
- `getFullDescription()` - 取得完整描述
- `getMonarchShadowList()` - Monarch 用的 Agent 列表
- `supportsBackgroundExecution()` - 檢查是否支援背景執行
- `suggestShadowAgent()` - 根據任務建議合適的 Agent
- `getShadowAgentsMarkdownTable()` - Markdown 表格格式
- `getShadowDescription()` - 取得描述物件
- `getAllShadowNames()` - 取得所有 Agent 名稱

**維護時機**：
- 修改 Agent 描述 → 編輯此檔案
- 修改 capabilities/bestFor → 編輯此檔案

---

### lib/shadow-monarch-prompt.ts

**職責**：Shadow Monarch 的 prompt

**內容**：
- `SHADOW_MONARCH_PROMPT` - Monarch 完整 prompt
- `SHADOW_MONARCH_CONFIG` - Monarch 基礎配置

**維護時機**：
- 修改 Monarch prompt → 編輯此檔案

---

### lib/prompts.ts

**職責**：Sub-agents prompts

**內容**：
- `BERU_PROMPT` - Beru prompt
- `IGRIS_PROMPT` - Igris prompt
- `BELLION_PROMPT` - Bellion prompt
- `TUSK_PROMPT` - Tusk prompt
- `TANK_PROMPT` - Tank prompt
- `SHADOW_SOVEREIGN_PROMPT` - ShadowSovereign prompt
- `ESIL_RADIRU_PROMPT` - EsilRadiru prompt

**維護時機**：
- 修改 Sub-agent prompt → 編輯此檔案

---

### lib/rules-skills-ref.ts

**職責**：Rules & Skills 索引

**內容**：
- `RULES_SKILLS_INDEX` - 完整索引（~70行）
- `RULES_SKILLS_SHORT` - 短版索引（~3行）

**維護時機**：
- 新增/更新 rules/skills 索引 → 編輯此檔案

---

### lib/tool-guides.ts

**職責**：工具使用指南

**內容**：
- `SEARCH_TOOLS` - 搜尋工具指南
- `EDIT_TOOLS` - 編輯工具指南
- `RESEARCH_TOOLS` - 研究工具指南
- `NO_EDIT_CONSTRAINTS` - 不編輯檔案約束
- `SHARED_CONSTRAINTS` - 通用約束
- `LSP_TOOLS` - LSP 工具指南

---

## 使用範例

### 取得 Agent 描述

```typescript
import { getShortDescription, getMonarchShadowList } from './lib/shadow-descriptions';

// 簡短描述
const desc = getShortDescription(EnumShadowSubAgentsName.Beru);
// → "🐜 Fastest scout - Codebase exploration..."

// Monarch 列表
const list = getMonarchShadowList();
```

### 使用 Monarch Prompt

```typescript
import { SHADOW_MONARCH_PROMPT } from './lib/shadow-monarch-prompt';

// 在 SHADOW_AGENTS 中引用
[EnumShadowAgentsName.ShadowMonarch]: {
  prompt: SHADOW_MONARCH_PROMPT,
}
```

### 使用 Sub-agent Prompt

```typescript
import { SHADOW_PROMPTS } from './lib/prompts';

// 在 SHADOW_AGENTS 中引用
[EnumShadowSubAgentsName.Igris]: {
  prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Igris],
}
```

---

## 新增 Agent 流程

1. **shadow-descriptions.ts** - 新增描述到 `SHADOW_DESCRIPTIONS`
2. **lib/prompts.ts** - 新增 prompt 定義
3. **shadows.ts** - 新增到 `SHADOW_AGENTS`
4. **更新測試** - 新增對應測試

---

## 維護原則

| 類型 | 檔案 |
|------|------|
| 靜態描述（名稱/角色/能力） | `shadow-descriptions.ts` |
| Monarch Prompt | `shadow-monarch-prompt.ts` |
| Sub-agent Prompt | `lib/prompts.ts` |
| Rules/Skills 索引 | `lib/rules-skills-ref.ts` |
| 工具指南 | `lib/tool-guides.ts` |
| Agent 註冊 | `shadows.ts` |

---

## 索引與共享

### Rules & Skills

```
📚 Rules & Skills Index
├── Rules (system prompt 或讀取)
│   ├── typescript-naming-convention
│   ├── comment-format-rules
│   └── test-file-best-practices
│
└── Skills (skill tool 載入)
    ├── js-git-friendly-coding-style
    ├── analyze-code-commenter
    ├── code-refactoring-expert
    └── typescript-unimplemented-handler
```

位置：`lib/rules-skills-ref.ts`（在各 agent prompt footer 中引用）

### Helper Functions

位置：`lib/shadow-descriptions.ts`

---

## 測試

```bash
# 執行所有測試
pnpm run test:agent

# 執行特定測試
pnpm test src/agents/shadows.test.ts
```

---

## 相關檔案

- `src/types/enums.ts` - Agent 名稱列舉
- `src/types/enum-opencode.ts` - OpenCode 相關類型
- `src/types/const-default.ts` - 常數定義