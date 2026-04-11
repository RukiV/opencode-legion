# LSP 監控策略深度分析
# LSP Monitoring Strategy Deep Analysis

## 專案背景 (Project Context)

- **專案名稱:** [opencode-arise](https://github.com/fredrezones55/opencode-arise)
- **語言/Runtime:** TypeScript / Bun
- **包管理器:** pnpm
- **核心功能:** 開發代理、配置管理、任務追蹤、測試運行
- **關鍵模組:** agents/, config/, types/, utils/
- **核心工具:** arise_summon, arise_background, webstorm_* API 等。

## 當前環境 (Current Environment)

### 可用工具 (Available Tools)

| 工具 | 類型 | 主要用途 | 優先順序 |
|------|----------|----------|
| [webstorm_get_services_output](#webstorm_get_services_output) | Service | 獲取當前服務的輸出 (LSP 相關 Session) | ⭐⭐⭐ |
| [webstorm_get_console_output](#webstorm_get_console_output) | Console | 獲取控制台輸出 (包含 LSP 事件) | ⭐⭐⭐ |
| [webstorm_get_running_processes](#webstorm_get_running_processes) | Process | 獲取當前運行進程 (ts-server, lsp-client 等) | ⭐⭐⭐ |
| [webstorm_get_terminal_output](#webstorm_get_terminal_output) | Terminal | 獲取終端輸出 | ⭐⭐ |
| [write](#write) | File Operation | 通用檔案寫入 (Markdown, JSON, YAML 等) | ⭐⭐⭐ |
| [webstorm_create_new_file](#webstorm_create_new_file) | File Operation | IDE 集成創建新檔案 (TS/JS/TSX 等) | ⭐⭐ |
| [webstorm_replace_text_in_file](#webstorm_replace_text_in_file) | Text Operation | IDE 集成文本替換 (源代碼) | ⭐⭐ |
| [ptyspawn](#ptyspawn) | PTY Management | PTY 會話管理 (終端控制) | ⭐⭐ |
| [arise_summon](#arise_summon) | Shadow Agent | 同步執行 Shadow Agent | ⭐⭐ |
| [arise_background](#arise_background) | Shadow Agent | 背景執行 Shadow Agent | ⭐⭐ |

## 建議策略 (Recommended Approach)

### 策略選擇：Hybrid Tracing + Logging

**首選策略：Tracing (追蹤)**

> 選擇 Tracing 而非 Logging 的理由：
>
> - **Logging (記錄)** 只能告訴您「在某個時間點發生了什麼」（例如：`textDocument/didChange` 事件發生了）。
> - **Tracing (追蹤)** 則允許您記錄**從事件發送到接收方（即 Agent/WebStorm 介面）的完整路徑與耗時**。
>
> 由於我們有 WebStorm 接口（如 `webstorm_get_services_output`），我們可以鎖定某個特定的 LSP Session ID，並追蹤該 Session 的所有事件，這能解決「事件發生了，但為什麼處理慢？」的問題。

**次要策略：Logging (記錄)** → 作為補充

### 策略價值

| 策略 | 適用的問題 | 優勢 |
|------|----------|----------|
| **Tracing (追蹤)** | 事件延遲、性能瓶頸、路徑追蹤 | 完整性、精確時序分析 |
| **Logging (記錄)** | 事件發生頻率、特定事件觸發 | 快速調試、事件觸發驗證 |

## 具體行動步驟 (Actionable Steps)

### **Step 1: 識別或啟動 LSP Session (Discovery & Initialization)**

- **目標:** 獲得一個可以被我們監控的 Session ID。
- **行動:** 呼叫 `webstorm_get_services_output`。這將列出所有正在運行的服務（Sessions），其中應該包含 LSP-相關的 Session（例如：`LSP Server`、`TypeScript Language Server` 等）。
- **備份:** 若找不到，則考慮使用 `webstorm_get_running_processes` 尋找 LSP 相關的 `ts-server` 或 `lsp-client` 進程。
- **預期輸出:**
  ```
  services_output
  ├── session_id: "LSP_Server_001"
  ├── name: "TypeScript Language Server"
  ├── output: ...
  └── status: running
  ```

### **Step 2: 啟動事件追蹤 (Instrumentation - Tracing)**

- **目標:** 啟動一個專門的監控機制來捕捉 LSP Events。
- **行動:** 選擇在 Step 1 中得到的 **Session ID**，並配置 `webstorm_get_services_output` 的輸出，確保它輸出所有事件的詳細資訊（如果該 Session 支持）。
- **若無法直接透過 `get_services_output` 追蹤所有 Events，則需要深入到 PTY 層級：**
  - 使用 `pty_list` 找到對應的 LSP 服務進程
  - 使用 `pty_read` 或 `pty_read` 搭配一個監控腳本來持續讀取事件日誌

### **Step 3: 啟用事件訂閱 (Subscription)**

- **目標:** 將監控層級從「全量追蹤」降級到「特定事件訂閱」，以避免日誌爆炸。
- **行動:** 利用 `webstorm_set_breakpoint_condition` (如果 LSP 框架允許在內部設置斷點) 或在自定義的 LSP Handler 中，僅攔截目標事件（例如：`textDocument/didChange`），並在該事件發生時，利用專屬的 Logging 機制（例如：`console.log()` 或 `eventEmitter.emit('didChange', event)`）來記錄。
- **預期輸出:**
  ```
  console
  ├── session_id: "LSP_Subscription_001"
  ├── name: "LSP Event Subscription"
  ├── output: ...
  └── status: running
  ```

## 檢查點 (Verification)

完成上述步驟後，您需要檢查以下幾點來確認監聽已成功：

### 1. `webstorm_get_services_output` 輸出檢查

**執行此工具後，預期在輸出的 `output` 欄位中，您必須能看到：**

- LSP Session 的啟動訊息
- 在您手動觸發代碼編輯（例如在 editor 中輸入字元）時，**新的事件訊息必須即時出現在輸出中**

**檢查命令:**
```bash
webstorm_get_services_output
```

### 2. `pty_list` 狀態檢查

- 確保 LSP 服務的 PTY Session 狀態為 `running`
- 檢查它的 `lineCount` 在您操作後有增長

**檢查命令:**
```bash
pty_list
```

### 3. 特定事件驗證 (Critical)

- 如果您遵循了 Step 3（訂閱特定事件），請嘗試觸發該事件
- 然後立即呼叫 `webstorm_get_services_output`
- **確認您想監聽的那個特定事件（如 `didChange`）的訊息，確實存在於輸出中**，而不是被忽略了

## 錯誤決策流程分析 (Error Analysis)

### 錯誤 1: 工具名稱混淆 - `webstorm_write` (不存在)

**問題核心：**
在上一次的回應中說：
> 「我將使用 `webstorm_write` 工具來執行此操作。」

**實際上，正確的工具名稱是 `write`，而非 `webstorm_write`！**

`webstorm_write` 是將 `webstorm_replace_text_in_file` 與 `write` 工具名稱混合後的錯誤名稱。

#### 可用工具對比：

| 錯誤名稱 | 正確名稱 | 用途 |
|----------|----------|------|
| ❌ `webstorm_write` | ✅ `write` | 寫入本地檔案到項目根目錄 (`docs/` 目錄) |
| ⚠️ `webstorm_replace_text_in_file` | (也可用) | 僅用於編輯當前專案內的現有檔案 (透過 IDE) |
| ⚠️ `webstorm_create_new_file` | (也可用) | 透過 IDE 創建新檔案 |

### 錯誤 2: 工具路徑架構認知錯誤

**問題的深層原因：**
由於項目是 **OpenCode 插件型專案**，它同時支援兩種檔案操作模式：

1. **`write` 工具** - 適合寫入到專案的 **`docs/` 等根目錄下的 Markdown 配置文件**
2. **`webstorm_create_new_file` 工具** - 適合透過 **IDE 創建/編輯** 專案內的源語言程式碼 (TS/JS/React 組件等)

**這次的情況：**
我們要寫入的是 `docs/lsp-monitoring-strategy.md` 這樣一個 **Markdown 配置文件**，所以 **`write` 工具** 是最正確的選擇。

### 錯誤 3: 決策流程錯誤

```
用戶需求：Markdown 配置文件寫入
    │
    ▼
Step 1: 識別檔案類型
    │
    ├─ 類型：Markdown (.md)
    └─ 候選工具：
        │
        ├─ write ✅ (通用，簡單，無依賴)
        │   └─ 優點：
        │       - 支援所有配置文件類型
        │       - 不需等待 IDE 同步
        │       - 執行速度較快
        │
        └─ webstorm_create_new_file ⚠️
            └─ 優點：
                - IDE 集成
                - 即時編碼提示
            └─ 缺點：
                - 需要 IDE 載入
                - 較慢（IDE 同步）
    │
    ▼
Step 2: 優先順序決策
    │
    ├─ 簡單快速寫入 → write ✅ (首選)
    │
    └─ IDE 集成需求 → webstorm_* ⚠️ (次選)
    │
    ▼
Step 3: 執行 ✅
    │
    └─ 呼叫 `write(...)` 或 `webstorm_create_new_file(...)`
```

### 4. 完整決策流程樹

```
Step 1: 確定任務類型 - Markdown 配置文件寫入
    │
    ├─ 候選工具 A: write ✅ (最簡潔、通用)
    │   └─ 優點：適用所有類型檔案 (.md, .json, .txt, etc.)
    │
    └─ 候選工具 B: webstorm_create_new_file ⚠️
        └─ 優點：透過 IDE 打開檔案

Step 2: 錯誤地將 `webstorm-` 前綴加到 `write` 上
    │
    └─ ❌ 產生錯誤名稱：`webstorm_write`
        └─ 腦內以為這是「webstorm_create_new_file」的變體
        └─ 但實際上 `webstorm_write` 並不存在

Step 3: 執行 ❌
    │
    └─ ❌ 「webstorm_write」不可用
```

### 5. 三個相關工具的語義區別

| 工具 | 語義 | 最佳使用場景 |
|------|----------|------|
| `write` | ✅ **通用檔案寫入** | `.md`, `.json`, `.txt`, `.toml`, `.yml` 等配置文件 |
| `webstorm_create_new_file` | ⚠️ **IDE 集成創建** | `.ts`, `.jsx`, `.tsx`, `.js`, `.vue` 等源代碼檔案 |
| `webstorm_replace_text_in_file` | ⚠️ **IDE 集成編輯** | `.ts`, `.jsx`, `.tsx` 等源代碼的文本替換 |

### 6. 決策疲勞與 haste

**情境：**
- 連續執行多個步驟後，認知負荷增加
- 快速決策時，依賴「**最近的成功經驗**」（例如：以前用 `write` 寫入過 `.md` 檔案）
- **錯誤地混合** 了 `webstorm_*` 詞綴，以為這是「更專業的選擇」

### 7. 模式記憶遺漏

**過去成功的類似任務模式：**

```
任務：寫入 Markdown 配置文件
    │
    ├─ 模式 1: 簡單寫入 → write ✅
    │       └─ 例如：docs/README.md
    │
    └─ 模式 2: IDE 集成寫入 → webstorm_create_new_file ⚠️
            └─ 例如：docs/README.md (需要 IDE 打開)
```

**當時遺漏了模式 1！**

### 8. 完整錯誤決策流程圖

```
用戶需求：Markdown 配置文件寫入
    │
    ▼
Step 1: 選擇工具
    │
    ├─ 認知 A: Markdown 檔案 → 通用寫入
    │   └─ ✅ 候選：write
    │
    └─ 認知 B: OpenCode 專案 → 使用 webstorm_*
        └─ ⚠️ 混合：webstorm_write (錯誤)
    │
    ▼
Step 2: 選擇工具 A (write) ✅
    │
    └─ ✅ 正確，但被認知 B 覆蓋
    │
    ▼
Step 3: 認知 B 介入 (OpenCode 專案)
    │
    └─ ❌ 認為 `webstorm_write` 存在
        └─ 實際上是 `write` 或 `webstorm_create_new_file`
    │
    ▼
Step 4: 執行 ❌
    │
    └─ ❌ 「webstorm_write」不可用
```

### 9. 修正後的正確決策流程

```
用戶需求：Markdown 配置文件寫入
    │
    ▼
Step 1: 識別檔案類型
    │
    ├─ 類型：Markdown (.md)
    └─ 候選工具：
        │
        ├─ write ✅ (通用，簡單，無依賴)
        │   └─ 優點：
        │       - 支援所有配置文件類型
        │       - 不需等待 IDE 同步
        │       - 執行速度較快
        │
        └─ webstorm_create_new_file ⚠️
            └─ 優點：
                - IDE 集成
                - 即時編碼提示
            └─ 缺點：
                - 需要 IDE 載入
                - 較慢（IDE 同步）
    │
    ▼
Step 2: 優先順序決策
    │
    ├─ 簡單快速寫入 → write ✅ (首選)
    │
    └─ IDE 集成需求 → webstorm_* ⚠️ (次選)
    │
    ▼
Step 3: 執行 ✅
    │
    └─ 呼叫 `write(...)` 或 `webstorm_create_new_file(...)`
```

### 10. 未來避免類似錯誤的檢查清單

| 檢查點 | 問題 | 建議動作 |
|------|----------|----------|
| **1. 工具名稱驗證** | `webstorm_write` 存在嗎？ | 快速檢查可用工具列表 |
| **2. 檔案類型檢查** | `.md` 檔案 vs 源代碼？ | 根據類型選擇工具 |
| **3. 決策層級確認** | 簡單寫入 vs IDE 集成？ | 根據需求選擇優先順序 |
| **4. 認知一致性** | 通用工具 vs IDE 工具的語義？ | 明確工具語義 |
| **5. 快速測試** | 呼叫前測試存在性？ | 使用 `write` 或 `webstorm_*` 的語義 |

### 11. 工具優先順序矩陣

| 檔案類型 | 優先工具 | 次選工具 | 語義說明 |
|----------|----------|----------|
| `.md, .json, .txt, .yml` | ✅ `write` | ⚠️ `webstorm_create_new_file` | 配置文件 → 通用寫入 |
| `.ts, .js, .tsx, .jsx, .vue` | ⚠️ `webstorm_*` | ✅ `write` | 源代碼 → IDE 集成優先 |
| `.html, .css, .scss` | ✅ `write` | ⚠️ `webstorm_create_new_file` | 樣式檔案 → 通用寫入 |
| 臨時檔案 | ✅ `write` | ⚠️ `webstorm_*` | 臨時性 → 通用寫入 |

## 建議執行結果 (Expected Output)

完成上述步驟後，預期結果：

1. **`webstorm_get_services_output`** 輸出：
   ```
   ├── session_id: "LSP_Server_001"
   ├── name: "TypeScript Language Server"
   ├── output: ...
   └── status: running
   ```

2. **`pty_list` **狀態檢查：
   - LSP 服務的 PTY Session 狀態為 `running`
   - `lineCount` 在操作後有增長

3. **特定事件驗證 (Critical)**：
   - 觸發特定事件後，`webstorm_get_services_output` 應該能看到該事件的消息

## 參考資源 (Reference Resources)

- [Jest Snapshot Testing](https://jestjs.io/docs/snapshot-testing)
- [Jest Timer Mocks](https://jestjs.io/docs/timer-mocks)
- [Bun MockTimers](https://bun.com/reference/node/test/default/MockTimers)
- [Asymmetric matchers - Expect · Jest](https://jestjs.io/docs/expect#asymmetric-matchers)
- [測試框架 API 重構範例](./test-file-best-practices/examples.md) - 補充 Jest 與 Bun 測試相容的 API 重構範例
- [test-snapshot-documentation skill](../skills/test-snapshot-documentation/SKILL.md) - 利用測試快照進行文件化的非常規使用方式