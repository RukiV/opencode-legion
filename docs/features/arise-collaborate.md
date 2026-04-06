# arise_collaborate

多 Shadow Agent 協作工具，讓多個 Shadow Agent 能夠以不同模式協作完成任務。

## 功能概述

`arise_collaborate` 工具提供多個 Shadow Agent 協作完成任務的功能，支援三種執行模式：

| 模式           | 說明                 |
|--------------|--------------------|
| **planning** | 多個 agent 討論並達成共識   |
| **parallel** | 多個 agent 同時執行不同任務  |
| **chain**    | 多個 agent 依序執行，結果傳遞 |

---

## 流程圖

### 整體流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        arise_collaborate                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  驗證參數並截斷超過上限  │
                    │  - total_rounds ≤ 15   │
                    │  - max_concurrent ≤ 5   │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   解析合併 Config      │
                    │  使用工具參數或預設值   │
                    └───────────────────────┘
                                │
                                ▼
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    PLANNING     │   │    PARALLEL     │   │     CHAIN       │
│     模式        │   │     模式        │   │      模式       │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
    迴圈討論直到           分批並行執行          依序執行傳遞
    達成共識或           每批 ≤ max_           結果給下一個
    達到總回合數          concurrent            agent
```

### Planning 模式流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        Planning 模式                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  for round = 1 to     │
                    │  total_rounds         │
                    └───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │  for each shadow in shadows                 │
         │  (依序召喚每個 agent)                        │
         └──────────────────────────────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │  1. 構建包含前次回應的提示                   │
         │  2. launch() 啟動背景任務                    │
         │  3. 輪詢等待完成或超時                       │
         │  4. 收集回應                                 │
         └──────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  檢查是否達成共識      │
                    │  (所有回應相同)       │
                    └───────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
              [達成共識]              [未達成]
                │                       │
                ▼                       ▼
            提前結束                繼續下一回合
```

### Parallel 模式流程

```
┌─────────────────────────────────────────────────────────────────┐
│                       Parallel 模式                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  for i = 0 to shadows  │
                    │  .length step max_     │
                    │  concurrent            │
                    └───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │  批次啟動任務 (最多 max_concurrent 個)      │
         │  Promise.all() 並行執行                      │
         └──────────────────────────────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │  輪詢等待每個任務完成                         │
         │  - getTask(task.id)                         │
         │  - 檢查 status === Completed/Error           │
         └──────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  收集所有結果          │
                    │  組合回應文字          │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  返回格式化的結果      │
                    └───────────────────────┘
```

### Chain 模式流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chain 模式                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  for each shadow in  │
                    │  shadows (依序)      │
                    └───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │  1. 構建包含上一次結果的提示                │
         │     "Previous agent result: {previous}"     │
         │  2. launch() 啟動背景任務                   │
         │  3. 輪詢等待完成                             │
         │  4. 將結果傳遞給下一個 agent                 │
         └──────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  previousResult =     │
                    │  currentResult        │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  依序執行所有 agent   │
                    │  直到完成             │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  返回鏈式執行的       │
                    │  所有結果             │
                    └───────────────────────┘
```

---

## 文字版流程

### 通用流程

1. **參數驗證**
    - 截斷 `total_rounds` 到上限 15
    - 截斷 `max_concurrent` 到上限 5
    - 驗證 `shadows` 列表至少有一個 agent
    - 驗證 `max_concurrent` 不超過 shadows 數量

2. **Config 解析**
    - 合併工具參數與 config 檔案設定
    - 使用預設值（當工具參數未提供時）

3. **根據 mode 執行**
    - `planning`: 迴圈討論模式
    - `parallel`: 分批並行模式
    - `chain`: 鏈式傳遞模式

### Planning 模式執行流程

```
1. currentPrompt = 原始 prompt
2. allResponses = []

3. for round = 1 to total_rounds:
   a. roundResponses = []
   
   b. for each shadow in shadows:
      - promptWithContext = currentPrompt + 所有前次回應
      - task = backgroundManager.launch(shadow, promptWithContext)
      - 輪詢 getTask(task.id) 等待完成
      - roundResponses.push(response)
      - allResponses.push(response)
   
   c. 如果所有回應相同 (共識):
      - break 提早結束
   
4. 返回最終共識結果
```

### Parallel 模式執行流程

```
1. tasks = []

2. for i = 0 to shadows.length step max_concurrent:
   a. batch = shadows[i : i + max_concurrent]
   
   b. batchTasks = Promise.all(
      batch.map(shadow => 
        backgroundManager.launch(shadow, prompt)
      )
   )
   
   c. for each task in batchTasks:
      - 輪詢 getTask(task.id) 等待完成
      - 收集結果到 tasks

3. 組合所有結果
4. 返回格式化的結果
```

### Chain 模式執行流程

```
1. previousResult = ""
2. chainResults = []

3. for each shadow in shadows:
   a. promptWithResult = 
      previousResult 
        ? "prompt + Previous agent result: {previousResult}"
        : prompt
   
   b. task = backgroundManager.launch(shadow, promptWithResult)
   c. 輪詢 getTask(task.id) 等待完成
   
   d. previousResult = currentResult
   e. chainResults.push({shadow, result: currentResult})

4. 返回所有鏈式結果
```

---

## 參數說明

### 必要參數

| 參數        | 類型                    | 說明                           |
|-----------|-----------------------|------------------------------|
| `mode`    | `EnumCollaborateMode` | 協作模式：planning、parallel、chain |
| `shadows` | `string[]`            | 參與的 Shadow Agent 列表（至少 1 個）  |
| `prompt`  | `string`              | 任務提示                         |

### 可選參數

| 參數                 | 類型       | 預設值   | 說明             |
|--------------------|----------|-------|----------------|
| `description`      | `string` | -     | 任務描述（用於狀態輸出識別） |
| `model`            | `string` | -     | 指定使用的模型        |
| `total_rounds`     | `number` | 8     | 總回合數（上限 15）    |
| `max_concurrent`   | `number` | 2     | 最大並行數（上限 5）    |
| `round_timeout_ms` | `number` | 60000 | 回合超時（毫秒）       |
| `per_agent_rounds` | `number` | -     | 每個 agent 的回合數  |

---

## 使用範例

### Planning 模式

多個 agent 討論並達成共識：

```json
{
  "mode": "planning",
  "shadows": ["beru", "bellion", "tank"],
  "prompt": "分析這個程式碼的性能問題並提出優化方案",
  "total_rounds": 5
}
```

### Parallel 模式

多個 agent 同時執行不同任務：

```json
{
  "mode": "parallel",
  "shadows": ["beru", "igris", "tusk"],
  "prompt": "搜尋相關的代碼範例",
  "max_concurrent": 2
}
```

### Chain 模式

依序執行，結果傳遞：

```json
{
  "mode": "chain",
  "shadows": ["beru", "igris"],
  "prompt": "先搜尋程式碼結構，然後進行重構",
  "round_timeout_ms": 120000
}
```

---

## 配置檔案支援

可以在 `opencode-arise.json` 中設定預設值：

```json
{
  "collaborate": {
    "allowed_modes": ["planning", "parallel", "chain"],
    "denied_modes": [],
    "total_rounds": 8,
    "per_agent_rounds": null,
    "max_concurrent": 2,
    "round_timeout_ms": 60000
  }
}
```

### 配置欄位說明

| 欄位                 | 類型         | 說明            |
|--------------------|------------|---------------|
| `allowed_modes`    | `string[]` | 允許的協作模式       |
| `denied_modes`     | `string[]` | 拒絕的協作模式       |
| `total_rounds`     | `number`   | 預設總回合數        |
| `per_agent_rounds` | `number`   | 預設每 agent 回合數 |
| `max_concurrent`   | `number`   | 預設最大並行數       |
| `round_timeout_ms` | `number`   | 預設回合超時        |

---

## 限制說明

- `total_rounds` 上限：15（預設 8）
- `max_concurrent` 上限：5（預設 2）
- 當值超過上限時會自動截斷並記錄警告

---

## 相關檔案

| 檔案                               | 說明        |
|----------------------------------|-----------|
| `src/tools/arise-collaborate.ts` | 工具主體      |
| `src/agents/shadows.ts`          | 工具定義      |
| `src/types/enums.ts`             | 類型定義      |
| `src/config/schema.ts`           | 配置 Schema |
| `src/types/const-default.ts`     | 常數定義      |
