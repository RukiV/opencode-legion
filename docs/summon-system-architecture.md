# 召喚系統架構分析 (Summon System Architecture Analysis)

深入分析 `arise-summon.ts` 與 `arise-background.ts` 的工作原理、機制流程、OpenCode API 使用方式，以及 BACKGROUND_SHADOWS 限制的設計原因。

In-depth analysis of `arise-summon.ts` and `arise-background.ts` working principles, mechanisms, OpenCode API usage, and the design rationale behind BACKGROUND_SHADOWS limitations.

---

## 一、兩套召喚系統總覽

本專案有兩套獨立的 Shadow 召喚系統，各自有不同的追蹤機制與使用場景：

| 系統 | 入口 | 追蹤方式 | 結果可取回 | 支援 Shadow |
|------|------|---------|:---:|:---:|
| **arise_summon** | `arise-summon.ts` | OpenCode Session | 同步 ✅ / 非同步 ❌ | 全部 7 隻 |
| **arise_background** | `arise-background.ts` + `BackgroundManager` | 自建 Task 系統 | ✅ | 3 隻 (beru/tank/bellion) |

兩套系統**不互通**：Session ID (`ses_xxx`) 和 Task ID (`arise_xxx`) 是完全獨立的識別碼。

---

## 二、arise_summon — 同步 + Fire-and-Forget

### 2.1 核心機制

直接使用 OpenCode 的 Session API，分為兩種執行模式：

```
arise_summon(shadow, prompt, run_in_background, model?)
    │
    ├─ 1. ctx.client.session.create()       ← 建立新 Session
    │      └─ body: { title: "任務描述" }
    │
    ├─ 2. resolveModelContext()             ← 解析模型
    │      └─ 優先順序：用戶指定 > Config > Shadow 預設 > AUTO > 父模型 > DEFAULT
    │
    ├─ run_in_background = false (同步，預設)
    │   ├─ 3a. await ctx.client.session.prompt()    ← 阻塞等待完成
    │   ├─ 4a. ctx.client.session.messages()         ← 取得訊息歷史
    │   ├─ 5a. filter(role === "assistant").pop()    ← 取最後一條
    │   └─ 6a. extractTextFromMessageParts()          ← 提取文字回傳
    │
    └─ run_in_background = true (Fire-and-Forget)
        ├─ 3b. ctx.client.session.promptAsync()      ← 不等待
        ├─ 4b. .then() → 寫 debug log                ← 成功只記錄
        ├─ 5b. .catch() → 寫 error log + app.log     ← 失敗才通知
        └─ 6b. 立即回傳 "Session ID: ses_xxx"
             ⚠️ 沒有工具能取回結果！
```

### 2.2 執行流程圖

```
┌─────────────────────────────────────────────────────┐
│                  arise_summon 流程                    │
│                                                      │
│  Monarch 呼叫工具                                     │
│       │                                              │
│       ▼                                              │
│  ┌─────────────────┐                                 │
│  │ session.create() │ ← 建立獨立 Session              │
│  └────────┬────────┘                                 │
│           │                                           │
│           ▼                                           │
│  ┌─────────────────┐                                 │
│  │ resolveModelCtx  │ ← 決定使用哪個 LLM              │
│  └────────┬────────┘                                 │
│           │                                           │
│     ┌─────┴─────┐                                    │
│     ▼           ▼                                    │
│  同步模式    非同步模式                                │
│     │           │                                    │
│     ▼           ▼                                    │
│  prompt()    promptAsync()                            │
│  (await)     (fire-and-forget)                        │
│     │           │                                    │
│     ▼           ▼                                    │
│  messages()   .then() → log                          │
│     │          .catch() → error log                  │
│     ▼                                                │
│  提取文字回傳                                         │
└─────────────────────────────────────────────────────┘
```

### 2.3 使用的 OpenCode API

| API | 用途 | 同步模式 | 非同步模式 |
|-----|------|:---:|:---:|
| `ctx.client.session.create()` | 建立獨立 Session | ✅ | ✅ |
| `ctx.client.session.prompt()` | 同步發送提示並等待 | ✅ | — |
| `ctx.client.session.promptAsync()` | 非同步發送提示 | — | ✅ |
| `ctx.client.session.messages()` | 取得 Session 訊息歷史 | ✅ | — |
| `ctx.client.app.log()` | 寫入應用日誌（失敗時） | — | ✅ |

### 2.4 可接受的 Shadow

`ALLOWED_SHADOWS` — 全部 7 隻：

| Shadow | 角色 | 說明 |
|--------|------|------|
| `beru` | 🐜 Ant King | 快速程式碼探索 |
| `igris` | ⚔️ Loyal Knight | 精確程式碼實作 |
| `bellion` | 🎖️ Grand Marshal | 策略規劃與架構分析 |
| `tusk` | 🎨 Creative Shadow | UI/UX 與前端 |
| `tank` | 🛡️ Research Shadow | 外部文檔與搜尋 |
| `shadow-sovereign` | 👁️ Full Power | 深度推理與 Debug |
| `esil-radiru` | 🔥 Chat Companion | 對話與情感交流 |

---

## 三、arise_background — 可追蹤的平行執行

### 3.1 核心機制

由 `BackgroundManager` 類別管理的自建任務追蹤系統，提供完整的生命週期管理：

```
arise_background(shadow, prompt, description, model?)
    │
    ├─ 1. manager.launch()
    │   ├─ 建立 BackgroundTask 物件
    │   │   └─ { id: "arise_xxx", status: Running, ... }
    │   ├─ ctx.client.session.create()         ← 建立 Session
    │   ├─ ctx.client.session.promptAsync()    ← 非同步執行
    │   └─ 啟動 _pollSessionStatus()           ← 開始輪詢
    │
    ├─ 2. 輪詢機制 (Polling Loop)
    │   ├─ ctx.client.session.status()         ← 定期檢查 Session 狀態
    │   ├─ 狀態 === "unchanged" → 繼續輪詢
    │   ├─ 狀態 === "completed" → 取回結果
    │   └─ 狀態 === "error" → 記錄錯誤
    │
    ├─ 3. 結果處理
    │   ├─ ctx.client.session.messages()       ← 取得訊息
    │   ├─ 提取最後 assistant 訊息
    │   ├─ task.result = 文字內容
    │   └─ task.status = Completed / Error
    │
    └─ 4. 取回介面
        ├─ arise_background_status → 列出所有任務
        ├─ arise_background_output → 取得 task.result
        └─ arise_background_cancel → ctx.client.session.abort()
```

### 3.2 BackgroundManager 完整能力

| 功能 | 說明 | 相關方法 |
|------|------|---------|
| **任務啟動** | 建立 Session + 非同步 prompt + 啟動輪詢 | `launch()` |
| **狀態輪詢** | 定期檢查 Session 狀態，自動偵測完成 | `_pollSessionStatus()` |
| **結果取回** | 從訊息歷史提取最後的 assistant 回應 | `getTask()` |
| **任務取消** | 呼叫 `session.abort()` 終止執行 | `cancelTask()` |
| **Auto-resume** | 失敗時自動重試（可配置 ignore/retry/notify） | `_handleAutoResume()` |
| **Exponential backoff** | 輪詢間隔隨重試次數遞增 | `_calculatePollInterval()` |
| **High load 偵測** | 偵測 "high load" 錯誤並給予額外延遲 | `isHighLoadError()` |
| **Runtime override** | 執行時動態調整 auto-resume 設定 | `manualRetry()` |
| **Session 過濾** | 可依 parentSessionId 過濾任務 | `getAllTasks()` |

### 3.3 執行流程圖

```
┌─────────────────────────────────────────────────────────────┐
│                    arise_background 流程                      │
│                                                              │
│  Monarch 呼叫 arise_background                                │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────┐                                     │
│  │ manager.launch()     │                                     │
│  │  ├─ 建立 Task 物件   │                                     │
│  │  ├─ session.create() │                                     │
│  │  └─ promptAsync()    │                                     │
│  └──────────┬──────────┘                                     │
│             │                                                 │
│             ▼                                                 │
│  ┌─────────────────────┐                                     │
│  │ _pollSessionStatus() │ ← 輪詢迴圈                          │
│  │                      │                                     │
│  │  session.status()    │ ← 檢查狀態                          │
│  │       │              │                                     │
│  │  ┌────┴────┐         │                                     │
│  │  ▼         ▼         │                                     │
│  │ running  completed   │                                     │
│  │  │         │         │                                     │
│  │  繼續輪詢  messages() │                                     │
│  │            │         │                                     │
│  │            ▼         │                                     │
│  │       儲存 result    │                                     │
│  │       status=Done    │                                     │
│  └─────────────────────┘                                     │
│                                                              │
│  ┌──────────────────────────────────────────────┐            │
│  │              取回介面                          │            │
│  │  arise_background_status  → 列出任務           │            │
│  │  arise_background_output  → 取回結果           │            │
│  │  arise_background_cancel  → 取消任務           │            │
│  │  arise_continue           → 手動重試失敗任務    │            │
│  └──────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 使用的 OpenCode API

| API | 用途 | 呼叫時機 |
|-----|------|---------|
| `ctx.client.session.create()` | 建立獨立 Session | `launch()` |
| `ctx.client.session.promptAsync()` | 非同步發送提示 | `launch()` + `manualRetry()` |
| `ctx.client.session.status()` | 檢查 Session 狀態 | `_pollSessionStatus()` 輪詢 |
| `ctx.client.session.messages()` | 取得訊息歷史 | 完成後提取結果 |
| `ctx.client.session.abort()` | 終止 Session | `cancelTask()` |
| `ctx.client.app.log()` | 寫入應用日誌 | 狀態變更通知 |
| `ctx.client.tui.showToast()` | 顯示 TUI 通知 | 重要事件提示 |

### 3.5 可接受的 Shadow

`BACKGROUND_SHADOWS` — 只有 3 隻：

| Shadow | 角色 | 適合背景的原因 |
|--------|------|:---:|
| `beru` | 🐜 快速偵察 | ✅ 獨立探索任務，不需要即時互動 |
| `tank` | 🛡️ 外部知識收集 | ✅ 純外部 IO，完全不依賴本地上下文 |
| `bellion` | 🎖️ 策略規劃 | ✅ 思考型任務，耗時但獨立 |

---

## 四、為什麼 arise_background 限制只有 BACKGROUND_SHADOWS？

### 4.1 結論：設計決策，非系統限制

從程式碼來看，`arise_background` 的限制純粹是 **Zod schema 層面的過濾**：

```typescript
// src/agents/shadows.ts — arise_background 的 shadow 參數定義
shadow: z
  .enum(BACKGROUND_SHADOWS)  // ← 這裡限制只有 beru/tank/bellion
  .meta({ ... })
```

**系統層面沒有任何硬性限制。** 所有 7 隻 shadow 都能透過 `session.create()` + `session.promptAsync()` 在背景執行。

### 4.2 為什麼選擇這三個 Agent

選擇標準基於三個維度：

#### 維度一：任務獨立性

| Shadow | 任務獨立性 | 說明 |
|--------|:---:|------|
| `beru` | ✅ 高 | grep、檔案探索 — 讀取操作，無副作用 |
| `tank` | ✅ 高 | 網頁搜尋、文件查詢 — 純外部 IO |
| `bellion` | ✅ 高 | 架構分析、問題分解 — 純思考 |
| `igris` | ⚠️ 中 | 程式碼修改 — 有副作用，需要驗證 |
| `tusk` | ⚠️ 中 | UI 開發 — 需要視覺反饋 |
| `shadow-sovereign` | ⚠️ 中 | 深度推理 — 可能需要追問 |
| `esil-radiru` | ❌ 低 | 對話性質 — 本身就是即時互動 |

#### 維度二：結果延遲容忍度

| Shadow | 延遲容忍 | 說明 |
|--------|:---:|------|
| `beru` | ✅ 高 | 探索結果可以晚點再看 |
| `tank` | ✅ 高 | 研究資料可以晚點再整理 |
| `bellion` | ✅ 高 | 策略分析可以晚點再討論 |
| `igris` | ❌ 低 | 程式碼修改需要即時確認正確性 |
| `tusk` | ❌ 低 | UI 需要即時預覽調整 |
| `shadow-sovereign` | ❌ 低 | Debug 需要逐步分析 |

#### 維度三：平行執行價值

| Shadow | 平行價值 | 說明 |
|--------|:---:|------|
| `beru` | ✅ 高 | 同時探索多個目錄/檔案 |
| `tank` | ✅ 高 | 同時搜尋多個文件來源 |
| `bellion` | ✅ 高 | 同時分析多個架構方案 |
| `igris` | ⚠️ 中 | 同時修改程式碼可能衝突 |
| `tusk` | ⚠️ 中 | UI 修改通常有順序依賴 |
| `shadow-sovereign` | ⚠️ 中 | 深度推理通常聚焦單一問題 |

### 4.3 未被選入的原因

| Shadow | 未被選入原因 |
|--------|:---:|
| `igris` | 程式碼修改有副作用，需要即時驗證；多個 igris 平行執行可能產生檔案衝突 |
| `tusk` | UI 開發需要視覺反饋和即時預覽，不適合純背景執行 |
| `shadow-sovereign` | 複雜問題通常需要逐步分析、追問、確認，不適合 fire-and-forget |
| `esil-radiru` | 對話性質的 agent，本身就是即時互動模式 |

### 4.4 如果需要讓其他 Shadow 支援背景執行

只需修改 `BACKGROUND_SHADOWS` 陣列即可：

```typescript
// src/types/enums.ts
export const BACKGROUND_SHADOWS = [
  EnumShadowSubAgentsName.Beru,
  EnumShadowSubAgentsName.Tank,
  EnumShadowSubAgentsName.Bellion,
  // 新增其他 shadow（例如）:
  // EnumShadowSubAgentsName.Igris,
] as const satisfies EnumShadowSubAgentsName[];
```

但需要同時評估：
1. 該 shadow 的任務是否適合非同步執行
2. 是否需要額外的錯誤處理或驗證機制
3. 平行執行時是否會產生資源衝突

---

## 五、OpenCode API 完整清單與潛在用途

### 5.1 目前已使用的 API

| API | 檔案 | 用途 |
|-----|------|------|
| `ctx.client.session.create()` | arise-summon.ts, background-manager.ts | 建立獨立 Session |
| `ctx.client.session.prompt()` | arise-summon.ts | 同步執行 agent |
| `ctx.client.session.promptAsync()` | arise-summon.ts, background-manager.ts | 非同步執行 agent |
| `ctx.client.session.messages()` | arise-summon.ts, background-manager.ts | 取得訊息歷史 |
| `ctx.client.session.status()` | background-manager.ts | 輪詢 Session 狀態 |
| `ctx.client.session.abort()` | background-manager.ts | 取消/終止 Session |
| `ctx.client.app.log()` | arise-summon.ts, background-manager.ts, event-handler.ts | 寫入應用日誌 |
| `ctx.client.tui.showToast()` | background-manager.ts, model-cache.ts, arise-banner.ts | 顯示 TUI 通知 |
| `ctx.client.config.providers()` | arise-list-models.ts | 取得模型提供者清單 |

### 5.2 還能做什麼（潛在用途）

#### 5.2.1 Agent Pipeline 串接

```
arise_summon(beru, "探索程式碼結構")
    │
    ▼ 結果
arise_summon(bellion, "根據探索結果設計重構方案")
    │
    ▼ 結果
arise_summon(igris, "執行重構")
```

#### 5.2.2 動態模型健康檢查

```typescript
// 利用 ctx.client.config.providers() 檢查模型可用性
const providers = await ctx.client.config.providers();
// 如果主要模型不可用，自動切換到備用模型
```

#### 5.2.3 事件監聽與即時反應

```typescript
// 監聽 Session 事件，即時反應 agent 行為
ctx.client.eventStream.on("session.message", (event) => {
  // agent 產生了新訊息，可以即時處理
});
```

#### 5.2.4 多 Session 分支討論

```typescript
// 建立多個獨立的討論分支
const sessionA = await ctx.client.session.create({ title: "方案 A 討論" });
const sessionB = await ctx.client.session.create({ title: "方案 B 討論" });
// 分別進行不同方向的探索
```

#### 5.2.5 超時自動終止

```typescript
// 啟動背景任務後，設定超時自動終止
const taskId = manager.launch({ ... });
setTimeout(async () => {
  const task = manager.getTask(taskId);
  if (task?.status === "running") {
    await manager.cancelTask(taskId);
  }
}, 300000); // 5 分鐘超時
```

#### 5.2.6 結構化事件追蹤

```typescript
// 利用 app.log 建立結構化的事件追蹤
ctx.client.app.log({
  body: {
    level: "info",
    label: "arise-task-completed",
    taskId: "arise_xxx",
    shadow: "beru",
    duration: 15000,
    status: "success",
  },
});
```

#### 5.2.7 進度條與即時通知

```typescript
// 利用 tui.showToast 顯示進度
await ctx.client.tui.showToast({
  message: "beru 正在探索中... (3/5 目錄)",
  level: "info",
});
```

---

## 六、架構對比總結

### 6.1 兩套系統的差異

```
┌─────────────────────────────────────────────────────────────┐
│                    兩套系統對比                               │
│                                                              │
│  arise_summon 系統                    arise_background 系統   │
│  ─────────────────                    ─────────────────────   │
│  啟動方式：會話級別 (Session)          啟動方式：任務級別 (Task)│
│  返回 ID：ses_xxx                     返回 ID：arise_xxx      │
│  追蹤：OpenCode Session 系統           追蹤：自建 Task 系統    │
│  取回：同步直接回傳                    取回：arise_background_ │
│        非同步無法取回                        output()          │
│  支援：全部 7 隻 shadow                支援：3 隻 shadow       │
│  特色：簡單直接                        特色：完整生命週期管理   │
│  限制：非同步模式結果無法取回            限制：shadow 數量受限   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 決策流程

```
需要召喚 Shadow？
    │
    ▼
需要結果嗎？
    │
    ├─ 不需要 → arise_summon(run_in_background=true)
    │            └─ Fire-and-forget，觸發後繼續
    │
    └─ 需要
         │
         ▼
    願意等待嗎？
         │
         ├─ 願意 → arise_summon(run_in_background=false)
         │          └─ 同步阻塞，結果直接回傳
         │
         └─ 不願意
              │
              ▼
         是 beru/tank/bellion 嗎？
              │
              ├─ 是 → arise_background
              │        └─ 非同步執行，之後取回結果
              │
              └─ 否 → arise_summon(run_in_background=false)
                       └─ 只能同步等待（無其他選擇）
```

### 6.3 關鍵洞察

1. **`arise_summon(true)` 是設計上的死胡同** — 建立了 Session 並啟動了任務，但沒有任何工具能取回結果。這就是為什麼文件明確說「需要結果時用 `arise_background`，不需要結果時才用 `run_in_background=true`」。

2. **兩套追蹤系統不互通是架構決定** — Session 系統由 OpenCode 平台管理，Task 系統由 plugin 自建。兩者各有職責，不互相干涉。

3. **BACKGROUND_SHADOWS 限制是設計決策而非技術限制** — 所有 shadow 都能在背景執行，但只有 beru/tank/bellion 的任務特性適合非同步 + 延遲取回的模式。

4. **Source of Truth 在程式碼中** — Agent 行為的真正控制來源是 `src/agents/shadows.ts` 中的工具描述，而非文件。修改行為時必須同時更新程式碼和文件。

---

## 七、相關檔案

| 檔案 | 用途 |
|------|------|
| `src/tools/arise-summon.ts` | 同步/非同步召喚工具 |
| `src/tools/arise-background.ts` | 背景任務工具組（launch/output/status/cancel） |
| `src/tools/lib/background-manager.ts` | BackgroundManager 核心實作 |
| `src/agents/shadows.ts` | Shadow 定義與工具描述（Source of Truth） |
| `src/types/enums.ts` | BACKGROUND_SHADOWS / ALLOWED_SHADOWS 定義 |
| `docs/shadow-summoning-methods.md` | 召喚方式對比文件（人類參考） |
