# 暗影召喚方式對比 (Shadow Summoning Methods Comparison)

透過實際測試驗證，記錄四種暗影召喚方式的行為差異與適用場景。

Tested and verified through actual invocation, documenting behavioral differences and applicable scenarios for four shadow summoning methods.

---

## 召喚方式總覽

| 方式 | 支援暗影 | 阻塞？ | 結果回傳 | 追蹤方式 | 使用條件 |
|------|---------|--------|---------|---------|---------|
| `arise_summon(false)` | 全部 6 隻 | ✅ 阻塞 | ✅ 直接回傳 | 無需追蹤（同步等待） | 通用 |
| `arise_summon` (省略) | 全部 6 隻 | ✅ 阻塞 | ✅ 直接回傳 | 無需追蹤（預設同 false） | 通用 |
| `arise_background` | beru, tank, bellion | ❌ 不阻塞 | ✅ 需手動取回 | `arise_background_status` / `arise_background_output` | ⚠️ 任務 >20 分鐘 + 需並行 |
| `arise_summon(true)` | 全部 6 隻 | ❌ 不阻塞 | ❌ 無法取回 | 無對應工具 | ⚠️ 任務 >20 分鐘 + 需並行 + 不需結果 |

---

## Shadows 物件格式（v0.1.35+）

自 v0.1.35 起，`arise_collaborate` 的 `shadows` 參數支援新格式：

### 舊格式（已棄用）
```json
["beru", "bellion"]
```

### 新格式
```json
[
  { "agent": "beru" },
  { "agent": "bellion", "model": "claude-opus", "label": "先鋒" }
]
```

### 欄位說明
| 欄位 | 類型 | 說明 |
|------|------|------|
| `agent` | string (必填) | Shadow agent 名稱 |
| `model` | string (選填) | 指定模型，未指定時由 summon 系統自動處理 |
| `label` | string (選填) | 自訂識別標籤，未指定時自動產生遞增編號（如 beru#001） |

### Label 衝突處理
- 自訂 label 與現有 label 衝突 → 改為自動產生 label
- 自訂 label 符合 `#XXX` 格式 → 改為自動產生 label
- 自動 label 編號被佔用 → 跳到下一個可用編號
- 不同 agent 可使用相同 label

### 顯示名稱
使用 `getShadowDisplayName()` 統一顯示格式：`label(agent - model)` 或 `label(agent)`

---

## 各方式詳細說明

### 1. `arise_summon(run_in_background=false)` — 同步阻塞

**行為：** 等待暗影執行完成，直接返回結果。

**返回格式：**
```
[opencode-arise] beru reports:

（暗影的回應內容）
```

**適用場景：** 需要暗影的結果來繼續後續工作。

### 2. `arise_summon` (省略 run_in_background) — 預設同步

**行為：** 與 `false` 完全相同，預設為同步阻塞模式。

**返回格式：** 同上。

**適用場景：** 同上，更簡潔的寫法。

### 3. `arise_background` — 專用後台工具

**⚠️ 使用條件：僅當任務需要 20 分鐘以上執行時間，且同時有其他任務需要並行執行時才使用。**

**行為：** 立即返回 Task ID，暗影在背景執行。

**返回格式：**
```
[opencode-arise] Shadow beru launched in background.

Task ID: arise_mng281q5_8yce
Description: D: arise_background

Use arise_background_output("arise_mng281q5_8yce") when you need the result.
```

**結果取回：**
```typescript
// 查詢所有後台任務狀態
arise_background_status()

// 取回特定任務結果
arise_background_output("arise_mng281q5_8yce")
```

**限制：** 僅支援 `beru`、`tank`、`bellion` 三隻 shadow（偵查/研究型）。

**適用場景：** 任務預估超過 20 分鐘，需要並行執行多個探索/研究任務，之後再取回結果。

**不適用場景：** 一般通用任務（請使用 `arise_summon` 即可）。

### 4. `arise_summon(run_in_background=true)` — 失聯後台

**⚠️ 使用條件：僅當任務需要 20 分鐘以上執行時間，且同時有其他任務需要並行執行，且不需要取回結果時才使用。**

**行為：** 立即返回 Session ID，暗影在背景執行。

**返回格式：**
```
[opencode-arise] Summoned beru in background.

Task: A: arise_summon bg=true
Session ID: ses_2b6d8e3d4ffeUqR81jr5oTJc6h

The shadow is working. Continue with your work.
```

**結果取回：** ⚠️ 目前無可用工具取回結果。

**驗證：**
- `arise_background_output("ses_xxx")` → `Task not found`
- `arise_background_status()` → 列表中不顯示 Session ID

**適用場景：** 任務預估超過 20 分鐘，需要並行執行，且完全不需要取回結果（fire-and-forget）。

**不適用場景：** 通用任務請使用 `arise_summon`（不包含 `run_in_background`）。

---

## 兩套追蹤系統對比

```
arise_summon 系統                        arise_background 系統
├── 啟動方式：會話級別 (Session)            ├── 啟動方式：任務級別 (Task)
├── 返回 ID：ses_xxx                      ├── 返回 ID：arise_xxx
├── 追蹤：OpenCode Session 系統            ├── 追蹤：arise_background_status()
└── 取回：❌ 無工具可用                     └── 取回：✅ arise_background_output()
```

**兩者不互通：** Session ID 和 Task ID 是完全獨立的識別碼，不可交叉使用。

---

## 結果返回時機 (Result Retrieval Timing)

所有方式的結果都是在暗影**執行結束後**才會返回。區別在於**你怎麼拿到結果**以及**等待期間能否做其他事**。

### 流程對比

```
arise_summon(false):
  發送 prompt → ⏳ 阻塞等待 → 暗影結束 → 結果直接回來
  你：等待...等待...等待... → 收到結果

arise_background:
  發送 prompt → 立刻拿到 task_id → 你可以做其他事...
                                        → 之後呼叫 arise_background_output
                                        → 收到結果

arise_summon(true):
  發送 prompt → 立刻拿到 session_id → 你可以做其他事...
                                        → ⚠️ 沒有工具可以取回結果
```

### 對比表

| 方式 | 你怎麼拿到結果 | 等待期間能做其他事？ |
|------|--------------|-------------------|
| `arise_summon(false)` | 被動阻塞，結束後直接返回 | ❌ 被迫等待 |
| `arise_background` | 主動呼叫 `arise_background_output` 取回 | ✅ 可以先做其他事 |
| `arise_summon(true)` | 沒有工具可以取回 | ✅ 可以做其他事，但結果拿不到 |

### 結論

- **通用任務（預設首選）** → `arise_summon`（不包含 `run_in_background`）
- **需要結果 + 願意等** → `arise_summon(false)`
- **任務 >20 分鐘 + 需並行 + 需要結果** → `arise_background`
- **任務 >20 分鐘 + 需並行 + 不需要結果** → `arise_summon(true)`

---

## 建議用法決策表

| 需求 | 推薦方式 | 原因 |
|------|---------|------|
| 通用任務 | `arise_summon`（不包含 `run_in_background`） | 同步直接取回結果，最簡單 |
| 需要結果、願意等待 | `arise_summon(false)` 或省略 | 結果直接回傳 |
| 任務 >20 分鐘、需並行、需要結果 | `arise_background` | 可之後用 task_id 取回結果 |
| 任務 >20 分鐘、需並行、不在乎結果 | `arise_summon(true)` | fire-and-forget |
| 召喚 igris/tusk/shadow-sovereign | `arise_summon` | `arise_background` 不支援這些 shadow |

---

## 提示詞注意事項 (Prompt Best Practices)

### 問題描述

暗影收到的 prompt 會被視為**完整任務**來執行。如果 prompt 中包含說明性文字、參數描述、或任務記錄，暗影可能會將其誤解為需要執行的指令。

**實際案例：** 第一次測試時，prompt 包含「【測試參數：arise_summon run_in_background=true】請回傳一段簡短的自我介紹」，結果暗影將其解讀為完整任務，進而自行召喚了其他暗影。

### ❌ 危險寫法

```
【測試參數：arise_summon run_in_background=true】
請回傳一段簡短的自我介紹，包含你的名稱和特長。
```

暗影可能會：
- 將 `【測試參數：...】` 視為任務標題或指令
- 嘗試解析並執行描述中的操作

### ✅ 安全寫法

**方法一：用 code block 包住非任務內容**

```
這是一個測試標記（不需要執行）：
`arise_summon run_in_background=true`

請只回覆一句話：「收到」，然後結束。
不要執行任何其他操作，不要召喚其他 agent。
```

**方法二：明確聲明禁止事項**

```
這是測試，不需要執行任何操作。
請只回覆一句話：「Beru 收到」，然後結束任務。
不要呼叫或召喚其他任何 agent。
```

**方法三：最小化 prompt，只保留必要指令**

```
只回覆「收到」，不要做任何其他操作。
```

### 提示詞撰寫原則

| 原則 | 說明 |
|------|------|
| **明確結束條件** | 告訴暗影「完成後結束」，避免無限執行 |
| **禁止副作用** | 明確聲明「不要召喚其他 agent」「不要執行其他操作」 |
| **用 code block 隔離描述** | 非指令內容用反引號或 code block 包住，降低被誤讀的風險 |
| **最小化 prompt** | 只給必要指令，不要附帶多餘說明 |
| **避免動詞開頭** | 描述性文字避免以動詞開頭（如「執行」「檢查」），否則容易被當作指令 |

---

## 架構洞察 (Architecture Insights)

### 兩套系統的架構斷裂

`arise_summon(true)` 返回的 Session ID 和 `arise_background` 的 Task ID 不只是「不同格式」，而是隸屬**完全獨立的兩套系統**：

- **Session 系統** — OpenCode 原生的會話管理，由 OpenCode 平台內部追蹤
- **Task 系統** — arise plugin 自行管理的任務追蹤，透過 `arise_background_status` / `arise_background_output` 操作

兩者不互通是**架構設計層面的決定**，而非 bug。`arise_summon` 走的是 OpenCode 原生 Session 通道，而 `arise_background` 走的是 plugin 自建的 Task 通道。

### 行為不對稱陷阱

| | `arise_summon(true)` | `arise_background` |
|---|---|---|
| 可召喚的 Shadow | 全部 6 隻 | 僅 3 隻 (beru/tank/bellation) |
| 結果可追蹤 | ❌ | ✅ |
| 結果可取回 | ❌ | ✅ |

這種不對稱是 agent 最容易犯錯的地方：**直覺上選擇「支援全部 shadow」的 `arise_summon(true)`，卻發現結果無法取回**。

正確的決策邏輯：
1. 任務 >20 分鐘 + 需並行？→ 否 → `arise_summon`（一般任務直接用）
2. 任務 >20 分鐘 + 需並行？→ 是 → 需要結果嗎？
   - 需要結果 + 是 beru/tank/bellion？→ `arise_background`
   - 需要結果 + 是 igris/tusk/shadow-sovereign？→ `arise_summon(false)`（只能同步等）
   - 不需要結果 → `arise_summon(true)`

### Source of Truth

Agent 行為的真正控制來源是 `shadows.ts` 中的工具描述（`ARISE_TOOLS`），而非本文件。

- **工具描述** (`shadows.ts`) → Agent 讀取後決定使用哪種方式 → **影響實際行為**
- **本文件** (`shadow-summoning-methods.md`) → 人類開發者參考文件 → **不影響 Agent 行為**

修改 Agent 行為時，必須同時更新兩處：
1. `src/agents/shadows.ts` — 工具描述和 prompt
2. `docs/shadow-summoning-methods.md` — 人類可讀的文件

---

## 安全設計考量 (Security Design Considerations)

### 為什麼只有 Beru、Tank、Bellion 支援 Background？

這是 **有意的 AGENT 權限設計**，不是 bug 或限制。

| Agent | 主要能力 | 適合 Background? | 理由 |
|-------|---------|------------------|------|
| **Beru** | 🔍 搜尋/探索 | ✅ | 只讀操作，不會修改檔案 |
| **Tank** | 🌐 網路搜尋 | ✅ | 只讀操作，不會修改檔案 |
| **Bellion** | 📊 策略分析 | ✅ | 只讀操作，不會修改檔案 |
| **Igris** | ✏️ 編輯檔案 | ❌ | 寫入操作，並行恐衝突 |
| **Tusk** | 🎨 UI 創作 | ❌ | 寫入操作，並行恐衝突 |
| **Shadow Sovereign** | 🔍 深度審查 | ❌ | 需要同步討論確認 |

#### 設計邏輯

**只允許「只讀操作」的 Agent 使用 Background 模式：**

1. **避免檔案衝突** — 多個 Agent 同時編輯同一個檔案會導致覆蓋
2. **確保順序可控** — 寫入操作需要明確的執行順序
3. **易於追蹤責任** — 知道哪個 Agent 做了什麼修改

#### 並行風險

如果允許 `Igris` 或 `Tusk` 使用 `arise_background`：

```
場景：並行執行兩個 Igris 任務
├── Igris A 編輯 file.ts
├── Igris B 也編輯 file.ts
└── 後執行的覆蓋先執行的結果 → 資料丟失
```

#### 結論

> **BACKGROUND_SHADOWS = [beru, tank, bellion] 是合理的安全設計**
> 
> - 需要寫入的 Agent 必須使用 Sync 模式（`arise_summon`）
> - 確保執行順序、結果可控、責任明確

---

## 程式碼參考 / Code Reference

更多召喚策略詳細內容，請參考 `src/agents/lib/tool-guides.ts` 中的 `createSummoningStrategy` 函式。

For more detailed summoning strategy, see `createSummoningStrategy` function in `src/agents/lib/tool-guides.ts`.

### 核心函式 / Core Functions

| 函式 | 說明 |
|------|------|
| `getInitialTestDescription()` | 產生 Initial Test 召喚描述 |
| `getThenDecideDescription()` | 產生 Then decide 描述 |
| `createSummoningStrategy()` | 產生完整的召喚策略指南 |

### 相關檔案 / Related Files

```
src/agents/lib/
├── tool-guides.ts              # 工具使用指南（含召喚策略）
├── shadow-prompts.ts           # Shadow Agent prompts
├── arise-tools-utils.ts        # 工具相關 utility
├── rules-skills-ref.ts         # Rules & Skills 索引
└── shadow-descriptions.ts      # Shadow Agent 描述
```

---

## 測試記錄

- **測試日期：** 2026-04-01
- **測試方式：** 使用相同任務（自我介紹）分別以四種方式召喚 beru
- **專案：** opencode-arise
