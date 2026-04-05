# zhRegExpWithPluginEnabled 說明

## 概述

`zhRegExpWithPluginEnabled` 來自 `regexp-cjk-with-plugin-enabled` 套件，用於建立能**自動匹配中日文字符變體**的正則表達式。

它會自動將 CJK 字符展開為包含繁體、簡體、日文漢字變體的字符集合（character class），無需手動處理跨語言的字形差異。

## 基本用法

```typescript
import { zhRegExpWithPluginEnabled } from "regexp-cjk-with-plugin-enabled";

const pattern = new zhRegExpWithPluginEnabled(/高負載/);
// 實際匹配: /高[負负][載载]/i
```

## 自動展開規則

### 中文繁簡體轉換

每個繁體中文字符會自動展開為包含簡體的字符集合：

| 輸入 | 展開結果 | 說明 |
|------|----------|------|
| `負` | `[負负]` | 繁體 `負` → 簡體 `负` |
| `載` | `[載载]` | 繁體 `載` → 簡體 `载` |
| `後` | `[后後]` | 繁體 `後` → 簡體 `后` |
| `試` | `[試试]` | 繁體 `試` → 簡體 `试` |

### 日文漢字變體

部分字符會額外展開為相近的日文漢字或字形變體：

| 輸入 | 展開結果 | 說明 |
|------|----------|------|
| `再` | `[再在]` | 日文漢字變體 |
| `行` | `[型形行]` | 日文漢字相近字形 |

### 英文全形變體

英文字母也會展開為包含全形（fullwidth）字符的集合：

| 輸入 | 展開結果 | 說明 |
|------|----------|------|
| `r` | `[rｒ]` | 半形 + 全形 |
| `e` | `[eｅ]` | 半形 + 全形 |

## 實際展開範例

以下為 `test/temp2.ts` 的執行結果：

```
輸入: /高負載/
輸出: /高[負负][載载]/

輸入: /後重試/
輸出: /[后後]重[試试]/

輸入: /再試行/
輸出: /[再在][試试][型形行]/

輸入: /高負荷/
輸出: /高[負负]荷/

輸入: /retry.*after/
輸出: /[rｒ][eｅ][tｔ][rｒ][yｙ].*[aａ][fｆ][tｔ][eｅ][rｒ]/
```

## 在本專案中的應用

用於偵測伺服器回傳的高負載錯誤訊息：

```typescript
import { zhRegExpWithPluginEnabled } from "regexp-cjk-with-plugin-enabled";

export const HIGH_LOAD_PATTERN: RegExp = new zhRegExpWithPluginEnabled(
  /under\s+high\s+load|retry.+(?:after|wait)|please.+wait|高負載|後重試|再試行|高負荷/i
);

export function isHighLoadError(error: string | undefined | null): boolean
{
  if (!error) return false;
  return HIGH_LOAD_PATTERN.test(error);
}
```

### 匹配範圍

這個 pattern 同時匹配：

| 語言 | 範例訊息 |
|------|----------|
| 英文 | `The server cluster is under high load` |
| 英文 | `Rate limited. Retry after 30 seconds.` |
| 繁體中文 | `伺服器目前處於高負載狀態，請稍後重試` |
| 簡體中文 | `8 秒后重试` |
| 日文 | `8秒後に再試行: サーバークラスターは現在、高負荷となっています` |

### 冗餘注意事項

由於 `zhRegExpWithPluginEnabled` 自動展開繁簡體，某些 pattern 可能存在冗餘：

```
後重試 → [后後]重[試试]  （已涵蓋簡體「后重试」）
重试   → 重[試试]        （與上方重疊，但無害）
```

## ⚠️ Bun Bug：必須使用字串模式

> **相關檔案**：`src/types/regexp.ts`

由於 Bun 的 RegExp 實作存在 bug，**建立 `zhRegExpWithPluginEnabled` 實例時必須傳入字串模式，不可傳入 RegExp 字面量**。

### ✅ 正確寫法（字串模式）

```typescript
export const HIGH_LOAD_PATTERN: RegExp = new zhRegExpWithPluginEnabled(
  'under\\s+high\\s+load|retry.+(?:after|wait)|please.+wait|高負載|後重試|再試行|高負荷',
  'i'
);
```

展開結果（正常）：
```
zhRegExp /[uｕ][nｎ][dｄ][eｅ][rｒ]\s+[hｈ][iｉ][gｇ][hｈ]\s+[lｌ][oｏ][aａ][dｄ]|[rｒ][eｅ][tｔ][rｒ][yｙ].+(?:[aａ][fｆ][tｔ][eｅ][rｒ]|[wｗ][aａ][iｉ][tｔ])|[pｐ][lｌ][eｅ][aａ][sｓ][eｅ].+[wｗ][aａ][iｉ][tｔ]|高[負负][載载]|[后後]重[試试]|[再在][試试][型形行]|高[負负]荷/i
```

### ❌ 錯誤寫法（RegExp 字面量）

```typescript
// Bun 下展開結果異常，不要這樣寫！
export const HIGH_LOAD_PATTERN: RegExp = new zhRegExpWithPluginEnabled(
  /under\s+high\s+load|retry.+(?:after|wait)|please.+wait|高負載|後重試|再試行|高負荷/i
);
```

### 原因說明

Bun 的 `RegExp` 實作與 Node.js 存在差異，當傳入 RegExp 字面量時，`zhRegExpWithPluginEnabled` 內部的 CJK 字符展開邏輯會：
- 無法正確讀取原始 pattern 字符
- 展開過程跳過部分字符
- 最終產生不完整的匹配模式

使用字串模式可繞過此問題，確保所有 CJK 字符正確展開為繁簡體字符集合。

---

## 安裝

```bash
pnpm add regexp-cjk-with-plugin-enabled
```

## 參考

- 套件來源：`regexp-cjk-with-plugin-enabled`
- 使用位置：`src/tools/lib/background-manager.ts`
- 相關檔案：`src/types/regexp.ts`
