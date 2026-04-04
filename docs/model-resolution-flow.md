# 模型指定機制與路徑 / Model Specification Mechanism

> 本文檔記錄模型從用戶指定到最終傳入 OpenCode SDK 的完整路徑。
> This document records the complete path from user model specification to final OpenCode SDK call.

---

## 入口點總覽 / Entry Points Overview

| # | 入口點 | 檔案 | 行號 | 角色 |
|---|--------|------|------|------|
| 1 | `chat.params` Hook | `src/index.ts` | 148-151 | **寫入快取**：用戶在 OpenCode UI 選擇模型時寫入 |
| 2 | `arise-summon` 工具 | `src/tools/arise-summon.ts` | 98-99 | **同步召喚**：直接呼叫 `resolveModelContext` |
| 3 | `arise-background` 工具 | `src/tools/arise-background.ts` | 52-58 | **背景召喚**：透過 `manager.launch()` 間接呼叫 |
| 4 | `background-manager.launch` | `src/tools/lib/background-manager.ts` | 846-852 | **背景任務解析**：呼叫 `resolveModelContext` |
| 5 | `event-handler` | `src/plugin/event-handler.ts` | 187 | **唯讀**：僅用於日誌記錄，不參與解析 |

---

## 模型資料流 / Model Data Flow

```
用戶在 OpenCode UI 選擇模型
         │
         ▼
  ┌──────────────────────┐
  │ chat.params Hook     │  ← 寫入快取入口（唯一寫入點）
  │ index.ts:148-151     │
  │ cacheSessionModel()  │
  └────────┬─────────────┘
           │
           ▼
  ┌──────────────────────┐
  │ sessionModelCache    │  ← Map<string, string>
  │ (記憶體快取)          │     key: sessionId
  └────────┬─────────────┘     value: "provider/modelID"
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 ┌─────┐      ┌────────────────────┐
 │路徑A│      │路徑B               │
 │同步 │      │背景任務            │
 └──┬──┘      └─────────┬──────────┘
    │                   │
    ▼                   ▼
 arise-summon.ts    arise-background.ts
 :98-99             :52-58
    │                   │
    │                   ▼
    │              background-manager.ts
    │              :846-852
    │                   │
    │              getSessionModel(parentSessionId)
    │                   │
    │              resolveModelContext()
    │                   │
    ▼                   ▼
 ┌─────────────────────────────┐
 │ getSessionModel(sessionID)  │  ← 讀取快取
 │ resolveModelContext()       │  ← 解析模型
 │                             │
 │ 1. getModelFromConfig()     │
 │ 2. SHADOW_AGENTS[].model    │
 │ 3. getEffectiveModelWithFallback()
 │ 4. parseModelString()       │
 │ 5. fallback DEFAULT_MODEL   │
 └─────────────┬───────────────┘
               │
               ▼
        IModelBody { providerID, modelID }
               │
               ▼
   session.promptAsync({ model: modelBody })
   session.prompt({ model: modelBody })
```

---

## 各入口點詳細說明 / Detailed Entry Point Descriptions

### 1. `chat.params` Hook — 快取寫入入口

**檔案：** `src/index.ts`
**行號：** 148-151

這是模型快取的**唯一寫入點**。當用戶在 OpenCode 對話中選擇或變更模型時，此 Hook 會被觸發，將模型資訊寫入記憶體快取。

```typescript
async "chat.params"(input) {
  if (input.model) {
    cacheSessionModel(input.sessionID, input.model.providerID, input.model.id);
  }
}
```

| 屬性 | 說明 |
|------|------|
| 觸發時機 | 用戶發送訊息時（每次對話） |
| 輸入 | `input.model.providerID`、`input.model.id` |
| 輸出 | 寫入 `sessionModelCache` Map |
| 快取格式 | `sessionId → "providerID/modelID"` |

---

### 2. `arise-summon` 工具 — 同步召喚入口

**檔案：** `src/tools/arise-summon.ts`
**行號：** 98-99

用於 Monarch 召喚 Shadow Agent 時的模型解析。支援同步（等待完成）和非同步（fire-and-forget）兩種模式。

```typescript
const parentModel = getSessionModel(context.sessionID);
const modelBody = resolveModelContext(parentModel, shadow, config, model);
```

| 屬性 | 說明 |
|------|------|
| 工具名稱 | `arise_summon` |
| `parentModel` 來源 | `getSessionModel(context.sessionID)` — 當前會話的快取模型 |
| `config` 來源 | 插件初始化時載入的 `IAriseConfig` |
| `userModel` 來源 | 工具呼叫時的 `model` 參數 |
| SDK 呼叫 | `session.prompt()`（同步）或 `session.promptAsync()`（非同步） |

---

### 3. `arise-background` 工具 — 背景召喚入口

**檔案：** `src/tools/arise-background.ts`
**行號：** 52-58

用於啟動背景 Shadow 任務。模型解析在 `background-manager.launch()` 內部進行。

```typescript
const task = await manager.launch({
  shadow,
  prompt,
  description,
  parentSessionId: context.sessionID,
  model,
});
```

| 屬性 | 說明 |
|------|------|
| 工具名稱 | `arise_background` |
| `parentSessionId` 來源 | `context.sessionID` — 當前會話 ID |
| `model` 來源 | 工具呼叫時的 `model` 參數 |
| 模型解析 | 在 `background-manager.launch()` 內部進行 |

---

### 4. `background-manager.launch` — 背景任務解析

**檔案：** `src/tools/lib/background-manager.ts`
**行號：** 846-852

背景任務的模型解析核心。與 `arise-summon` 不同的是，此處不傳入 `config`（傳入 `undefined`），因此不會讀取 `opencode-arise.json` 中的 agent 模型設定。

```typescript
const parentModel = getSessionModel(opts.parentSessionId);
const modelBody = resolveModelContext(
  parentModel,
  opts.shadow as IAllShadowAgentsName,
  undefined,    // ← 不傳入 config
  opts.model
);
```

| 屬性 | 說明 |
|------|------|
| `parentModel` 來源 | `getSessionModel(opts.parentSessionId)` — 父會話的快取模型 |
| `config` | `undefined`（不讀取配置檔案） |
| `userModel` 來源 | `opts.model` — 工具呼叫時傳入的模型 |
| SDK 呼叫 | `session.promptAsync()` |

> **注意：** 背景任務不讀取 config 中的 agent 模型設定，僅依賴 Shadow 預設模型和用戶指定模型。

---

### 5. `event-handler` — 唯讀日誌入口

**檔案：** `src/plugin/event-handler.ts`
**行號：** 187

僅用於事件處理時的日誌記錄，不參與模型解析。

```typescript
const model = sessionId ? getSessionModel(sessionId) : undefined;
```

| 屬性 | 說明 |
|------|------|
| 用途 | 日誌記錄（`session created`、`session idle` 等事件） |
| 不參與 | 模型解析、SDK 呼叫 |

---

## 模型解析流程 / Model Resolution Flow

### `resolveModelContext` 解析步驟

```
輸入參數
  │
  ├── parentModel   ← getSessionModel(sessionId) 從快取取得
  ├── shadow        ← Shadow Agent 名稱（enum）
  ├── config        ← IAriseConfig（可選）
  └── userModel     ← 用戶呼叫工具時指定的模型

  ▼
┌─────────────────────────────────────────┐
│ 1. getModelFromConfig(config, shadow)   │  從 config 取得模型
│    → configModel                        │  From config file
└────────┬────────────────────────────────┘
         ▼
┌─────────────────────────────────────────┐
│ 2. SHADOW_AGENTS[shadow]?.model         │  從 Shadow 定義取得預設模型
│    → defaultModel                       │  From Shadow agent definition
└────────┬────────────────────────────────┘
         ▼
┌─────────────────────────────────────────┐
│ 3. getEffectiveModelWithFallback()      │  決定有效模型
│    → effectiveModel                     │  Determine effective model
│                                         │
│    優先順序 / Priority:                 │
│    userModel → configModel →            │
│    defaultModel → parentModel →         │
│    DEFAULT_MODEL                        │
└────────┬────────────────────────────────┘
         ▼
┌─────────────────────────────────────────┐
│ 4. parseModelString(effectiveModel)     │  解析模型字串
│    → IParseModelStringResult            │  Parse model string
└────────┬────────────────────────────────┘
         ▼
  detectAutoModelBody !== 0 ?
         │
   ┌─────┴─────┐
   │ 是        │ 否
   ▼           ▼
 fallback    回傳 parsed.modelBody
 DEFAULT_MODEL  Return parsed.modelBody
```

### 優先順序 / Priority

| 優先級 | 來源 | 說明 |
|--------|------|------|
| 1 | `userModel` | 用戶呼叫工具時指定的模型（最高優先級） |
| 2 | `configModel` | `opencode-arise.json` 中 `agents.<agent>.model` |
| 3 | `defaultModel` | `shadows.ts` 中 Shadow Agent 的預設模型 |
| 4 | `parentModel` | 父會話使用的模型（從 session cache 取得） |
| 5 | `DEFAULT_MODEL` | 全域預設：`opencode/big-pickle` |

### AUTO 模型處理

當任一層級的模型值為 `AUTO`（或變體如 `auto`、` AUTO `、`AUTO/.` 等），會觸發回退邏輯：

```
AUTO → parentModel → defaultModel → DEFAULT_MODEL
```

---

## 各調用點相容性 / Call Site Compatibility

| 檔案 | 函數 | 使用方式 | 相容性 |
|------|------|----------|--------|
| `arise-summon.ts:99` | `resolveModelContext(parentModel, shadow, config, model)` | 回傳 `IModelBody` → 傳入 SDK | ✅ 相容 |
| `background-manager.ts:847-852` | `resolveModelContext(parentModel, shadow, undefined, opts.model)` | 回傳 `IModelBody` → 傳入 SDK | ✅ 相容 |
| `arise-background.ts:52-58` | `manager.launch({ ..., model })` | 間接呼叫 background-manager | ✅ 相容 |
| `event-handler.ts:187` | `getSessionModel(sessionId)` | 僅讀取字串用於日誌 | ✅ 相容 |

---

## 快取管理 / Cache Management

### 快取寫入

| Hook | 檔案 | 條件 |
|------|------|------|
| `chat.params` | `src/index.ts:150` | `input.model` 存在時 |

### 快取讀取

| 呼叫點 | 檔案 | 用途 |
|--------|------|------|
| `arise-summon` | `src/tools/arise-summon.ts:98` | 取得父會話模型 |
| `background-manager` | `src/tools/lib/background-manager.ts:846` | 取得父會話模型 |
| `event-handler` | `src/plugin/event-handler.ts:187` | 日誌記錄 |

### 快取清除

| 函數 | 檔案 | 用途 |
|------|------|------|
| `clearSessionModel(sessionId)` | `src/config/lib/session-cache.ts:55` | 清除單一會話 |
| `clearAllSessionModels()` | `src/config/lib/session-cache.ts:67` | 清除全部（測試用） |
