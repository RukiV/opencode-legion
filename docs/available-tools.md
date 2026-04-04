# 可用工具列表 / Available Tools

> 記錄日期：2026-04-05
> 此文件列出 Shadow Monarch 目前可用的所有工具及其完整定義。

---

## 📖 檔案操作 / File Operations

### `read`
讀取檔案或目錄內容。

```typescript
type read = (_: {
    filePath: string,        // 必填：檔案或目錄的絕對路徑
    offset?: number,         // 可選：起始行號（1-indexed）
    limit?: number,          // 可選：最大讀取行數
}) => any;
```

### `glob`
使用 glob 模式搜尋檔案。

```typescript
type glob = (_: {
    pattern: string,         // 必填：glob 模式（如 "**/*.ts"）
    path?: string,           // 可選：搜尋目錄（預設為當前工作目錄）
}) => any;
```

### `grep`
使用正規表達式搜尋檔案內容。

```typescript
type grep = (_: {
    pattern: string,         // 必填：正規表達式
    path?: string,           // 可選：搜尋目錄
    include?: string,        // 可選：檔案模式過濾（如 "*.ts"）
}) => any;
```

### `edit`
替換檔案中的文字。

```typescript
type edit = (_: {
    filePath: string,        // 必填：檔案路徑
    oldString: string,       // 必填：要替換的文字
    newString: string,       // 必填：替換後的文字
    replaceAll?: boolean,    // 可選：替換所有符合（預設 false）
}) => any;
```

### `write`
寫入/建立檔案。

```typescript
type write = (_: {
    content: string,         // 必填：檔案內容
    filePath: string,        // 必填：檔案路徑
}) => any;
```

---

## 🖥️ 終端/程序 / Terminal & Processes

### `bash`
執行 shell 命令。

```typescript
type bash = (_: {
    command: string,         // 必填：要執行的命令
    description: string,     // 必填：命令描述
    timeout?: number,        // 可選：超時毫秒數（預設 120000）
    workdir?: string,        // 可選：工作目錄
}) => any;
```

### `run_background_process`
執行背景程序（如 dev server）。

```typescript
type run_background_process = (_: {
    title: string,           // 必填：程序標題
    command: string,         // 必填：要執行的命令
}) => any;
```

### `list_background_processes`
列出背景程序。

```typescript
type list_background_processes = () => any;
```

### `read_background_process_output`
讀取背景程序輸出。

```typescript
type read_background_process_output = (_: {
    id: string,              // 必填：程序 ID
    method: string,          // 必填：讀取方式（full/grep/head/tail）
    pattern?: string,        // 可選：grep 模式
    lines?: number,          // 可選：讀取行數
}) => any;
```

### `stop_background_process`
停止背景程序（SIGTERM）。

```typescript
type stop_background_process = (_: {
    id: string,              // 必填：程序 ID
}) => any;
```

### `terminate_background_process`
終止並刪除背景程序。

```typescript
type terminate_background_process = (_: {
    id: string,              // 必填：程序 ID
}) => any;
```

---

## 🌐 網路 / Network

### `webfetch`
抓取網頁內容。

```typescript
type webfetch = (_: {
    url: string,             // 必填：要抓取的 URL
    format?: string,         // 可選：輸出格式（markdown/text/html，預設 markdown）
    timeout?: number,        // 可選：超時秒數
}) => any;
```

### `websearch`
網路搜尋。

```typescript
type websearch = (_: {
    query: string,           // 必填：搜尋關鍵字
    numResults?: number,     // 可選：結果數量（預設 8）
    livecrawl?: string,      // 可選：爬取模式（fallback/preferred）
    type?: string,           // 可選：搜尋類型（auto/fast/deep）
    contextMaxCharacters?: number,  // 可選：最大字元數
}) => any;
```

---

## 🤖 Shadow Agents（影子代理）/ Shadow Agents

### `arise_summon`
同步召喚影子代理（等待結果返回）。

```typescript
type arise_summon = (_: {
    shadow: string,          // 必填：代理名稱（beru/igris/bellion/tusk/tank/shadow-sovereign/esil-radiru）
    prompt: string,          // 必填：任務提示
    description: string,     // 必填：任務描述
    run_in_background: boolean,  // 必填：是否背景執行（預設 false）
    model?: string,          // 可選：指定模型
}) => any;
```

### `arise_background`
非同步召喚背景代理（僅 beru/tank/bellion）。

```typescript
type arise_background = (_: {
    shadow: string,          // 必填：代理名稱（beru/tank/bellion）
    prompt: string,          // 必填：任務提示
    description: string,     // 必填：任務描述
    model?: string,          // 可選：指定模型
}) => any;
```

### `arise_background_status`
查看背景代理狀態。

```typescript
type arise_background_status = (_: {
    current_session_only?: boolean,  // 可選：僅顯示當前會話
}) => any;
```

### `arise_background_output`
取得背景代理結果。

```typescript
type arise_background_output = (_: {
    task_id: string,         // 必填：任務 ID（arise_xxx 格式）
}) => any;
```

### `arise_background_cancel`
取消執行中的代理。

```typescript
type arise_background_cancel = (_: {
    task_id: string,         // 必填：任務 ID
}) => any;
```

### `arise_continue`
手動重試失敗的背景任務。

```typescript
type arise_continue = (_: {
    task_id: string,         // 必填：任務 ID
    force?: boolean,         // 可選：強制重試
    auto_resume?: boolean,   // 可選：啟用自動重試
    background_auto_resume?: boolean,  // 可選：啟用背景自動重試
}) => any;
```

### `arise_list_models`
列出可用 AI 模型。

```typescript
type arise_list_models = (_: {
    forceRefresh: boolean,   // 必填：是否強制重新整理
    provider?: string,       // 可選：指定提供者
}) => any;
```

### `arise_debug`
控制除錯模式。

```typescript
type arise_debug = (_: {
    enabled: boolean,        // 必填：啟用/停用
    level?: string,          // 可選：日誌等級（error/warn/info/debug）
}) => any;
```

### `arise_git_summary`
取得 Git 狀態摘要。

```typescript
type arise_git_summary = (_: {
    log_count: number,       // 必填：顯示的提交數量（預設 10）
    diff_stat: boolean,      // 必填：是否包含 diff 統計
    cwd?: string,            // 可選：目標目錄
}) => any;
```

---

## 📋 任務管理 / Task Management

### `todowrite`
建立/管理待辦清單。

```typescript
type todowrite = (_: {
    todos: Array<{
        content: string,     // 必填：任務描述
        status: string,      // 必填：狀態（pending/in_progress/completed/cancelled）
        priority: string,    // 必填：優先順序（high/medium/low）
    }>,
}) => any;
```

### `task`
委派複雜多步驟任務給內建代理。

```typescript
type task = (_: {
    description: string,     // 必填：任務描述（3-5 字）
    prompt: string,          // 必填：任務提示
    subagent_type: string,   // 必填：代理類型（bellion/beru/build/esil-radiru/explore/general/igris/plan/shadow-sovereign/tank/tusk）
    command?: string,        // 可選：觸發命令
    task_id?: string,        // 可選：繼續先前任務
}) => any;
```

---

## 🛠️ 其他工具 / Other Tools

### `skill`
載入專業技能。

```typescript
type skill = (_: {
    name: string,            // 必填：技能名稱
}) => any;
```

### `codesearch`
搜尋程式碼庫/API 文件。

```typescript
type codesearch = (_: {
    query: string,           // 必填：搜尋查詢
    tokensNum: number,       // 必填：token 數量（1000-50000）
}) => any;
```

### `context7_resolve-library-id`
解析 Context7 函式庫 ID。

```typescript
type context7_resolve-library-id = (_: {
    query: string,           // 必填：問題或任務描述
    libraryName: string,     // 必填：函式庫名稱
}) => any;
```

### `context7_query-docs`
查詢 Context7 文件。

```typescript
type context7_query-docs = (_: {
    libraryId: string,       // 必填：Context7 函式庫 ID
    query: string,           // 必填：問題或任務描述
}) => any;
```

---

## 🌐 WebStorm IDE 整合工具 / WebStorm IDE Integration

> 以下為 WebStorm MCP 工具群，提供與 WebStorm IDE 的整合能力。

| 工具 | 用途 |
|------|------|
| `webstorm_open_file_in_editor` | 在 WebStorm 中開啟檔案 |
| `webstorm_read_file` | 讀取檔案內容 |
| `webstorm_get_file_text_by_path` | 依路徑取得檔案文字 |
| `webstorm_create_new_file` | 建立新檔案 |
| `webstorm_replace_text_in_file` | 替換檔案文字 |
| `webstorm_replace_text_undoable` | 替換檔案文字（可復原） |
| `webstorm_delete_file` | 刪除檔案 |
| `webstorm_search_file` | 使用 glob 搜尋檔案 |
| `webstorm_search_text` | 搜尋文字 |
| `webstorm_search_regex` | 搜尋正規表達式 |
| `webstorm_search_symbol` | 搜尋符號（類別/方法/欄位） |
| `webstorm_search_in_files_by_text` | 在檔案中搜尋文字 |
| `webstorm_search_in_files_by_regex` | 在檔案中搜尋正規表達式 |
| `webstorm_get_file_problems` | 取得檔案問題（錯誤/警告） |
| `webstorm_build_project` | 建置專案 |
| `webstorm_reformat_file` | 格式化檔案 |
| `webstorm_find_files_by_name_keyword` | 依關鍵字搜尋檔案名稱 |
| `webstorm_find_files_by_glob` | 依 glob 模式搜尋檔案 |
| `webstorm_list_directory_tree` | 列出目錄樹 |
| `webstorm_get_all_open_file_paths` | 取得所有已開啟的檔案路徑 |
| `webstorm_get_open_editors` | 取得已開啟的編輯器資訊 |
| `webstorm_get_symbol_info` | 取得符號資訊 |
| `webstorm_rename_refactoring` | 重新命名重構 |
| `webstorm_navigate_to` | 導航到指定行/列 |
| `webstorm_highlight_text` | 高亮文字 |
| `webstorm_clear_highlights` | 清除高亮 |
| `webstorm_select_text` | 選取文字範圍 |
| `webstorm_add_conditional_breakpoint` | 新增條件中斷點 |
| `webstorm_set_breakpoint_condition` | 設定中斷點條件 |
| `webstorm_get_breakpoints` | 取得中斷點列表 |
| `webstorm_mute_breakpoints` | 靜音/恢復中斷點 |
| `webstorm_get_run_configurations` | 取得執行配置列表 |
| `webstorm_execute_run_configuration` | 執行配置 |
| `webstorm_debug_run_configuration` | 除錯執行配置 |
| `webstorm_get_console_output` | 取得主控台輸出 |
| `webstorm_get_build_output` | 取得建置輸出 |
| `webstorm_get_test_results` | 取得測試結果 |
| `webstorm_get_debug_variables` | 取得除錯變數 |
| `webstorm_get_project_structure` | 取得專案結構 |
| `webstorm_get_project_modules` | 取得專案模組 |
| `webstorm_get_project_dependencies` | 取得專案依賴 |
| `webstorm_get_repositories` | 取得 VCS 根目錄 |
| `webstorm_get_intellij_diagnostic` | 取得 IntelliJ 診斷資訊 |
| `webstorm_get_running_processes` | 取得背景程序 |
| `webstorm_manage_process` | 管理背景程序 |
| `webstorm_get_services_output` | 取得 Services 輸出 |
| `webstorm_get_mcp_companion_overview` | 取得 MCP Companion 概覽 |

---

## 🌐 Chrome DevTools 工具 / Chrome DevTools

> 以下為 Chrome 瀏覽器開發者工具群，用於瀏覽器自動化與除錯。

| 工具 | 用途 |
|------|------|
| `chrome-devtools_click` | 點擊元素 |
| `chrome-devtools_hover` | 懸停在元素上 |
| `chrome-devtools_fill` | 填寫輸入欄位 |
| `chrome-devtools_fill_form` | 填寫多個表單欄位 |
| `chrome-devtools_type_text` | 鍵盤輸入文字 |
| `chrome-devtools_press_key` | 按下按鍵 |
| `chrome-devtools_upload_file` | 上傳檔案 |
| `chrome-devtools_drag` | 拖曳元素 |
| `chrome-devtools_navigate_page` | 導航頁面（URL/前進/後退/重新整理） |
| `chrome-devtools_new_page` | 開啟新分頁 |
| `chrome-devtools_close_page` | 關閉分頁 |
| `chrome-devtools_select_page` | 選擇分頁 |
| `chrome-devtools_list_pages` | 列出所有分頁 |
| `chrome-devtools_take_screenshot` | 截圖 |
| `chrome-devtools_take_snapshot` | 取得無障礙樹快照 |
| `chrome-devtools_take_memory_snapshot` | 取得記憶體快照 |
| `chrome-devtools_evaluate_script` | 執行 JavaScript |
| `chrome-devtools_emulate` | 模擬裝置/網路/CPU |
| `chrome-devtools_resize_page` | 調整頁面尺寸 |
| `chrome-devtools_wait_for` | 等待文字出現 |
| `chrome-devtools_handle_dialog` | 處理對話框 |
| `chrome-devtools_list_console_messages` | 列出主控台訊息 |
| `chrome-devtools_list_network_requests` | 列出網路請求 |
| `chrome-devtools_get_console_message` | 取得主控台訊息 |
| `chrome-devtools_get_network_request` | 取得網路請求 |
| `chrome-devtools_performance_start_trace` | 開始效能追蹤 |
| `chrome-devtools_performance_stop_trace` | 停止效能追蹤 |
| `chrome-devtools_performance_analyze_insight` | 分析效能洞察 |
| `chrome-devtools_lighthouse_audit` | Lighthouse 稽核 |

---

## 影子代理角色一覽 / Shadow Agents Roster

| 代理 | 稱號 | 專長 |
|------|------|------|
| 🐜 `beru` | Ant King - 最快斥候 | 程式碼探索、grep 搜尋、檔案發現、模式搜尋 |
| ⚔️ `igris` | Loyal Knight - 精確執行者 | 程式碼變更、檔案編輯、指令執行、風格檢查 |
| 🎖️ `bellion` | Master Strategist - 大元帥 | 架構分析、戰略規劃、問題分解 |
| 🎨 `tusk` | Creative Shadow - UI/UX 專家 | 前端開發、UI/UX 設計、樣式、組件 |
| 🛡️ `tank` | Research Shadow - 知識收集者 | 網路搜尋、文件查詢、範例、最佳實踐 |
| 👁️ `shadow-sovereign` | Full Power - 深度推理 | 深度推理、程式碼審查、驗證、失敗恢復 |
| 🔥 `esil-radiru` | Chat Companion - 對話夥伴 | 對話交流、情感理解、意圖澄清 |

---

## 召喚方式決策 / Summoning Decision

| 情境 | 使用方式 |
|------|----------|
| 需要結果 NOW | `arise_summon`（同步，阻塞等待） |
| 需要結果 LATER（平行） | `arise_background`（非同步，beru/tank/bellion） |
| 不需要結果（fire-and-forget） | `arise_summon` + `run_in_background=true` |

---

## 工具統計 / Tool Statistics

| 分類 | 數量 |
|------|------|
| 檔案操作 | 5 |
| 終端/程序 | 6 |
| 網路 | 2 |
| Shadow Agents | 9 |
| 任務管理 | 2 |
| 其他工具 | 4 |
| WebStorm IDE | 39 |
| Chrome DevTools | 26 |
| **總計** | **93** |
