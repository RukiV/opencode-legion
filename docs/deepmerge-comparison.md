# DeepMerge 函式比較

本文檔記錄三種 DeepMerge 函式在結果上的差異。

## 函式總覽

| 函式 | 位置 | 來源 |
|------|------|------|
| `deepMerge` | `src/utils/config-merge.ts` | 原始實作 |
| `deepMerge3` | `src/utils/config-merge.ts` | 我的新實作 |
| `configMergeDeep` | `src/utils/config-merge.ts` | `deepmerge-plus` 庫 |

## 函式簽章

```typescript
// deepMerge: 兩個物件合併
deepMerge(base: JsonObject, override: JsonObject): JsonObject

// deepMerge3: 兩個物件合併，支援 undefined
deepMerge3<T>(target: Partial<T>, source: Partial<T> | undefined): T

// configMergeDeep: 多個物件合併
configMergeDeep<T>(inputList: T[]): T
```

## 行為差異比較

### 1. 基本物件合併

```typescript
const base = { a: 1, b: 2 };
const override = { b: 3, c: 4 };

deepMerge(base, override)              // { a: 1, b: 3, c: 4 }
deepMerge3(base, override)             // { a: 1, b: 3, c: 4 }
configMergeDeep([base, override])      // { a: 1, b: 3, c: 4 }
```

**結果：✅ 三者相同**

---

### 2. 巢狀物件合併

```typescript
const base = { nested: { a: 1, b: 2 } };
const override = { nested: { b: 3, c: 4 } };

deepMerge(base, override)              // { nested: { a: 1, b: 3, c: 4 } }
deepMerge3(base, override)             // { nested: { a: 1, b: 3, c: 4 } }
configMergeDeep([base, override])      // { nested: { a: 1, b: 3, c: 4 } }
```

**結果：✅ 三者相同**

---

### 3. 陣列處理

```typescript
const base = { items: [1, 2, 3] };
const override = { items: [4, 5] };

deepMerge(base, override)              // { items: [4, 5] }
deepMerge3(base, override)             // { items: [4, 5] }
configMergeDeep([base, override])      // { items: [4, 5] }
```

**結果：✅ 三者相同（陣列會被替換，非合併）**

---

### 4. Null 處理

```typescript
const base = { value: "original" };
const override = { value: null };

deepMerge(base, override)              // { value: null }
deepMerge3(base, override)            // { value: null }
configMergeDeep([base, override])     // { value: null }
```

**結果：✅ 三者相同**

---

### 5. Undefined 處理（關鍵差異）

```typescript
const base = { value: "original" };
const override = undefined;

// deepMerge(base, override)           // ❌ 會出錯（需要 JsonObject）
deepMerge3(base, override)            // { value: "original" } ✅ 回傳 target
// configMergeDeep([base, override])  // ❌ 會出錯
```

**結果：`deepMerge3` 可安全處理 undefined**

---

### 6. 多物件合併

```typescript
const a = { x: 1 };
const b = { y: 2 };
const c = { z: 3 };

// 需要鏈式呼叫
deepMerge(deepMerge(a, b), c)              // { x: 1, y: 2, z: 3 }
deepMerge3(deepMerge3(a, b), c)           // { x: 1, y: 2, z: 3 }

// 原生支援陣列
configMergeDeep([a, b, c])                // { x: 1, y: 2, z: 3 }
```

**結果：✅ 三者相同，但語法不同**

---

### 7. 空物件處理

```typescript
// 空物件合併
deepMerge({}, {})                         // {}

// 空陣列（需要物件類型）
// configMergeDeep([])                     // {} (行為可能不同)

// undefined 時
deepMerge3({}, undefined)                // {}
```

**結果：✅ 三者相似**

---

## 差異總結表

| 特性 | `deepMerge` | `deepMerge3` | `configMergeDeep` |
|------|-------------|--------------|-------------------|
| **基本合併** | ✅ | ✅ | ✅ |
| **巢狀合併** | ✅ | ✅ | ✅ |
| **陣列處理** | 替換 | 替換 | 替換 |
| **null 處理** | 覆蓋 | 覆蓋 | 覆蓋 |
| **undefined 處理** | ❌ 需物件 | ✅ 安全 | ❌ 需物件 |
| **多物件支援** | 需鏈式 | 需鏈式 | ✅ 原生 |
| **不可變性** | ✅ 新物件 | ✅ 新物件 | ✅ 新物件 |

---

## 使用場景建議

| 場景 | 建議使用 |
|------|---------|
| 通用物件合併 | `deepMerge` |
| 需要安全處理 undefined | `deepMerge3` |
| 一次合併多個物件 | `configMergeDeep` |

---

## 參考

- 測試檔案：`test/merge-comparison.test.ts`
- 實作檔案：`src/utils/config-merge.ts`
