# OpenCode 實際執行設定分析

> 本文記錄透過 `opencode debug config` 取得的**最終解析後設定值**（非單純讀取設定檔），與原始碼的差異分析。
>
> 取得時間：2026-04-05
> 取得方式：`opencode debug config`

---

## 一、Shadow Agents 實際執行設定

### 1.1 完整設定對照表

| Agent | mode | model | steps | permission (實際) | color | hidden |
|-------|------|-------|-------|-------------------|-------|--------|
| **monarch** | `primary` | `AUTO` | 16 | ❌ 未設定 | ❌ | — |
| **beru** | `subagent` | `AUTO` | 12 | ✅ `edit: deny, write: deny` | ❌ | — |
| **igris** | `subagent` | `AUTO` | 20 | ❌ 未設定 | ❌ | — |
| **bellion** | `subagent` | `AUTO` | 12 | ⚠️ `edit: deny, write: deny, bash: ask` | ❌ | — |
| **tusk** | `subagent` | `AUTO` | 18 | ❌ 未設定 | ❌ | — |
| **tank** | `subagent` | `AUTO` | 18 | ❌ 未設定 | ❌ | — |
| **shadow-sovereign** | `subagent` | `AUTO` | 24 | ❌ 未設定 | ❌ | — |
| **esil-radiru** | `all` | `AUTO` | 12 | ⚠️ `edit: deny, write: deny, webfetch: allow` | ❌ | — |

### 1.2 內建 Agent 實際設定

| Agent | mode | description | hidden |
|-------|------|-------------|--------|
| **build** | `all` | (預設) | — |
| **plan** | `all` | (預設) | — |
| **explore** | (預設) | `OpenCode explore (use @beru for arise)` | ✅ `true` |
| **general** | (預設) | (預設) | ✅ `true` |

### 1.3 全域設定

```json
{
  "model": "opencode/big-pickle",
  "default_agent": "monarch",
  "username": "User",
  "permission": {
    "bash": {
      "rm -rf *": "ask",
      "rm *": "ask",
      "sudo *": "ask",
      "Remove*": "ask",
      "git commit *": "ask",
      "git push*": "ask",
      "git reset*": "ask",
      "git checkout*": "ask"
    }
  }
}
```

---

## 二、⚠️ Permission 差異分析

### 2.1 原始碼 vs 實際執行 — 逐 Agent 比對

#### monarch

| 欄位 | 原始碼 (`shadows.ts`) | 實際執行 | 狀態 |
|------|----------------------|----------|------|
| `permission.doom_loop` | `"allow"` | ❌ 未設定 | ❌ **遺失** |
| `permission.task` | `"allow"` | ❌ 未設定 | ❌ **遺失** |

#### beru

| 欄位 | 原始碼 (`shadows.ts`) | 實際執行 | 狀態 |
|------|----------------------|----------|------|
| `permission.edit` | `"deny"` | `"deny"` | ✅ 正確 |
| `permission.write` | `"deny"` | `"deny"` | ✅ 正確 |

#### igris

| 欄位 | 原始碼 (`shadows.ts`) | 實際執行 | 狀態 |
|------|----------------------|----------|------|
| `permission.edit` | `"allow"` | ❌ 未設定 | ❌ **遺失** |
| `permission.write` | `"allow"` | ❌ 未設定 | ❌ **遺失** |
| `permission.doom_loop` | `"allow"` | ❌ 未設定 | ❌ **遺失** |

#### bellion

| 欄位 | 原始碼 (`shadows.ts`) | 實際執行 | 狀態 |
|------|----------------------|----------|------|
| `permission.edit` | `"deny"` | `"deny"` | ✅ 正確 |
| `permission.write` | `"deny"` | `"deny"` | ✅ 正確 |
| `permission.bash` | ❌ 未設定 | `"ask"` | ⚠️ **多出** |

#### tusk

| 欄位 | 原始碼 (`shadows.ts`) | 實際執行 | 狀態 |
|------|----------------------|----------|------|
| `permission.edit` | `"allow"` | ❌ 未設定 | ❌ **遺失** |
| `permission.write` | `"allow"` | ❌ 未設定 | ❌ **遺失** |

#### tank

| 欄位 | 原始碼 (`shadows.ts`) | 實際執行 | 狀態 |
|------|----------------------|----------|------|
| `permission.webfetch` | `"allow"` | ❌ 未設定 | ❌ **遺失** |

#### shadow-sovereign

| 欄位 | 原始碼 (`shadows.ts`) | 實際執行 | 狀態 |
|------|----------------------|----------|------|
| `permission.edit` | `"deny"` | ❌ 未設定 | ❌ **遺失** |
| `permission.write` | `"deny"` | ❌ 未設定 | ❌ **遺失** |

#### esil-radiru

| 欄位 | 原始碼 (`shadows.ts`) | 實際執行 | 狀態 |
|------|----------------------|----------|------|
| `permission.edit` | `"deny"` | `"deny"` | ✅ 正確 |
| `permission.write` | `"deny"` | `"deny"` | ✅ 正確 |
| `permission.webfetch` | `"allow"` | `"allow"` | ✅ 正確 |
| `permission.external_directory` | `"ask"` | ❌ 未設定 | ❌ **遺失** |

### 2.2 統計

| 狀態 | 數量 | 說明 |
|------|------|------|
| ✅ 正確 | 6 個欄位 | beru(2) + bellion(2) + esil-radiru(3, 但多出 bash) |
| ❌ 遺失 | 11 個欄位 | monarch(2) + igris(3) + tusk(2) + tank(1) + shadow-sovereign(2) + esil-radiru(1) |
| ⚠️ 多出 | 1 個欄位 | bellion.bash |

### 2.3 規律觀察

**有設定的 agent：** beru、bellion、esil-radiru
**沒有設定的 agent：** monarch、igris、tusk、tank、shadow-sovereign

觀察到有設定 permission 的 agent 都包含 `edit: "deny"`，推測 OpenCode 框架可能對**沒有明確設定 edit 權限的 agent 採用某種預設行為**，或是 `debug config` 輸出時只顯示非預設值。

---

## 三、`opencode agent list` vs `opencode debug config`

### 3.1 差異

| 命令 | 輸出內容 |
|------|----------|
| `opencode agent list` | 只列出 **build、explore、general、plan** 四個內建 agent |
| `opencode debug config` | 列出**完整解析後設定**，包含所有 shadow agents |

### 3.2 結論

- `opencode agent list` **不顯示插件註冊的 agent**，只顯示 OpenCode 內建 agent
- 要查看插件註冊的 agent 設定，必須使用 `opencode debug config`
- 或使用 `opencode debug agent <name>` 查看單一 agent 詳細設定

---

## 四、其他發現

### 4.1 自訂 Commands

`debug config` 顯示以下自訂 commands：

| Command | agent | model | 說明 |
|---------|-------|-------|------|
| `do-auto-next` | `monarch` | `opencode/big-pickle` | 自動任務執行，持續直到完成 |
| `opsx-propose` | — | — | OpenSpec 提案 |
| `opsx-explore` | — | — | OpenSpec 探索模式 |
| `opsx-archive` | — | — | OpenSpec 歸檔 |
| `opsx-apply` | — | — | OpenSpec 實作任務 |

### 4.2 MCP 伺服器

| MCP | 類型 | 狀態 |
|-----|------|------|
| `context7` | remote | ✅ 啟用 |
| `webstorm` | remote (SSE) | ✅ 啟用 |
| `webstorm-stream` | remote (Stream) | ✅ 啟用 |
| `chrome-devtools` | local | ✅ 啟用 |

### 4.3 插件列表

```json
"plugin": [
  "@bluelovers/opencode-arise@latest",
  "file:///.../codenomad-dev/dist/opencode-config/plugin/codenomad.ts"
]
```

### 4.4 未使用的 AgentConfig 欄位

以下欄位在 SDK 中支援，但目前**所有 agent 都未使用**：

| 欄位 | 說明 |
|------|------|
| `color` | Agent 顯示顏色 (hex 或主題色) |
| `variant` | 模型變體 |
| `temperature` | 生成溫度 |
| `top_p` | 採樣參數 |
| `disable` | 停用 agent |
| `tools` (deprecated) | 工具開關 |
| `hidden` | 僅 explore/general 有設定 |

---

## 六、`question` 權限說明

> 記錄時間：2026-04-05

### 6.1 用途

`question` 權限控制 agent 能否使用 **AskUserQuestion 互動式提問工具**。

| 值 | 行為 |
|----|------|
| `"allow"` | agent 可直接提問，彈出結構化對話框，暫停執行等待使用者回答 |
| `"deny"` | agent **不能使用提問工具**，必須自行判斷或停止 |
| `"ask"` | 每次提問前，先詢問 OpenCode 框架是否允許 |

### 6.2 限制的是「互動機制」，不是「說話內容」

`question: "deny"` 限制的是 **互動式提問工具**，不是限制 agent 說話的內容。

| 情境 | `question: "allow"` | `question: "deny"` |
|------|---------------------|---------------------|
| Agent 需要釐清需求 | 彈出提問工具，等你回答 | 只能自行判斷或停止 |
| Agent 在回覆中寫問句 | ✅ 可以 | ✅ 可以（只是文字） |
| Agent 提供選項讓使用者選 | ✅ 彈出選項工具 | ❌ 不能，只能文字列出 |
| Agent 遇到風險操作 | 可以彈出確認對話框 | 只能文字提醒，無法等你確認 |

**重點**：Agent 在一般回覆中仍然可以寫出問句（如「你覺得呢？」），這只是普通文字，不會暫停執行，也不會等待使用者回答。

### 6.3 SDK 型別

在 v2 SDK 中，`question` 是 `PermissionActionConfig`（簡單動作），**不支援 pattern matching**：

```typescript
// v2 SDK: PermissionConfig
{
  question?: "ask" | "allow" | "deny";  // 只能簡單設定
}
```

這與 `bash`、`read` 等支援 pattern matching 的權限不同：

```typescript
// bash 支援 pattern matching
bash?: { "git *": "allow", "rm *": "deny" }

// question 不支援 pattern matching
question?: "ask" | "allow" | "deny"  // 只能單一值
```

### 6.4 我們的設定

目前在 `shadows.ts` 中，**沒有任何 shadow agent 明確設定 `question` 權限**。

---

## 五、待確認事項

1. **Permission 遺失原因** — 需要確認是 `config-handler.ts` 的邏輯問題，還是 OpenCode 框架在序列化時省略
2. **bellion 多出的 `bash: "ask"`** — 來源不明，原始碼中未設定
3. **esil-radiru 遺失的 `external_directory: "ask"`** — 原始碼有設定但實際執行沒有
4. **`opencode debug agent <name>` 輸出** — 可針對單一 agent 取得更詳細的 permission 資訊
