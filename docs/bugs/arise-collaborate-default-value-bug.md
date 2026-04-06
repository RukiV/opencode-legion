# arise_collaborate 參數驗證與預設值策略規劃

## 2026-04-06 (最終版)

## 核心概念定義

| 概念 | 定義 | 來源 |
|------|------|------|
| **呼叫值** | 用戶在工具呼叫時指定的參數值 | 工具參數 `args` |
| **config 值** | config 檔案中設定的值 | `config.collaborate.xxx` |
| **config_max 值** | config 檔案中的最大值限制 | `config.collaborate.xxx_max` |
| **系統預設值** | 程式碼中的常數預設值 | `const-default.ts` |
| **安全預設值** | config 值與系統預設值的**最小值** | `Math.min(config值, 系統預設值)` |
| **最終預設值** | 經過驗證的 config 值 **或** 系統預設值 | 經過驗證的 `config值 ?? 系統預設值` |
| **最終 _max 值** | 經過驗證的 config_max 值 **或** 預設最大值 | 經過驗證的 `config_max值 ?? 預設最大值` |
| **最終呼叫值** | 經過驗證後實際使用的值 | 根據策略計算 |

### 系統預設值

| 參數 | 系統預設值 | 預設最大值 |
|------|-----------|-----------|
| `total_rounds` | 8 | 15 |
| `max_concurrent` | 2 | 5 |
| `round_timeout_ms` | 180000 (3 分鐘) | - |
| `round_timeout_ms_max` | - | 600000 (10 分鐘) |

---

## 驗證函式

所有 config 值必須經過驗證，不合法時使用系統預設值：

```typescript
/**
 * 驗證數值是否合法
 * Validate if value is valid
 */
function validateConfigValue(value: unknown, systemDefault: number): number
{
    // 不合法：<= 0, 未指定, 非數值, 無限, 大於一小時(3600000ms)
    if (!isValidNumber(value) || value <= 0 || !isFinite(value) || value > 3600000)
    {
        return systemDefault;
    }
    return value;
}

function isValidNumber(value: unknown): value is number
{
    return typeof value === 'number' && !Number.isNaN(value);
}
```

---

## 一、max_concurrent 策略

### 1.1 呼叫值合法性判斷

```
呼叫值不合法 = 呼叫值 <= 0 || 呼叫值未指定 || 非數值 || 無限 || 大於一小時(3600)
```

### 1.2 執行策略

```
安全預設值 = min(config值 ?? 系統預設值 2, 系統預設值 2)
最終呼叫值 = min(呼叫值, 安全預設值)
```

#### 情境 A：呼叫值合法且 <= 安全預設值

```
config 值 = 3, 系統預設值 = 2
安全預設值 = min(3, 2) = 2
呼叫值 = 2

最終呼叫值 = min(2, 2) = 2
```

#### 情境 B：呼叫值 > 安全預設值

```
config 值 = 3, 系統預設值 = 2
安全預設值 = min(3, 2) = 2
呼叫值 = 5

最終呼叫值 = min(5, 2) = 2
```

#### 情境 C：呼叫值不合法

```
呼叫值 = 0, -1, undefined, null, NaN, Infinity

安全預設值 = min(config值, 系統預設值 2)
最終呼叫值 = 安全預設值
```

### 1.3 數學表達式

```
安全預設值 = min(
    validateConfigValue(config.max_concurrent, 系統預設值 2),
    系統預設值 2
)

if (呼叫值 is invalid):
    return 安全預設值
elif (呼叫值 > 安全預設值):
    return 安全預設值
else:
    return 呼叫值
```

---

## 二、round_timeout_ms 策略

### 2.1 呼叫值合法性判斷

```
呼叫值不合法 = 呼叫值 <= 0 || 呼叫值未指定 || 非數值 || 無限 || 大於一小時(3600000ms)
```

### 2.2 執行策略

```
最終預設值 = config值 ?? 系統預設值 180000
最終_max 值 = config_max值 ?? 預設最大值 600000

if (呼叫值 is invalid):
    return 最終預設值
elif (呼叫值 > 最終_max 值):
    return 最終_max 值
else:
    return 呼叫值
```

#### 情境 A：呼叫值不合法

```
呼叫值 = 0, -1, undefined, null, NaN, Infinity

最終呼叫值 = 最終預設值
```

#### 情境 B：呼叫值 <= 最終_max 值

```
config 值 = 180000, config_max 值 = 600000
最終預設值 = 180000
最終_max 值 = 600000
呼叫值 = 300000

300000 <= 600000 → 使用呼叫值 300000
```

#### 情境 C：呼叫值 > 最終_max 值

```
config 值 = 180000, config_max 值 = 600000
最終預設值 = 180000
最終_max 值 = 600000
呼叫值 = 900000

900000 > 600000 → 使用最終_max 值 600000
```

### 2.3 數學表達式

```
最終預設值 = validateConfigValue(config.round_timeout_ms, 180000)
最終_max 值 = validateConfigValue(config.round_timeout_ms_max, 600000)

if (呼叫值 is invalid):
    return 最終預設值
elif (呼叫值 > 最終_max 值):
    return 最終_max 值
else:
    return 呼叫值
```

---

## 三、total_rounds 策略

### 3.1 呼叫值合法性判斷

```
呼叫值不合法 = 呼叫值 <= 0 || 呼叫值未指定 || 非數值 || 無限 || 大於最終_max 值
```

### 3.2 執行策略

```
最終預設值 = config值 ?? 系統預設值 8
最終_max 值 = config_max值 ?? 預設最大值 15

if (呼叫值 is invalid):
    return 最終預設值
elif (呼叫值 > 最終_max 值):
    return 最終_max 值
else:
    return 呼叫值
```

### 3.3 數學表達式

```
最終預設值 = validateConfigValue(config.total_rounds, 8)
最終_max 值 = validateConfigValue(config.total_rounds_max, 15)

if (呼叫值 is invalid):
    return 最終預設值
elif (呼叫值 > 最終_max 值):
    return 最終_max 值
else:
    return 呼叫值
```

---

## 四、數學公式總覽

### 4.1 max_concurrent

```
安全預設值 = min(
    validateConfigValue(config.collaborate?.max_concurrent, 2),
    2
)

最終呼叫值 = min(呼叫值, 安全預設值)
```

### 4.2 round_timeout_ms

```
最終預設值 = validateConfigValue(config.collaborate?.round_timeout_ms, 180000)
最終_max 值 = validateConfigValue(config.collaborate?.round_timeout_ms_max, 600000)

if (呼叫值 is invalid):
    return 最終預設值
elif (呼叫值 > 最終_max 值):
    return 最終_max 值
return 呼叫值
```

### 4.3 total_rounds

```
最終預設值 = validateConfigValue(config.collaborate?.total_rounds, 8)
最終_max 值 = validateConfigValue(config.collaborate?.total_rounds_max, 15)

if (呼叫值 is invalid):
    return 最終預設值
elif (呼叫值 > 最終_max 值):
    return 最終_max 值
return 呼叫值
```

---

## 五、config Schema 預期變更

需要在 `src/config/schema.ts` 中新增 max 欄位：

```typescript
const CollaborateSchema = z.object({
    allowed_modes: z.array(EnumCollaborateModeSchema).optional(),
    denied_modes: z.array(EnumCollaborateModeSchema).optional(),
    total_rounds: z.number().optional(),
    total_rounds_max: z.number().optional(),     // 新增
    per_agent_rounds: z.number().optional(),
    max_concurrent: z.number().optional(),
    round_timeout_ms: z.number().optional(),
    round_timeout_ms_max: z.number().optional(), // 新增
});
```

---

## 六、實作考量

### 6.1 需要新增的常數 (`src/types/const-default.ts`)

```typescript
/**
 * Collaborate 工具預設回合超時（毫秒）
 * Default round timeout for collaborate tool
 */
export const DEFAULT_COLLABORATE_ROUND_TIMEOUT_MS = 180000 as const; // 3 分鐘

/**
 * Collaborate 工具回合超時最大上限（毫秒）
 * Maximum round timeout for collaborate tool
 */
export const COLLABORATE_ROUND_TIMEOUT_MS_MAX = 600000 as const; // 10 分鐘

/**
 * Collaborate 工具預設總回合數
 * Default total rounds for collaborate tool
 */
export const DEFAULT_COLLABORATE_TOTAL_ROUNDS = 8 as const;

/**
 * Collaborate 工具最大總回合數
 * Maximum total rounds for collaborate tool
 */
export const MAX_COLLABORATE_TOTAL_ROUNDS = 15 as const;
```

### 6.2 新增驗證函式 (`src/tools/arise-collaborate.ts`)

```typescript
/**
 * 驗證 config 數值是否合法
 * Validate config number value
 *
 * 不合法時返回系統預設值
 */
function validateConfigValue(value: unknown, systemDefault: number): number
{
    if (!isValidNumber(value) || value <= 0 || !isFinite(value) || value > 3600000)
    {
        return systemDefault;
    }
    return value;
}

/**
 * 判斷數值是否合法
 * Check if value is valid
 */
function isValidNumber(value: unknown): value is number
{
    return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * 驗證 max_concurrent
 */
function getMaxConcurrent(呼叫值: number | undefined, config: IAriseConfig): number
{
    const configValue = validateConfigValue(config.collaborate?.max_concurrent, DEFAULT_COLLABORATE_MAX_CONCURRENT);
    const 安全預設值 = Math.min(configValue, DEFAULT_COLLABORATE_MAX_CONCURRENT);
    
    if (!isValidNumber(呼叫值) || 呼叫值 <= 0 || !isFinite(呼叫值))
    {
        return 安全預設值;
    }
    
    return Math.min(呼叫值, 安全預設值);
}

/**
 * 驗證 round_timeout_ms
 */
function getRoundTimeoutMs(呼叫值: number | undefined, config: IAriseConfig): number
{
    const 最終預設值 = validateConfigValue(config.collaborate?.round_timeout_ms, DEFAULT_COLLABORATE_ROUND_TIMEOUT_MS);
    const 最終_max 值 = validateConfigValue(config.collaborate?.round_timeout_ms_max, COLLABORATE_ROUND_TIMEOUT_MS_MAX);
    
    if (!isValidNumber(呼叫值) || 呼叫值 <= 0 || !isFinite(呼叫值))
    {
        return 最終預設值;
    }
    
    if (呼叫值 > 最終_max 值)
    {
        return 最終_max 值;
    }
    
    return 呼叫值;
}

/**
 * 驗證 total_rounds
 */
function getTotalRounds(呼叫值: number | undefined, config: IAriseConfig): number
{
    const 最終預設值 = validateConfigValue(config.collaborate?.total_rounds, DEFAULT_COLLABORATE_TOTAL_ROUNDS);
    const 最終_max 值 = validateConfigValue(config.collaborate?.total_rounds_max, MAX_COLLABORATE_TOTAL_ROUNDS);
    
    if (!isValidNumber(呼叫值) || 呼叫值 <= 0 || !isFinite(呼叫值) || 呼叫值 > 最終_max 值)
    {
        return 最終預設值;
    }
    
    return 呼叫值;
}
```

---

## 七、相關檔案預期變更

| 檔案 | 變更 |
|------|------|
| `src/types/const-default.ts` | 新增 `COLLABORATE_ROUND_TIMEOUT_MS_MAX = 600000` |
| `src/config/schema.ts` | 新增 `total_rounds_max`, `round_timeout_ms_max` 欄位 |
| `src/tools/arise-collaborate.ts` | 新增驗證函式，重構參數處理邏輯 |
| `docs/features/arise-collaborate.md` | 更新文件說明 |
| `docs/bugs/arise-collaborate-default-value-bug.md` | 更新為實作規格書 |