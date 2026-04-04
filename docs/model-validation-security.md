# 模型檢查機制安全性分析 / Model Validation Security Analysis

> 本文檔分析每個入口點是否可能被繞過模型名稱檢查機制，以及潛在的突破路徑。
> This document analyzes whether each entry point could potentially bypass the model name validation mechanism.

---

## 威脅模型總覽 / Threat Model Overview

### 攻擊者能力假設

| 能力 | 說明 |
|------|------|
| **LLM Agent** | 可以呼叫 arise_summon / arise_background 工具，傳入任意 `model` 參數 |
| **Config 編輯** | 可以修改 `opencode-arise.json` 配置檔案 |
| **OpenCode UI** | 可以在 UI 中選擇模型 |

### 防禦層級

| 層級 | 位置 | 防禦內容 |
|------|------|----------|
| L1 | `parseModelString` | trim → normalize → AUTO 檢測 → split → 二次 AUTO 檢測 |
| L2 | `_isAutoModel` | 嚴格匹配 + 寬鬆匹配（trim + toUpperCase） |
| L3 | `_detectAutoModelBody` | 檢測 AUTO/空白/undefined/null 字串 |
| L4 | `resolveModelContext` | fallback 到 DEFAULT_MODEL |
| L5 | `cacheSessionModel` | 無驗證，直接寫入 |

---

## 入口點 1：`chat.params` Hook（快取寫入）

**檔案：** `src/index.ts:148-151`
**風險等級：** 🟡 中等

### 程式碼

```typescript
async "chat.params"(input) {
  if (input.model) {
    cacheSessionModel(input.sessionID, input.model.providerID, input.model.id);
  }
}
```

### 分析

`cacheSessionModel` 直接將 `providerID` 和 `modelId` 組合成字串寫入快取，**沒有任何驗證**：

```typescript
export function cacheSessionModel(sessionId: string, providerId: string, modelId: string): void {
  const modelString = `${providerId}/${modelId}`;
  sessionModelCache.set(sessionId, modelString);
}
```

### 潛在繞過路徑

#### 路徑 A：OpenCode SDK 傳入惡意模型名稱

**條件：** OpenCode SDK 的 `input.model.providerID` 或 `input.model.id` 被操縱

```
攻擊：providerID = "AUTO", modelId = "gpt-4o"
結果：快取值 = "AUTO/gpt-4o"
```

**影響：** 當後續呼叫 `getSessionModel()` 取得此快取值時，字串 `"AUTO/gpt-4o"` 會進入 `parseModelString`：

```
parseModelString("AUTO/gpt-4o")
  → _detectAutoModelBody({ providerID: "AUTO", modelID: "gpt-4o" })
  → detectAutoModelBody = 2（provider 為 AUTO）
  → modelBody = { providerID: undefined, modelID: "gpt-4o" }
```

**結果：** `resolveModelContext` 偵測到 `detectAutoModelBody !== 0`，**會 fallback 到 DEFAULT_MODEL**。✅ 防禦成功。

#### 路徑 B：快取注入惡意 AUTO 變體

**條件：** OpenCode SDK 傳入 `providerID = "auto"`, `modelId = ""`

```
攻擊：providerID = "auto", modelId = ""
結果：快取值 = "auto/"
```

**影響：**

```
parseModelString("auto/")
  → _trimLazy("auto/") → "auto/"
  → normalizeModelString("auto/") → "auto"
  → _isAutoModel("auto") → true（寬鬆匹配）
  → 回傳 detectAutoModelBody = 1
```

**結果：** fallback 到 DEFAULT_MODEL。✅ 防禦成功。

#### 路徑 C：快取注入特殊字元

**條件：** OpenCode SDK 傳入包含特殊字元的模型名稱

```
攻擊：providerID = "openai", modelId = "gpt-4/./.AUTO"
結果：快取值 = "openai/gpt-4/./.AUTO"
```

**影響：**

```
parseModelString("openai/gpt-4/./.AUTO")
  → normalizeModelString("openai/gpt-4/./.AUTO")
  → "openai/gpt-4/./.AUTO"（開頭不是分隔符，不處理結尾）
  → split("/") → ["openai", "gpt-4", "", ".AUTO"]
  → rest[0] = "" → 空段檢測 → 拋出 RangeError
```

**結果：** 拋出錯誤 → `parseModelString` 不會回傳有效 modelBody → `resolveModelContext` fallback 到 DEFAULT_MODEL。✅ 防禦成功。

### 結論

| 攻擊路徑 | 能否繞過 | 防禦機制 |
|----------|----------|----------|
| 惡意 providerID = "AUTO" | ❌ 否 | `_detectAutoModelBody` 偵測 → fallback |
| 惡意 modelId 含 AUTO 變體 | ❌ 否 | `normalizeModelString` + `_isAutoModel` |
| 特殊字元注入 | ❌ 否 | 空段檢測 → RangeError → fallback |

**風險評估：** 雖然 `cacheSessionModel` 本身無驗證，但 **所有讀取快取後的路徑都會經過 `parseModelString` 的完整檢測鏈**，因此無法繞過。

---

## 入口點 2：`arise-summon` 工具（同步召喚）

**檔案：** `src/tools/arise-summon.ts:98-99`
**風險等級：** 🟢 低

### 程式碼

```typescript
const parentModel = getSessionModel(context.sessionID);
const modelBody = resolveModelContext(parentModel, shadow, config, model);
```

### 分析

用戶傳入的 `model` 參數直接作為 `userModel` 傳入 `resolveModelContext`，整個解析鏈會處理所有情況。

### 潛在繞過路徑

#### 路徑 A：直接傳入 AUTO 變體

```
攻擊：model = "AUTO/."
→ resolveModelContext → getEffectiveModelWithFallback
  → parseModelString("AUTO/.") → detectAutoModelBody = 1
  → userModel = undefined
  → fallback 到 configModel → defaultModel → parentModel → DEFAULT_MODEL
```

**結果：** ✅ 防禦成功。

#### 路徑 B：傳入部分 AUTO

```
攻擊：model = "AUTO/gpt-4o"
→ parseModelString("AUTO/gpt-4o") → detectAutoModelBody = 2
→ modelBody = { providerID: undefined, modelID: "gpt-4o" }
```

**結果：** `resolveModelContext` 偵測到 `detectAutoModelBody !== 0`，fallback 到 DEFAULT_MODEL。✅ 防禦成功。

#### 路徑 C：傳入正常模型

```
輸入：model = "openai/gpt-4o"
→ parseModelString("openai/gpt-4o") → detectAutoModelBody = 0
→ modelBody = { providerID: "openai", modelID: "gpt-4o" }
```

**結果：** ✅ 正常運作。

### 結論

| 攻擊路徑 | 能否繞過 | 防禦機制 |
|----------|----------|----------|
| AUTO 變體 | ❌ 否 | `parseModelString` 全鏈檢測 → fallback |
| 部分 AUTO | ❌ 否 | `_detectAutoModelBody` → fallback |
| 正常模型 | N/A | 正常解析 |

---

## 入口點 3：`arise-background` + `background-manager`（背景任務）

**檔案：** `src/tools/arise-background.ts:52-58`、`src/tools/lib/background-manager.ts:846-852`
**風險等級：** 🟡 中等

### 程式碼

```typescript
// arise-background.ts
const task = await manager.launch({
  shadow, prompt, description,
  parentSessionId: context.sessionID,
  model,              // ← 用戶傳入的 model
});

// background-manager.ts
const parentModel = getSessionModel(opts.parentSessionId);
const modelBody = resolveModelContext(
  parentModel,
  opts.shadow as IAllShadowAgentsName,
  undefined,          // ← 不傳入 config
  opts.model          // ← 用戶傳入的 model
);
```

### 分析

與 `arise-summon` 不同的是，**背景任務不傳入 `config`**（傳入 `undefined`），因此 `configModel` 始終為 `undefined`。

### 潛在繞過路徑

#### 路徑 A：AUTO 變體

與入口點 2 相同，整個解析鏈會處理。✅ 防禦成功。

#### 路徑 B：無 config 時的 fallback 差異

```
輸入：model = undefined（未指定）
→ getEffectiveModelWithFallback(parentModel, defaultModel, undefined, undefined)
  → userModel = undefined → 往下
  → configModel = undefined → 往下
  → defaultModel = SHADOW_AGENTS[shadow]?.model
  → 若 defaultModel 有效 → 回傳
  → 若 defaultModel 為 AUTO → _resolveAutoModelBase(parentModel, void 0)
    → parentModel 有效 → 回傳 parentModel
    → parentModel 為 AUTO/undefined → DEFAULT_MODEL
```

**結果：** ✅ 防禦成功。

### 結論

| 攻擊路徑 | 能否繞過 | 防禦機制 |
|----------|----------|----------|
| AUTO 變體 | ❌ 否 | 同入口點 2 |
| 無 config 差異 | ❌ 否 | fallback 鏈更短但仍有 DEFAULT_MODEL |

---

## 入口點 4：`event-handler`（唯讀日誌）

**檔案：** `src/plugin/event-handler.ts:187`
**風險等級：** 🟢 無風險

### 程式碼

```typescript
const model = sessionId ? getSessionModel(sessionId) : undefined;
```

### 分析

此處僅用於日誌記錄，不參與任何模型解析或 SDK 呼叫。**無法被利用來繞過檢查**。

---

## 核心函數安全性分析 / Core Function Security Analysis

### `parseModelString` — 第一道防線

**防禦層級：** L1

| 步驟 | 防禦內容 | 攔截的攻擊 |
|------|----------|------------|
| 1. `_trimLazy` | 去除首尾空白 | `" AUTO "` → `"AUTO"` |
| 2. `_isEmpty` | 空值檢測 | `""`、`undefined` → type=1 |
| 3. `normalizeModelString` | 去除多餘分隔符 | `"AUTO/."` → `"AUTO"` |
| 4. `_isAutoModel` | AUTO 寬鬆匹配 | `"auto"`、`"/AUTO"` → type=1 |
| 5. `split("/")` | 格式驗證 | `"invalid"` → type=1 |
| 6. 空段檢測 | 連續斜線檢測 | `"a//b"` → RangeError |
| 7. `_detectAutoModelBody` | 二次 AUTO 檢測 | `"AUTO/gpt-4"` → type=2 |

### `_isAutoModel` — AUTO 檢測

**防禦層級：** L2

```typescript
export function _isAutoModel(model?: string): model is typeof AUTO_MODEL {
  if (typeof model !== "string") return false;
  if (model === AUTO_MODEL) return true;                    // 嚴格匹配
  return model.trim().toUpperCase() === AUTO_MODEL;         // 寬鬆匹配
}
```

**可攔截的變體：**
- `"AUTO"` ✅
- `"auto"` ✅
- `"Auto"` ✅
- `" AUTO "` ✅
- `"AUTO\n"` ✅
- `"\tAUTO\t"` ✅

**無法攔截的變體：**
- `"AUTO_MODEL"` ❌（trim + toUpperCase 後不等於 "AUTO"）
- `"AUTO-1"` ❌（同上）

但這些變體不會被誤認為 AUTO，它們會作為普通模型字串進入 `parseModelString`，最終因為缺少 `/` 而被判定為無效（type=1）。

### `_detectAutoModelBody` — 二次 AUTO 檢測

**防禦層級：** L3

```typescript
const detectAutoProvider = !providerID.length || _isAutoModel(providerID) || providerID === 'UNDEFINED' || providerID === 'NULL';
const detectAutoModel = !modelID.length || _isAutoModel(modelID) || modelID === 'UNDEFINED' || modelID === 'NULL';
```

**額外檢測：**
- 空字串 → 視為 AUTO
- 字串 `"undefined"` → 視為 AUTO
- 字串 `"null"` → 視為 AUTO

### `resolveModelContext` — 最終防線

**防禦層級：** L4

```typescript
if (parsed.detectAutoModelBody || !parsed.modelBody) {
  return parseModelString(DEFAULT_MODEL).modelBody as IModelBody;
}
```

**所有無效情況都會 fallback 到 `DEFAULT_MODEL`。**

---

## 總結 / Summary

### 整體評估

| 入口點 | 風險等級 | 能否繞過 | 說明 |
|--------|----------|----------|------|
| `chat.params` Hook | 🟡 中等 | ❌ 否 | 寫入無驗證，但讀取時有完整檢測鏈 |
| `arise-summon` | 🟢 低 | ❌ 否 | 完整解析鏈 |
| `arise-background` | 🟡 中等 | ❌ 否 | 不讀取 config，但仍有完整解析鏈 |
| `event-handler` | 🟢 無風險 | ❌ 否 | 唯讀日誌 |

### 防禦深度

```
用戶輸入
    │
    ▼
┌──────────────────────────────────┐
│ L1: parseModelString             │  trim → normalize → AUTO → split → detect
│   ├─ _trimLazy                   │  去除空白
│   ├─ normalizeModelString        │  去除多餘分隔符
│   ├─ _isAutoModel                │  嚴格 + 寬鬆 AUTO 匹配
│   └─ _detectAutoModelBody        │  二次 AUTO 檢測（含 undefined/null 字串）
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ L2: getEffectiveModelWithFallback│  fallback 鏈
│   ├─ userModel（AUTO → undefined）│
│   ├─ configModel（AUTO → fallback）│
│   ├─ defaultModel（AUTO → fallback）│
│   ├─ parentModel（AUTO → fallback）│
│   └─ DEFAULT_MODEL（最終防線）    │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ L3: resolveModelContext fallback │  最終檢查
│   if (detectAutoModelBody || !modelBody)
│     → return DEFAULT_MODEL
└──────────────────────────────────┘
```

### 已知弱點與改善建議

| # | 弱點 | 嚴重度 | 建議 |
|---|------|--------|------|
| 1 | `cacheSessionModel` 無輸入驗證 | 低 | 添加 `parseModelString` 驗證，拒絕 AUTO 變體寫入快取 |
| 2 | `background-manager` 不讀取 config | 低 | 考慮是否應傳入 config 以保持一致性 |
| 3 | `_isAutoModel` 不檢測 `"AUTO_MODEL"` 等變體 | 極低 | 這些變體不會被誤認為 AUTO，但可考慮添加白名單機制 |

### 結論

**目前的模型檢查機制具有多層防禦，無法被繞過。** 即使攻擊者能控制任意入口點的輸入，最終都會被 `parseModelString` 的檢測鏈或 `resolveModelContext` 的 fallback 機制攔截，並回退到 `DEFAULT_MODEL`。
