# 聊天模式參考基底分析

> 分析日期：2025-04-03
> 分析依據：`src/agents/shadows.ts` + `src/agents/lib/prompts.ts`

## 概述

分析每個 Shadow Agent 是否適合作為「聊天模式」的參考基底。

**聊天模式**的定義：
- 用於日常對話、問題諮詢、任務諮詢
- 不一定立即執行 code change
- 需要思考、分析、解釋能力的 agent

---

## 適合程度排序

| 排名 | Agent | 適合程度 | 核心優勢 |
|------|-------|----------|----------|
| 🥇 1 | **ShadowSovereign** | ★★★★★ | 深度推理、複雜問題分析 |
| 🥈 2 | **Bellion** | ★★★★☆ | 策略規劃、問題分解 |
| 🥉 3 | **Tank** | ★★★☆☆ | 外部知識查詢、語境理解 |
| 4 | **Beru** | ★★☆☆☆ | 程式碼探索對話 |
| 5 | **Igris** | ★☆☆☆☆ | 任務執行導向 |
| 6 | **Tusk** | ☆☆☆☆☆ | 專注 UI/UX，不適合 general 對話 |

---

## 詳細分析

### 🥇 1. ShadowSovereign（👁️ Full Power）

**原始 Prompt 關鍵句：**
> "Think deeply. Consider all angles. Provide comprehensive analysis with clear recommendations."

| 面向 | 評估 |
|------|------|
| **適合原因** | • 擅長**深度推理**（`reasoningEffort: High`）<br>• 習慣分析所有角度並提供清晰建議<br>• 支援 `web_search`, `web_fetch`，可補充外部知識<br>• 對話風格：思考導向、分析全面 |
| **不適合原因** | • 設計為「只在複雜情況下召喚」<br>• 預設不編輯檔案（回報分析為主）<br>• 可能是最接近「聊天」但設計上偏向高強度任務 |
| **聊天適性** | ⭐⭐⭐⭐⭐ |

---

### 🥈 2. Bellion（🎖️ Grand Marshal）

**原始 Prompt 關鍵句：**
> "Think deeply, plan carefully."
> Output format: 1. Problem analysis 2. Proposed approach 3. Step-by-step plan 4. Risks and mitigations 5. Files likely to be touched

| 面向 | 評估 |
|------|------|
| **適合原因** | • 擅長**問題分解**和**策略規劃**<br>• 輸出格式結構化（分析 → 方案 → 步驟 → 風險）<br>• 會考慮多种方案（alternatives）<br>• 對話風格：有邏輯、有層次 |
| **不適合原因** | • 明確說「you do NOT implement - you plan」<br>• 純規劃導向，可能缺乏靈活性<br>• 不編輯檔案，只能給建議 |
| **聊天適性** | ⭐⭐⭐⭐ |

---

### 🥉 3. Tank（🛡️ Research Shadow）

**原始 Prompt 關鍵句：**
> "Research thoroughly, report concisely."
> "Return findings in a structured format: 1. Source (URL/doc) 2. Key information 3. How it applies to the current task 4. Code examples if relevant"

| 面向 | 評估 |
|------|------|
| **適合原因** | • 擅長**外部知識獲取**（web search, docs, context7）<br>• 結構化輸出，適合對話式資訊分享<br>• 會提供 code examples<br>• 對話風格：資訊豐富、有引用來源 |
| **不適合原因** | • 主要 focus 在外部 research<br>• 內部程式碼理解能力不如 Beru<br>• 設計上偏向「查詢」而非「對話」 |
| **聊天適性** | ⭐⭐⭐ |

---

### 4. Beru（🐜 Ant King）

**原始 Prompt 關鍵句：**
> "Rapidly explore the codebase. Locate files, uncover patterns, and answer questions about code structure."

| 面向 | 評估 |
|------|------|
| **適合原因** | • 適合**程式碼相關對話**（找檔案、解釋結構）<br>• 會搜尋並回報 findings<br>• 對話風格：直接報告 |
| **不適合原因** | • 設計為「不要編輯、寫入、建立檔案」<br>• 主要 focus 在搜��，沒有規劃/推理 component<br>• 對話彈性有限 |
| **聊天適性** | ⭐⭐ |

---

### 5. Igris（⚔️ Loyal Knight）

**原始 Prompt 關鍵句：**
> "Execute code changes with precision. Edit files, run commands, verify results."
> "Execute with honor."

| 面向 | 評估 |
|------|------|
| **適合原因** | • 執行導向，可以快速落地實現 |
| **不適合原因** | • 設計為「implementation」不是「consultation」<br>• 習慣直接動手而非給建議<br>• 不擅長分析或規劃 |
| **聊天適性** | ⭐ |

---

### 6. Tusk（🎨 Creative Shadow）

**原始 Prompt 關鍵句：**
> "Handle all visual and frontend work. Components, styling, layouts, animations."

| 面向 | 評估 |
|------|------|
| **適合原因** | 無 |
| **不適合原因** | • 專注於 **UI/UX 視覺工作**<br>• 設計為「前端開發者」不是「顧問」<br>• 根本不適合 general 對話 |
| **聊天適性** | ☆ |

---

## 結論與建議

### 首選：ShadowSovereign

理由：
1. 最接近「聊天/對話」需要的「思考 → 分析 → 建議」流程
2. 具備 `reasoningEffort: High` 設定，輸出品質較高
3. 沒有明確限制只能做某一類任務
4. 可整合內部（code analysis）+ 外部（web search）知識

### 替代：Bellion

理由：
1. 結構化輸出格式適合「顧問」角色
2. 擅長問題分解，適合複雜任務諮詢
3. 輸出包含「風險評估」和「替代方案」

### 備註

**沒有任何一個 Shadow Agent 是專門為「聊天模式」設計的。**

這是因為 OpenCode 的架構中，這些 agents 都是作為「任務執行者」而非「對話顧問」。如果要建立聊天模式，可能需要：
1. 基於現有 prompt 調整出更通用的版本
2. 或建立新的專用 agent 配置

---

## 修改日誌

| 日期 | 修改內容 |
|------|----------|
| 2025-04-03 | 初始建立 |