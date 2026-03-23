# 整合 SHADOW_DESCRIPTIONS 到 shadows.ts

## TL;DR

> 將 `SHADOW_DESCRIPTIONS` 從獨立的 `shadow-descriptions.ts` 移入 `shadows.ts`，統一管理 Shadow Agents 定義。

## Context

### 任務由來
用戶希望整合分散的 Shadow Agents 描述定義，避免重複維護。

### 現狀分析
| 檔案 | 職責 |
|------|------|
| `shadow-descriptions.ts` | SHADOW_DESCRIPTIONS + 工具函數 |
| `shadows.ts` | SHADOW_AGENTS (prompt、permission) |
| `tool-names.ts` | SHADOW_SHORT_DESCRIPTIONS (重複定義) |

### 循環依賴風險
- shadows.ts → shadow-descriptions.ts → tool-names.ts → shadows.ts ❌

**解決方案**：將 SHADOW_DESCRIPTIONS 移入 shadows.ts，shadow-descriptions.ts 改為從 shadows.ts import。

---

## Work Objectives

### Core Objective
將所有 Shadow Agent 描述統一到 `shadows.ts`，移除重複定義。

### Must Have
- [ ] `IShadowDescription` 介面移入 `shadows.ts`
- [ ] `SHADOW_DESCRIPTIONS` 常數移入 `shadows.ts`
- [ ] 工具函數保留在 `shadow-descriptions.ts`（從 shadows.ts import）
- [ ] `tool-names.ts` 動態生成 `SHADOW_SHORT_DESCRIPTIONS`
- [ ] 所有引用更新完成後，刪除 `shadow-descriptions.ts` 中的重複定義
- [ ] 測試通過

### Must NOT Have
- [ ] 避免循環依賴
- [ ] 不要建立 re-export 模組
- [ ] 不要保留重複的 static 描述定義

---

## Execution Strategy

### Step 1: 實作 - 將描述移入 shadows.ts ✅

1. 將 `IShadowDescription` 介面從 `shadow-descriptions.ts` 複製到 `shadows.ts` ✅
2. 將 `SHADOW_DESCRIPTIONS` 常數從 `shadow-descriptions.ts` 複製到 `shadows.ts` ✅
3. 將工具函數移入 `shadows.ts` ✅

### Step 2: 清理重複 - 刪除 shadow-descriptions.ts ✅

1. 刪除 `shadow-descriptions.ts`（避免 re-export）✅
2. 更新測試檔案直接從 `shadows.ts` import ✅

### Step 3: 測試驗證 ✅

- 執行 `pnpm test` 確保所有測試通過 ✅

---

## 執行結果

- **343 pass**, 2 skip, 0 fail
- 成功將 `SHADOW_DESCRIPTIONS` 整合進 `shadows.ts`
- 刪除 `shadow-descriptions.ts` 避免 re-export

---

## Verification Strategy

- 執行 `pnpm test` 確保所有測試通過
- 驗證 Monarch prompt 仍然正確顯示 Shadow Agents 列表

---

## Commit Strategy

- **1**: `refactor(shadows): integrate SHADOW_DESCRIPTIONS into shadows.ts`
  - shadows.ts, shadow-descriptions.ts, tool-names.ts
