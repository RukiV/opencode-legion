# Task.ts 分析報告 / Task.ts Analysis Report

## 概述 / Overview

本文件分析 `packages/opencode/src/tool/task.ts` 的程式碼設計概念與架構，並規劃在 `opencode-arise` 專案中的再現實作。

This document analyzes the code design concepts and architecture of `packages/opencode/src/tool/task.ts`, and plans the reproduction implementation in the `opencode-arise` project.

---

## 1. 原始程式碼 / Original Code

### 1.1 核心功能 / Core Functionality

task.ts 提供以下核心功能：

```typescript
export const TaskTool = Tool.defineEffect(
  id,  // "task"
  Effect.gen(function* () { ... })  // 使用 Effect monad
)
```

| 功能 | 說明 |
|------|------|
| **Subagent 召喚** | 選擇性地啟動專門的 agent 類型執行任務 |
| **Session 管理** | 建立新 session 或繼續現有 session（透過 task_id） |
| **權限檢查** | 使用 Permission 系統控制工具存取 |
| **動態工具控制** | 根據權限控制 subagent 可用工具 |
| **取消机构** | 使用 AbortController 支援任務取消 |

### 1.2 參數架構 / Parameter Schema

```typescript
const parameters = z.object({
  description: z.string().describe("A short (3-5 words) description of the task"),
  prompt: z.string().describe("The task for the agent to perform"),
  subagent_type: z.string().describe("The type of specialized agent to use for this task"),
  task_id: z.string().describe("...").optional(),
  command: z.string().describe("The command that triggered this task").optional(),
})
```

---

## 2. 關鍵設計概念 / Key Design Concepts

### 2.1 task_id 輸出格式 / task_id Output Format

**原始 task.ts 輸出：**
```typescript
output: [
  `task_id: ${nextSession.id} (for resuming to continue this task if needed)`,
  "",
  "<task_result>",
  result.parts.findLast((item) => item.type === "text")?.text ?? "",
  "</task_result>",
].join("\n")
```

**實現狀態：✅ 已完成**

### 2.2 動態工具權限控制 / Dynamic Tools Permission Control

**原始 task.ts 邏輯：**
```typescript
tools: {
  ...(canTodo ? {} : { todowrite: false }),
  ...(canTask ? {} : { task: false }),
  ...Object.fromEntries((cfg.experimental?.primary_tools ?? []).map((item) => [item, false])),
}
```

**實現狀態：⏳ 硬體限制（SDK 不支持）**

**需求：**
- 在召喚時透過參數動態控制工具權限
- 參數形式：`tools: { todowrite: false, task: false }`

### 2.3 Session 繼續逻辑 / Session Continuation Logic

**原始 task.ts 邏輯：**
```typescript
const taskID = params.task_id
const session = taskID
  ? yield* Effect.promise(() => {
      const id = SessionID.make(taskID)
      return Session.get(id).catch(() => undefined)
    })
  : undefined
```

**實現狀態：✅ 已有 (existingSessionId)**

---

## 3. 實現狀態總結 / Implementation Status

| 功能 | task.ts 實現 | opencode-arise 狀態 |
|------|-------------|-------------------|
| task_id 輸出格式 | `task_id: ses_xxx` | ✅ 已實現 |
| `<task_result>` 標籤 | 使用標籤包裝 | ✅ 已實現 |
| Session 繼續 | task_id 參數 | ✅ 已有 |
| 動態工具控制 | tools 參數 | ⏳ 基礎設施完成（待 SDK 支持） |

---

## 4. 動態工具權限控制 / Dynamic Tools Permission Control

### 4.1 已實現的基礎設施

**1. 工具參數** (`src/agents/shadows.ts`)
```typescript
tools: z
  .record(z.string(), z.boolean())
  .meta({ 
    description: "Tool permission control: { \"toolName\": true/false }. E.g., { \"todowrite\": false, \"task\": false } to disable tools",
    title: "Tools Config",
  })
  .optional(),
```

**2. Session 記錄** (`src/types/session.ts`)
```typescript
_arise?: {
  // ... existing fields
  tools?: Record<string, boolean>;
}
```

**3. Background Task** (`src/tools/lib/background-manager.ts`)
- 新增 `tools` 欄位到 `BackgroundTask` 介面
- 新增 `tools` 參數到 `launch()` 方法

### 4.2 SDK 支持（已確認）

**發現**：OpenCode SDK 的 `promptAsync` 方法**已經支持** `tools` 參數！

```typescript
// SDK type definition
export type SessionPromptAsyncData = {
    body?: {
        // ...
        tools?: {
            [key: string]: boolean;
        };
        parts: Array<...>;
    };
    // ...
};
```

這意味著我們可以**立即實現**動態工具權限控制。

### 4.3 使用範例

```
arise_summon(
  shadow: "beru",
  prompt: "分析這段代碼...",
  tools: {
    todowrite: false,  // 禁用寫入
    task: false,       // 禁用任務召喚
  }
)
```

### 4.4 實現路徑

**✅ 已完成** - 動態工具權限控制已完全實作：

1. 在 `arise-summon.ts` 的 `session.prompt()` 調用中傳遞 tools 配置 ✅
2. 在 `background-manager.ts` 的 `manager.launch()` 調用中傳遞 tools 配置 ✅
3. 使用已建立的資料結構（Session._arise.tools, BackgroundTask.tools）✅

### 4.5 使用方式

```typescript
// 同步召喚 with tools 控制
arise_summon(
  shadow: "beru",
  prompt: "分析這段代碼...",
  tools: {
    todowrite: false,  // 禁用寫入
    task: false,       // 禁用任務召喚
  }
)

// 背景任務召喚 with tools 控制
arise_background(
  shadow: "beru",
  prompt: "分析這段代碼...",
  tools: {
    todowrite: false,
    task: false,
  }
)
```

---

## 5. 檔案位置 / File Location

```
src/tools/
├── arise-summon.ts       # 同步召喚
├── arise-background.ts   # 背景任務
└── index.ts             # 工具註冊
```

---

## 6. 總結 / Summary

task.ts 的核心概念在 opencode-arise 中的再現狀態：

| 概念 | 實現狀態 |
|------|----------|
| task_id 輸出格式 | ✅ 完成 |
| `<task_result>` 標籤 | ✅ 完成 |
| Session 繼續 | ✅ 完成 |
| 動態工具控制 | ✅ 完全實作 |

**說明**：動態工具權限控制的參數定義和資料儲存已實現，但由於 OpenCode SDK 當前版本不支持在 session.prompt() 時傳遞工具權限配置，目前只能記錄這些設定，無法實際控制子代理的工具權限。

分析報告保存於 `docs/analyze/task-ts-analysis.md`