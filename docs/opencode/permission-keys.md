# 權限鍵值安全說明

> 本文檔說明 Shadow Agent 權限設定中，哪些鍵值是有效的，以及哪些鍵值可能導致系統崩潰。

---

## 一、有效的權限鍵值

### 1.1 核心權限鍵值

| 鍵值 | 說明 |
|------|------|
| `read` | 讀取檔案 |
| `edit` | 編輯/修改檔案 |
| `glob` | 檔案 glob 搜尋 |
| `grep` | 內容搜尋 |
| `list` | 列出目錄 |
| `bash` | 執行 Shell 指令 |
| `skill` | 載入 Skill |
| `lsp` | LSP 查詢 |
| `question` | 執行中提問（詢問使用者） |
| `webfetch` | 請求 URL |
| `websearch` | 網路搜尋 |
| `codesearch` | 代碼搜尋 |
| `read_background_process` | 讀取背景程序輸出 |
| `stop_background_process` | 停止背景程序 |

### 1.2 權限值說明

| 權限值 | 行為 |
|--------|------|
| `"allow"` | 允許執行 |
| `"deny"` | 拒絕執行 |
| `"ask"` | 詢問使用者，顯示選項讓使用者選擇 |
| 物件格式 | 用於 `bash`，如 `{ "git *": "allow", "rm *": "deny" }` |

---

## 二、危險的權限鍵值 — 會導致系統崩潰

> ⚠️ **絕對不要**在 Shadow Agent 權限設定中使用以下鍵值，這會導致設定崩潰，使全部代理與 OpenCode 系統變為不可用狀態。

### 2.1 崩潰鍵值清單

| 鍵值 | 說明 | 風險 |
|------|------|------|
| `task` | 啟動子代理 | 框架內部機制，設為 `allow` 會導致無限迴圈 |
| `external_directory` | 存取工作目錄外的路徑 | 框架安全防護，衝突設定會導致驗證失敗 |
| `doom_loop` | 相同工具呼叫重複 3 次 | 框架安全防護，衝突設定會導致驗證失敗 |

### 2.2 為什麼這些鍵值會導致崩潰

這些鍵值屬於 **OpenCode 框架的內部安全機制**，不同於一般的 agent 工具權限：

1. **`task`** — 框架用於啟動子代理的核心機制
   - 如果設為 `allow`，agent 可以無限啟動子代理
   - 導致資源耗盡與系統崩潰

2. **`external_directory`** — 框架的安全防護機制
   - 防止 agent 存取工作目錄外的敏感路徑
   - 設為 `allow` 會繞過此安全防護，導致不可預期的行為

3. **`doom_loop`** — 框架的循環偵測機制
   - 防止 agent 重複呼叫相同工具導致無限迴圈
   - 設為 `allow` 會繞過此保護，導致系統當機

---

## 三、question 權限行為說明

### 3.1 allow vs ask 的差異

當設定 `question` 權限為不同值時，agent 的行為：

| 權限值 | 行為 |
|--------|------|
| `"allow"` | Agent 可直接發出詢問介面，讓使用者回答 |
| `"ask"` | **詢問前先跳出確認**，詢問使用者是否允許此詢問 |
| `"deny"` | 直接拒絕執行 |

### 3.2 實際效果

當 `question` 設為 `"allow"` 時：

- Agent 可直接呼叫 question 工具
- 會彈出選項介面讓使用者選擇答案

當 `question` 設為 `"ask"` 時：

- Agent 嘗試呼叫 question 工具時，會先彈出確認介面
- 使用者可以選擇：
  - 允許這次詢問（agent 才能繼續發問）
  - 拒絕這次詢問
  - 記住選擇（套用到未來類似請求）

```
┌─────────────────────────────────┐
│  Agent 請求許可                  │
├─────────────────────────────────┤
│  🤖 想要執行 question 工具      │
│                                 │
│  [ ✅ 允許 ] [ ❌ 拒絕 ]        │
│  [ ☐ 記住我的選擇 ]             │
└─────────────────────────────────┘
```

---

## 四、正確的權限設定範例

### 4.1 安全的��限設定

```jsonc
{
  "agent": {
    "shadow-monarch": {
      "permission": {
        "read": "allow",
        "edit": "deny",
        "bash": "ask",
        "question": "allow"
      }
    },
    "beru": {
      "permission": {
        "read": "allow",
        "glob": "allow",
        "grep": "allow",
        "bash": { "git *": "allow", "rm *": "deny" }
      }
    },
    "tusk": {
      "permission": {
        "read": "allow",
        "edit": "allow",
        "question": "ask"
      }
    }
  }
}
```

### 4.2 ❌ 錯誤的權限設定（會崩潰）

```jsonc
{
  "agent": {
    "shadow-monarch": {
      "permission": {
        "task": "allow",                // ❌ 會導致崩潰
        "external_directory": "allow",  // ❌ 會導致崩潰
        "doom_loop": "allow"             // ❌ 會導致崩潰
      }
    }
  }
}
```

---

## 五、相關程式碼

- 類型定義：`src/types/types-opencode.ts`
- 權限處理：`src/agents/shadows.ts`
- 權限驗證：`src/config/schema/utils.ts`