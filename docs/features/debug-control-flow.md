# Debug Control 機制說明

## 概述

`debug-control` 模組負責控制 `consoleLogger` 的輸出行為，透過兩個維度的控制：

1. **開關控制 (enabled)** - 完全啟用或停用所有輸出
2. **等級控制 (level)** - 根據設定的日誌等級過濾輸出

---

## 預設啟用/關閉狀態判定機制

### 判定流程圖

```
初始化 (initDebugControl)
         │
         ▼
┌─────────────────────────────────────────┐
│  config.debug?.enabled ?? false         │  ← 讀取配置
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  consoleLogger.enabled = enabled        │  ← 設定 consoleLogger
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  currentLogLevel = config.debug?.level  │  ← 讀取等級設定
│                    ?? EnumLogLevel.Warn  │  ← 預設為 Warn
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  consoleLoggerWithLevel                 │  ← wrapConsoleLogger 包裝
│  (模組載入時自動套用)                    │     支援鏈式呼叫
└─────────────────────────────────────────┘
```

### 預設匯出

```typescript
// ✅ 主要匯出（已包裝版本，支援鏈式呼叫）
export const consoleLoggerWithLevel: typeof consoleLogger = wrapConsoleLogger(consoleLogger);

// ⚠️ 保留匯出（已棄用）
export function patchConsoleLogger(): void { ... }
```

### 預設值

| 設定 | 預設值 | 說明 |
|------|--------|------|
| `debug.enabled` | `false` | 除錯模式預設**關閉** |
| `debug.level` | `EnumLogLevel.Warn` | 日誌等級預設為 **Warn** |

### 為什麼預設關閉？

1. **生產環境考量** - 大多數使用者不需要詳細的除錯輸出
2. **減少噪音** - 預設只顯示警告和錯誤，避免過多資訊
3. **安全性** - 避免意外輸出敏感資訊

---

## 等級過濾機制

### 等級優先級

```
Error(0) < Warn(1) < Info(2) < Debug(3)
  ↑
  └── 最低詳細度                    最高詳細度 ──┘
```

### 過濾邏輯

```typescript
function canLog(level: ILogLevel): boolean {
    // 步驟 1：檢查開關
    if (!consoleLogger.enabled) {
        return false;  // 完全關閉時，無視等級
    }
    
    // 步驟 2：檢查等級
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLogLevel];
}
```

### 等級對應表

| 方法 | 等級 | 說明 |
|------|------|------|
| `error()`, `exception()`, `fail()` | Error | 錯誤訊息 |
| `warn()` | Warn | 警告訊息 |
| `log()`, `info()`, `success()`, `ok()` | Info | 一般資訊 |
| `debug()`, `dir()`, `trace()` | Debug | 除錯資訊 |

### 等級允許矩陣

| 設定等級 | 允許 Error | 允許 Warn | 允許 Info | 允許 Debug |
|----------|------------|-----------|-----------|------------|
| Error | ✅ | ❌ | ❌ | ❌ |
| Warn | ✅ | ✅ | ❌ | ❌ |
| Info | ✅ | ✅ | ✅ | ❌ |
| Debug | ✅ | ✅ | ✅ | ✅ |

---

## 鏈式呼叫支援

`consoleLoggerWithLevel` 支援 chalk 風格的鏈式呼叫，所有鏈式呼叫都會根據方法名稱自動套用等級過濾：

```typescript
import { consoleLoggerWithLevel } from './debug-control';

// 基本呼叫
consoleLoggerWithLevel.log("msg");           // Info 等級
consoleLoggerWithLevel.error("msg");        // Error 等級

// 鏈式呼叫（顏色）- 完整支援
consoleLoggerWithLevel.yellow.log("msg");   // Info 等級 ✅
consoleLoggerWithLevel.red.error("msg");    // Error 等級 ✅
consoleLoggerWithLevel.green.debug("msg");  // Debug 等級 ✅
```

> ⚠️ 注意：原始 `consoleLogger` 不支援鏈式呼叫的等級過濾，
> 請使用 `consoleLoggerWithLevel`。

---

## API 函式

### 初始化函式

| 函式 | 說明 |
|------|------|
| `initDebugControl(config)` | 根據配置初始化除錯控制 |

### 控制函式

| 函式 | 說明 |
|------|------|
| `setDebugEnabled(enabled)` | 設定除錯模式開關 |
| `getDebugEnabled()` | 取得目前除錯模式狀態 |
| `setLogLevel(level)` | 設定日誌等級 |
| `getLogLevel()` | 取得目前日誌等級 |

### 查詢函式

| 函式 | 說明 |
|------|------|
| `canLog(level)` | 檢查是否可以輸出指定等級的日誌 |
| `getDebugStatus()` | 取得完整的除錯狀態資訊 |

### 重置函式

| 函式 | 說明 |
|------|------|
| `resetDebugControl()` | 重置除錯控制狀態（用於測試） |

---

## 使用範例

### 範例 1：基本使用（推薦方式）

```typescript
import { 
  initDebugControl, 
  consoleLoggerWithLevel  // ✅ 使用已包裝版本
} from './debug-control';
import type { IAriseConfig } from './config/schema';

// 從配置初始化
const config: IAriseConfig = {
    debug: {
        enabled: true,
        level: 'debug'
    }
};

initDebugControl(config);

// 使用 consoleLoggerWithLevel（支援鏈式呼叫）
consoleLoggerWithLevel.yellow.log("Hello!");      // ✅
consoleLoggerWithLevel.green.debug("Debug info"); // ✅
consoleLoggerWithLevel.red.error("Error!");       // ✅
```

### 範例 2：動態調整

```typescript
import { 
  setDebugEnabled, 
  setLogLevel, 
  consoleLoggerWithLevel 
} from './debug-control';

// 關閉所有輸出
setDebugEnabled(false);

// 開啟並設定為 Info 等級
setDebugEnabled(true);
setLogLevel(EnumLogLevel.Info);

// 使用鏈式呼叫輸出
consoleLoggerWithLevel.yellow.log("Info level!");
```

### 範例 3：檢查輸出許可

```typescript
import { canLog, EnumLogLevel } from './debug-control';

if (canLog(EnumLogLevel.Debug)) {
    consoleLoggerWithLevel.green.debug('Detailed debug info'); // ✅
}
```

---

## 實作細節

### 兩種包裝方式比較

| 特性 | `patchConsoleLogger()` | `wrapConsoleLogger()` |
|------|------------------------|----------------------|
| 實作方式 | 直接修改原物件 | Proxy 攔截存取 |
| 類型安全 | ⚠️ 需要 `as any` | ✅ 原生支援 |
| 鏈式呼叫支援 | ❌ 不支援 | ✅ 遞迴包裝 |
| 對原物件影響 | 🔄 直接修改 | 📦 不修改 |
| 效能 | ⚡ 無額外開銷 | ⚡ Proxy 開銷小 |
| 可逆性 | ❌ 無法還原 | ✅ 切換版本即可 |
| 狀態 | ⚠️ 已棄用 | ✅ 預設使用 |

---

### wrapConsoleLogger() ⭐ 預設使用

使用 Proxy 包裝 `consoleLogger`，在存取時動態過濾。

```typescript
function wrapConsoleLogger<T extends object>(target: T): T {
    return new Proxy(target, {
        get(obj, prop, receiver) {
            const value = Reflect.get(obj, prop, receiver);

            if (typeof value === "function") {
                // 包裝日誌方法
                if (prop in LOG_METHOD_LEVELS) {
                    return function (...args) {
                        if (canLog(getMethodLogLevel(String(prop)))) {
                            value.apply(obj, args);
                        }
                    };
                }
                return value;
            }

            // 遞迴包裝巢狀物件（如 .yellow, .red）
            if (typeof value === "object" && value !== null) {
                return wrapConsoleLogger(value);
            }

            return value;
        },
    });
}

// 預設匯出的包裝版本
export const consoleLoggerWithLevel = wrapConsoleLogger(consoleLogger);
```

**優點：**
| 優點 | 說明 |
|------|------|
| ✅ 非破壞性 | 原 `consoleLogger` 保持不變 |
| ✅ 支援鏈式呼叫 | `.yellow.log()`, `.red.error()` 完全支援 |
| ✅ 類型安全 | 無需 `as any`，Proxy 本身類型正確 |
| ✅ 可逆性 | 切換回原 `consoleLogger` 即可 |
| ✅ 易於測試 | 可獨立建立包裝版本進行測試 |
| ✅ 職責分離 | 包裝邏輯與原物件分離 |

**缺點：**
| 缺點 | 說明 |
|------|------|
| ❌ Proxy 開銷 | 每次存取都會觸發 Proxy |
| ❌ 需要變更引用 | 需使用 `consoleLoggerWithLevel` |
| ❌ 實作複雜 | 需要理解 Proxy 行為 |
| ❌ 新方法需重新包裝 | 新增方法不會自動包裝 |
| ❌ 外部依賴需適配 | 第三方直接引用 `consoleLogger` 無效 |

**適用場景：**
- 需要支援鏈式呼叫 (`consoleLogger.yellow.log()`)
- 重視程式碼可維護性與可測試性
- 不希望修改全域狀態
- 需要在測試中隔離日誌輸出

---

### patchConsoleLogger() ⚠️ 已棄用

> ⚠️ **已棄用**：此函式保留供參考，建議使用 `wrapConsoleLogger` 版本

直接修改 `consoleLogger` 的方法，添加等級過濾邏輯。

```typescript
/**
 * @deprecated 建議使用 consoleLoggerWithLevel
 */
export function patchConsoleLogger(): void {
    const loggerAsAny = consoleLogger as any;

    for (const methodName of methodsToWrap) {
        const originalMethod = loggerAsAny[methodName];
        
        loggerAsAny[methodName] = function (...args) {
            if (canLog(level)) {
                originalMethod.apply(consoleLogger, args);
            }
        };
    }
}
```

**缺點：**
| 缺點 | 說明 |
|------|------|
| ❌ 破壞性修改 | 直接改變原物件，無法還原 |
| ❌ 需要 `as any` | 繞過 TypeScript 類型檢查 |
| ❌ 不支援鏈式呼叫 | `consoleLogger.yellow.log()` 會失效 |
| ❌ 測試困難 | 修改全域狀態，測試隔離困難 |
| ❌ Frozen 物件限制 | 需要 `as any` 才能修改 frozen 物件 |

**保留原因：**
- 向後相容性
- 舊版程式碼參考
- 了解兩種實作方式的差異

---

### 決策流程

```
需要實作日誌等級過濾？
        │
        ▼
┌───────────────────────────────┐
│  ✅ 預設使用 wrapConsoleLogger │  ← 支援鏈式呼叫
│  📦 consoleLoggerWithLevel    │
└───────────────────────────────┘
        │
        ▼
   是否需要支援鏈式呼叫？
   consoleLoggerWithLevel.yellow.log()
        │
        ├─ 是 → ✅ wrapConsoleLogger() 完美支援
        │
        └─ 否 → ⚠️ 仍建議使用 wrapConsoleLogger()
                  📦 consoleLoggerWithLevel
```

> **結論**：預設使用 `wrapConsoleLogger()` + `consoleLoggerWithLevel`

---

## 設定檔格式

```json
{
  "debug": {
    "enabled": true,
    "level": "warn"
  }
}
```

### 欄位說明

| 欄位 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `enabled` | boolean | `false` | 是否啟用除錯模式 |
| `level` | string | `"warn"` | 日誌等級 (`error`, `warn`, `info`, `debug`) |
