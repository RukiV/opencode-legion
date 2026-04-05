# 模型解析機制 — 開發發現紀錄 / Model Resolution — Development Findings Log

> 記錄在分析和重構模型解析機制過程中發現的關鍵問題、設計決策和架構洞察。

---

## 發現 1：`AUTO/.` 繞過原始檢查的根因

**日期：** 2026-04-05
**嚴重度：** 🔴 高（已修復）

### 問題

錯誤訊息 `Error: Model not found: AUTO/.` 表示模型字串 `"AUTO/."` 繞過了原始的 AUTO 檢查，被當成 `providerID="AUTO"`, `modelID="."` 傳入 OpenCode SDK。

### 根因

原始的 `_isAutoModel` 使用嚴格相等比較：

```typescript
// 原始程式碼
export function _isAutoModel(model?: string): model is typeof AUTO_MODEL {
  return model === AUTO_MODEL;  // AUTO_MODEL === 'AUTO'
}
```

`"AUTO/."` 不等於 `"AUTO"`，所以 `_isAutoModel("AUTO/.")` 回傳 `false`，繞過檢查。

### 修復

三層防護：
1. `normalizeModelString` — 去除開頭/結尾的 `/`、`/.`、`./`
2. `_isAutoModel` 寬鬆匹配 — `trim().toUpperCase()` 後比較
3. `_detectAutoModelBody` — 解析後二次 AUTO 檢測

---

## 發現 2：快取寫入無驗證但讀取有完整防護

**日期：** 2026-04-05
**嚴重度：** 🟡 低（設計特性）

### 問題

`runtimeCache.cacheSessionModel` 直接將 `providerID` 和 `modelId` 組合成字串寫入快取，沒有任何驗證：

```typescript
runtimeCache.cacheSessionModel(sessionId, providerId, modelId);
```

### 分析

雖然寫入無驗證，但**所有讀取快取的路徑都會經過 `parseModelString` 的完整檢測鏈**，因此惡意值無法穿透到 SDK。

### 決策

暫時不添加寫入驗證，因為：
1. 寫入來源是 OpenCode SDK 的 `chat.params` Hook，可信度高
2. 讀取端已有完整防護
3. 添加驗證會增加不必要的耦合

---

## 發現 3：背景任務不讀取 Config

**日期：** 2026-04-05
**嚴重度：** 🟡 低（設計差異）

### 問題

`background-manager.launch()` 呼叫 `resolveModelContext` 時傳入 `config = undefined`：

```typescript
const modelBody = resolveModelContext(
  parentModel,
  opts.shadow as IAllShadowAgentsName,
  undefined,    // ← 不傳入 config
  opts.model
);
```

這意味著背景任務**不會讀取 `opencode-arise.json` 中的 `agents.<agent>.model` 設定**。

### 影響

背景任務的模型來源只有：
1. 用戶指定的 `model` 參數
2. Shadow 預設模型（`SHADOW_AGENTS[shadow].model`）
3. 父會話模型（從快取取得）
4. DEFAULT_MODEL

### 決策

這是設計差異而非 Bug。背景任務的模型應該由呼叫者明確指定，而非依賴配置檔案。

---

## 發現 4：`parseModelString` 回傳型別變更的連鎖效應

**日期：** 2026-04-05
**嚴重度：** 🟢 資訊

### 變更

`parseModelString` 的回傳型別從 `IModelBody | undefined` 改為 `IParseModelStringResult`：

```typescript
// 舊
parseModelString(model): IModelBody | undefined

// 新
parseModelString(model): { detectAutoModelBody: 0|1|2|3, modelBody: IModelBodyPartial | undefined }
```

### 影響範圍

| 函數 | 變更內容 |
|------|----------|
| `parseModelBody` | 判斷條件改為 `parsed.detectAutoModelBody \|\| !parsed.modelBody` |
| `resolveModelContext` | 同上，fallback 改用 `parseModelString(DEFAULT_MODEL).modelBody` |

### 洞察

將檢測結果與解析結果打包在同一個回傳物件中，避免了「先檢查再解析」的二次運算，同時讓呼叫者能根據 `detectAutoModelBody` 做出更精細的處理（例如未來實作 auto-discovery）。

---

## 發現 5：`getEffectiveModelWithFallback` 的 userModel 特殊處理

**日期：** 2026-04-05
**嚴重度：** 🟢 資訊

### 設計

`getEffectiveModelWithFallback` 在進入 fallback 鏈之前，會先檢查 `userModel` 是否為 AUTO：

```typescript
if (parseModelString(userModel).detectAutoModelBody) {
  userModel = void 0;
}
```

### 原因

如果不先將 AUTO 的 `userModel` 設為 `undefined`，`_resolveAutoModelCore(userModel, ...)` 會回退到 `parentModel → defaultModel`，但這個回退結果會**直接作為整個函數的回傳值**，跳過後續的 `configModel` 和 `defaultModel` 檢查。

將 AUTO 轉為 `undefined` 後，`??` 鏈會繼續往下走，讓每個層級都有機會觸發自己的 AUTO 回退邏輯。

---

## 發現 6：`_detectAutoModelBody` 的四種檢測類型

**日期：** 2026-04-05
**嚴重度：** 🟢 資訊

### 設計

| 類型 | 意義 | 未來用途 |
|------|------|----------|
| 0 | 完整模型 | 直接使用 |
| 1 | 完全 AUTO | fallback 到 DEFAULT_MODEL |
| 2 | provider 為 AUTO | 未來可實作「依模型名稱自動搜尋提供商」 |
| 3 | modelID 為 AUTO | 未來可實作「依提供商自動搜尋模型」 |

### 洞察

類型 2 和 3 目前都會觸發 fallback，但保留了未來實作 auto-discovery 的擴充點。`_detectAutoModelBody` 中已加入 `@todo` 註解標記這些擴充點。

---

## 發現 7：`normalizeModelString` 的遞迴設計

**日期：** 2026-04-05
**嚴重度：** 🟢 資訊

### 設計

`normalizeModelString` 使用 `do-while` 迴圈重複去除分隔符直到結果穩定：

```typescript
do {
  prev = result;
  result = result
    .replace(/^(?:\/\.|\.\/|\/)+/, '')
    .replace(/(?:\/\.|\.\/|\/)+$/, '');
} while (result !== prev);
```

### 原因

處理多重疊加的分隔符，例如 `"//./AUTO/.//"` 需要多次去除才能穩定為 `"AUTO"`。

### 效能考量

由於每次迭代至少去除一個字元，最多迭代次數等於字串長度，不會產生無限迴圈。

---

## 發現 8：背景任務未傳入 Config 導致模型設定不一致

**日期：** 2026-04-05
**嚴重度：** 🟡 中（已修復）

### 問題

`BackgroundManager.launch()` 呼叫 `resolveModelContext` 時傳入 `config = undefined`，導致背景任務**不會讀取 `opencode-arise.json` 中的 `agents.<agent>.model` 設定**。

### 根因

`BackgroundManager` 類別在建構時已接收並儲存 `this.config`，但 `launch()` 方法中沒有使用它：

```typescript
// src/tools/lib/background-manager.ts:847-852（修復前）
const modelBody = resolveModelContext(
  parentModel,
  opts.shadow as IAllShadowAgentsName,
  undefined,    // ← Bug：應該傳入 this.config
  opts.model
);
```

### 影響

同步召喚（`arise_summon`）和背景召喚（`arise_background`）對同一個 Shadow Agent 會使用不同的模型：

```json
// opencode-arise.json
{ "agents": { "beru": { "model": "anthropic/claude-4" } } }
```

| 呼叫方式 | 修復前使用的模型 |
|----------|-----------------|
| `arise_summon({ shadow: "beru" })` | `anthropic/claude-4`（讀取 config） |
| `arise_background({ shadow: "beru" })` | Shadow 預設 → parentModel → DEFAULT_MODEL（跳過 config） |

### 修復

將 `undefined` 改為 `this.config`：

```typescript
// src/tools/lib/background-manager.ts:847-852（修復後）
const modelBody = resolveModelContext(
  parentModel,
  opts.shadow as IAllShadowAgentsName,
  this.config,    // ← 使用已儲存的 config
  opts.model
);
```

### 修復後的行為一致性

現在兩種呼叫方式的模型解析優先順序完全一致：

| 優先級 | 來源 |
|--------|------|
| 1 | 用戶指定的 `model` 參數 |
| 2 | `opencode-arise.json` 中 `agents.<agent>.model` |
| 3 | `SHADOW_AGENTS[shadow].model`（Shadow 預設） |
| 4 | 父會話模型（從 runtimeCache 取得） |
| 5 | `DEFAULT_MODEL`（全域預設） |

### 教訓

當類別已儲存了必要的依賴（`this.config`），在呼叫下游函數時應確保正確傳遞，避免因傳入 `undefined` 導致功能缺失。這類 Bug 在程式碼審查時容易被忽略，因為：

1. 程式碼本身不會報錯（`undefined` 是合法的參數型別）
2. 有完整的 fallback 鏈，不會導致崩潰
3. 行為差異只在特定配置下才會顯現
