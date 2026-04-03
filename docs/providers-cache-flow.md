# Provider Model Cache Flow / 提供者模型緩存流程

## 概述 / Overview

本文檔說明 OpenCode Arise 插件的提供者模型緩存機制，包含讀取流程、更新流程與檔案管理策略。

This document describes the provider model caching mechanism for OpenCode Arise plugin, including read flow, update flow, and file management strategy.

---

## 檔案對應 / File Mapping

| 檔案 | 用途 | 過期行為 |
|------|------|----------|
| `providers-cache.json` | 緩存（記憶體備份） | 過期不回傳，但檔案不刪除 |
| `providers-history.json` | 歷史紀錄（永久） | 永不刪除，永遠累積 |

**儲存位置**: `~/.config/opencode-arise/`

---

## 讀取流程 / Read Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    getProvidersCache()                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │ forceRefresh = true?     │
              └───────────┬─────────────┘
                   │               │
              YES  │               │  NO
                  ▼               ▼
         ┌────────────┐   ┌───────────────────────┐
         │ return null│   │ 檢查記憶體緩存        │
         └────────────┘   │ providersCache        │
                          └───────────┬───────────┘
                                      │
                                      ▼
                          ┌───────────────────────────┐
                          │ 記憶體緩存存在且未過期?   │
                          └───────────┬───────────────┘
                               │               │
                              YES              NO
                              │               │
                              ▼               ▼
                     ┌──────────────┐   ┌────────────────────────┐
                     │ 回傳記憶體資料│   │ loadProvidersCacheFromFile() │
                     └──────────────┘   └───────────┬────────────┘
                                                    │
                                                    ▼
                                        ┌────────────────────────┐
                                        │ 檔案存在且未過期?      │
                                        └───────────┬────────────┘
                                             │            │
                                            YES           NO
                                             │            │
                                             ▼            ▼
                                    ┌──────────────┐  ┌──────────┐
                                    │ 回傳檔案資料 │  │ return   │
                                    │ + 更新記憶體 │  │ null     │
                                    └──────────────┘  └──────────┘
```

---

## 更新流程 / Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│              setProvidersCache(providers, TTL, oldCache)  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────────────────────┐
          │ loadProvidersHistoryFromFile()               │
          │ (載入永久歷史紀錄 providers-history.json)     │
          └─────────────────────┬─────────────────────────┘
                                │
                                ▼
          ┌───────────────────────────────────────────────┐
          │ 歷史記錄為空?                                 │
          └─────────────────────┬─────────────────────────┘
                     │                   │
                    YES                  NO
                     │                   │
                     ▼                   ▼
    ┌────────────────────┐   ┌────────────────────────────┐
    │ extractProviderModels()│   │ updateHistoryRecords()   │
    │ (從新資料建立)      │   │ (比較新舊，更新狀態)       │
    └────────────────────┘   └─────────────┬──────────────┘
                                           │
                                           ▼
    ┌────────────────────────────────────────────────────────┐
    │ 建立 IProvidersCache 物件                           │
    │ { providers, timestamp, expiresIn, history }          │
    └─────────────────────┬───────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────────────────────┐
    │ providersCache = cache (更新記憶體緩存)              │
    └─────────────────────┬───────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────────────────────┐
    │ saveProvidersCacheToFile()                          │
    │ → outputFileSync("providers-cache.json")            │
    │ (可過期的緩存，檔案不刪除)                          │
    └─────────────────────┬───────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────────────────────┐
    │ saveProvidersHistoryToFile(history)                 │
    │ → outputFileSync("providers-history.json")          │
    │ (永久保存的歷史紀錄)                                 │
    └──────────────────────────────────────────────────────┘
```

---

## 歷史記錄更新邏輯 / History Update Logic

```
┌─────────────────────────────────────────────────────────────┐
│              updateHistoryRecords(oldHistory, newProviders)│
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────────────────────┐
          │ extractProviderModels(newProviders)          │
          │ → 建立新資料的所有 providerId/modelId         │
          └─────────────────────┬─────────────────────────┘
                                │
                                ▼
          ┌───────────────────────────────────────────────┐
          │ 遍歷舊歷史中的每個 providerId/modelId         │
          └─────────────────────┬─────────────────────────┘
                                │
                                ▼
          ┌───────────────────────────────────────────────┐
          │ 新資料中仍有此模型?                           │
          └───────────────┬───────────────────────────────┘
                 │               │
                YES              NO
                 │               │
                 ▼               ▼
    ┌────────────────────┐  ┌─────────────────────┐
    │ status = "active" │  │ status = "removed"  │
    │ lastSeen = now    │  │ (保留記錄不刪除)    │
    └────────────────────┘  └─────────────────────┘
                                │
                                ▼
          ┌───────────────────────────────────────────────┐
          │ 新資料中剩餘的模型是新加入的 → 新增記錄       │
          └───────────────────────────────────────────────┘
```

---

## 資料結構 / Data Structures

### IProviderHistoryItem

```typescript
interface IProviderHistoryItem
{
  /** 提供者 ID */
  providerId: string;
  /** 模型 ID */
  modelId: string;
  /** 首次出現時間戳 */
  firstSeen: number;
  /** 最後出現時間戳 */
  lastSeen: number;
  /** 狀態（active = 存在, removed = 已移除） */
  status: "active" | "removed";
  /** 是否為免費模型（若確定能知道） */
  free?: boolean;
}
```

### IProviderHistory

```typescript
interface IProviderHistory
{
  [providerId: string]: {
    [modelId: string]: IProviderHistoryItem;
  };
}
```

### IProvidersCache

```typescript
interface IProvidersCache
{
  /** 緩存的提供者列表 */
  providers: CachedProvider[];
  /** 緩存時間戳 */
  timestamp: number;
  /** 過期時間（毫秒），預設 5 分鐘 */
  expiresIn: number;
  /** 歷史記錄 */
  history?: IProviderHistory;
}
```

---

## 常數 / Constants

| 常數 | 值 | 說明 |
|------|-----|------|
| `DEFAULT_PROVIDERS_CACHE_TTL` | `5 * 60 * 1000` (5 分鐘) | 預設緩存過期時間 |
| `HISTORY_THRESHOLD_MS` | `30 * 60 * 1000` (30 分鐘) | 歷史記錄閾值 |
| `PROVIDERS_CACHE_FILENAME` | `providers-cache.json` | 緩存檔名 |
| `PROVIDERS_HISTORY_FILENAME` | `providers-history.json` | 歷史紀錄檔名 |

---

## API 函式 / API Functions

### setProvidersCache(providers, expiresIn, oldCache)

設定提供者緩存，並獨立儲存歷史紀錄。

Parameters:
- `providers: CachedProvider[]` - 提供者列表
- `expiresIn: number` - 過期時間（毫秒），預設 5 分鐘
- `oldCache: IProvidersCache | null` - 舊的緩存（用於比較差異）

### getProvidersCache(forceRefresh)

取得提供者緩存。

Parameters:
- `forceRefresh: boolean` - 是否強制刷新，忽略緩存

Returns: `IProvidersCache | null`

### hasValidProvidersCache()

檢查提供者緩存是否存在且有效。

Returns: `boolean`

### clearProvidersCache()

清除提供者緩存（記憶體與檔案）。

---

## 設計原則 / Design Principles

1. **檔案不刪除** - 即使緩存過期，檔案也不刪除，保留歷史資料
2. **歷史永久保存** - 使用獨立檔案 `providers-history.json` 儲存歷史紀錄
3. **狀態追蹤** - 當模型從新資料中消失時，狀態設為 `removed` 但保留記錄
4. **雙重儲存** - 緩存和歷史分開儲存，簡化管理和備份
