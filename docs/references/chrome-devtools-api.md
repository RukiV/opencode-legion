# Chrome DevTools API 完整指南

## 概述

Chrome DevTools 工具提供了完整的瀏覽器自動化能力，涵蓋頁面管理、元素操作、JavaScript 執行、網絡監控、性能分析等功能。

---

## 🔗 瀏覽器連接模式

### 連接模式總覽

| 模式 | 啟動參數 | 行為 | 是否共用用戶視窗 |
|------|---------|------|-----------------|
| **全新實例** | 無參數（預設） | 啟動獨立的 Chrome 實例 | ❌ 完全獨立 |
| **自動連接** | `--autoConnect` | 自動連接到用戶運行的 Chrome | ⚠️ 共用視窗 |
| **手動連接** | `--browser-url` | 連接到指定的 Chrome 實例 | ⚠️ 共用視窗 |
| **無頭模式** | `--headless` | 無 UI 的 Chrome 實例 | ❌ 完全獨立 |
| **隔離模式** | `--isolated` | 使用臨時設定檔，自動清理 | ❌ 完全獨立 |

### 模式一：預設模式（全新實例）

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

**行為：**
- 啟動全新的 Chrome 實例
- 使用獨立的設定檔（`~/.cache/chrome-devtools-mcp/chrome-profile`）
- 與用戶的瀏覽器完全隔離
- **用戶看不到這個瀏覽器視窗**（除非不使用 `--headless`）

### 模式二：自動連接用戶瀏覽器（`--autoConnect`）

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--autoConnect"]
    }
  }
}
```

**優點：**
- ✅ **自動找到用戶的 Chrome 設定檔**（無需知道路徑）
- ✅ 連接到用戶正在運行的 Chrome 實例
- ✅ 共享用戶的登入狀態、Cookie、書籤等
- ✅ 使用用戶的瀏覽歷史、擴展等

**限制：**
- ⚠️ 需要 **Chrome 144+** 版本
- ⚠️ 用戶必須先在 Chrome 中啟用遠端調試：
  1. 打開 `chrome://inspect/#remote-debugging`
  2. 啟用「遠端調試」選項
  3. 允許連接提示
- ⚠️ MCP 操作會在用戶的瀏覽器視窗中執行（共用視窗）

**指定 Chrome 頻道：**
```json
{
  "args": ["-y", "chrome-devtools-mcp@latest", "--autoConnect", "--channel=canary"]
}
```

### 模式三：手動連接（`--browser-url`）

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
    }
  }
}
```

**啟動 Chrome（Windows）：**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-profile"
```

**限制：**
- ❌ 必須使用 **非預設** 的 `--user-data-dir`（Chrome 安全要求）
- ❌ 無法連接到用戶正在使用的原始設定檔
- ⚠️ 安全風險：任何應用程式都可以連接到調試端口

### 模式四：無頭模式

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--headless"]
    }
  }
}
```

**行為：**
- 啟動無 UI 的 Chrome 實例
- 適用於伺服器環境或不需要可視化的情境
- 完全獨立，不影響用戶瀏覽器

### 模式五：隔離模式

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated"]
    }
  }
}
```

**行為：**
- 創建臨時的用戶數據目錄
- 關閉後自動清理
- 完全獨立，不影響用戶瀏覽器

### 連接模式選擇建議

```
需要連接用戶瀏覽器？
    │
    ├─ 是 → 用戶有 Chrome 144+？
    │         │
    │         ├─ 是 → 使用 --autoConnect（推薦）
    │         │
    │         └─ 否 → 使用 --browser-url（需用戶手動啟動 Chrome）
    │
    └─ 否 → 需要可視化？
              │
              ├─ 是 → 使用預設模式（無參數）
              │
              └─ 否 → 使用 --headless 或 --isolated
```

---

## 📄 頁面管理

### `chrome-devtools_list_pages`

列出所有開啟的頁面。

**參數：** 無

**範例：**
```javascript
chrome-devtools_list_pages()
```

---

### `chrome-devtools_new_page`

開啟新分頁並導航到指定 URL。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `url` | string | ✅ | 要載入的 URL |
| `background` | boolean | ❌ | 是否在背景開啟（預設：false） |
| `isolatedContext` | string | ❌ | 隔離瀏覽器上下文名稱（獨立 Cookie/存儲） |
| `timeout` | number | ❌ | 超時時間（毫秒） |

**範例：**
```javascript
// 前景開啟新分頁
chrome-devtools_new_page({ 
  url: "https://example.com"
})

// 背景開啟新分頁（不搶焦點）
chrome-devtools_new_page({ 
  url: "https://example.com",
  background: true
})

// 在隔離上下文中開啟（獨立 Cookie 和存儲）
chrome-devtools_new_page({ 
  url: "https://example.com",
  isolatedContext: "my-isolated-context"
})
```

---

### `chrome-devtools_close_page`

關閉指定頁面（最後一個頁面無法關閉）。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `pageId` | number | ✅ | 要關閉的頁面 ID |

**範例：**
```javascript
chrome-devtools_close_page({ pageId: 2 })
```

---

### `chrome-devtools_select_page`

選擇頁面作為當前操作上下文。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `pageId` | number | ✅ | 頁面 ID |
| `bringToFront` | boolean | ❌ | 是否將頁面帶到最前面（預設：false） |

**範例：**
```javascript
chrome-devtools_select_page({ pageId: 1, bringToFront: true })
```

---

### `chrome-devtools_navigate_page`

導航到 URL、前進、後退或重新整理頁面。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `type` | string | ❌ | 導航類型：`url` / `back` / `forward` / `reload`（選填） |
| `url` | string | ❌ | 目標 URL（僅當 type=url 時需要） |
| `ignoreCache` | boolean | ❌ | 是否忽略快取（預設：false） |
| `handleBeforeUnload` | string | ❌ | 處理 beforeunload 對話框：`accept` / `decline`（預設：accept） |
| `initScript` | string | ❌ | 每次新文檔載入前執行的初始化腳本 |
| `timeout` | number | ❌ | 超時時間（毫秒） |

**範例：**
```javascript
// 導航到 URL
chrome-devtools_navigate_page({ type: "url", url: "https://example.com" })

// 重新整理
chrome-devtools_navigate_page({ type: "reload", ignoreCache: true })

// 返回上一頁
chrome-devtools_navigate_page({ type: "back" })

// 前進
chrome-devtools_navigate_page({ type: "forward" })
```

---

### `chrome-devtools_resize_page`

調整頁面窗口大小。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `width` | number | ✅ | 頁面寬度（像素） |
| `height` | number | ✅ | 頁面高度（像素） |

**範例：**
```javascript
// 模擬 iPhone 螢幕
chrome-devtools_resize_page({ width: 375, height: 812 })

// 模擬桌面螢幕
chrome-devtools_resize_page({ width: 1920, height: 1080 })
```

---

### `chrome-devtools_wait_for`

等待指定文字出現在頁面上（任一文字匹配即返回）。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `text` | array | ✅ | 要等待的文字陣列（任一匹配即返回） |
| `timeout` | number | ❌ | 超時時間（毫秒，預設：自動） |

**範例：**
```javascript
// 等待任一文字出現
chrome-devtools_wait_for({ text: ["載入完成", "Loading...", "Ready"] })

// 設定超時
chrome-devtools_wait_for({ text: ["成功"], timeout: 10000 })
```

---

## 🖱️ 元素操作

### `chrome-devtools_click`

點擊指定元素。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `uid` | string | ✅ | 元素的唯一識別碼（從快照中獲取） |
| `dblClick` | boolean | ❌ | 是否雙擊（預設：false） |
| `includeSnapshot` | boolean | ❌ | 是否返回點擊後的快照（預設：false） |

**範例：**
```javascript
// 單擊
chrome-devtools_click({ uid: "1_62" })

// 雙擊
chrome-devtools_click({ uid: "1_62", dblClick: true })

// 點擊並獲取快照
chrome-devtools_click({ uid: "1_62", includeSnapshot: true })
```

---

### `chrome-devtools_hover`

懸停在指定元素上（觸發 hover 效果）。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `uid` | string | ✅ | 元素的唯一識別碼 |
| `includeSnapshot` | boolean | ❌ | 是否返回懸停後的快照（預設：false） |

**範例：**
```javascript
chrome-devtools_hover({ uid: "1_100" })
```

---

### `chrome-devtools_drag`

拖拽元素到另一個元素位置。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `from_uid` | string | ✅ | 起始元素 ID |
| `to_uid` | string | ✅ | 目標元素 ID |
| `includeSnapshot` | boolean | ❌ | 是否返回拖拽後的快照（預設：false） |

**範例：**
```javascript
chrome-devtools_drag({ from_uid: "1_50", to_uid: "1_60" })
```

---

### `chrome-devtools_fill`

在輸入框中填入文字。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `uid` | string | ✅ | 輸入框元素 ID |
| `value` | string | ✅ | 要填入的文字 |
| `includeSnapshot` | boolean | ❌ | 是否返回填入後的快照（預設：false） |

**範例：**
```javascript
chrome-devtools_fill({ uid: "1_51", value: "搜索關鍵字" })
```

---

### `chrome-devtools_fill_form`

一次填充多個表單元素。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `elements` | array | ✅ | 表單元素陣列 `[{uid, value}]` |
| `includeSnapshot` | boolean | ❌ | 是否返回填充後的快照（預設：false） |

**範例：**
```javascript
chrome-devtools_fill_form({
  elements: [
    { uid: "1_10", value: "用戶名" },
    { uid: "1_11", value: "email@example.com" },
    { uid: "1_12", value: "password123" }
  ]
})
```

---

### `chrome-devtools_type_text`

使用鍵盤在當前焦點元素中輸入文字。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `text` | string | ✅ | 要輸入的文字 |
| `submitKey` | string | ❌ | 輸入後按下的鍵：`Enter` / `Tab` / `Escape` |

**範例：**
```javascript
// 輸入文字
chrome-devtools_type_text({ text: "Hello World" })

// 輸入後按 Enter
chrome-devtools_type_text({ text: "搜索內容", submitKey: "Enter" })
```

---

### `chrome-devtools_press_key`

按下鍵盤按鍵或組合鍵。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `key` | string | ✅ | 按鍵或組合鍵（如 `Enter`、`Control+A`、`Shift+F5`） |
| `includeSnapshot` | boolean | ❌ | 是否返回按鍵後的快照（預設：false） |

**支援的修飾鍵：** `Control`、`Shift`、`Alt`、`Meta`

**範例：**
```javascript
// 按 Enter
chrome-devtools_press_key({ key: "Enter" })

// 全選
chrome-devtools_press_key({ key: "Control+A" })

// 重新整理
chrome-devtools_press_key({ key: "Control+Shift+R" })
```

---

### `chrome-devtools_upload_file`

上傳文件到文件輸入元素。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `uid` | string | ✅ | 文件輸入元素 ID |
| `filePath` | string | ✅ | 要上傳的文件路徑 |
| `includeSnapshot` | boolean | ❌ | 是否返回上傳後的快照（預設：false） |

**範例：**
```javascript
chrome-devtools_upload_file({ 
  uid: "1_20", 
  filePath: "/path/to/file.pdf" 
})
```

---

### `chrome-devtools_handle_dialog`

處理瀏覽器彈出的對話框（alert、confirm、prompt）。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `action` | string | ✅ | 動作：`accept` / `dismiss` |
| `promptText` | string | ❌ | prompt 對話框的輸入文字 |

**範例：**
```javascript
// 接受對話框
chrome-devtools_handle_dialog({ action: "accept" })

// 關閉對話框
chrome-devtools_handle_dialog({ action: "dismiss" })

// 回應 prompt 對話框
chrome-devtools_handle_dialog({ action: "accept", promptText: "用戶輸入" })
```

---

## 📸 快照與截圖

### `chrome-devtools_take_snapshot`

獲取頁面的文本快照（基於無障礙樹），列出所有頁面元素及其唯一識別碼。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `verbose` | boolean | ❌ | 是否包含所有可用資訊（預設：false） |
| `filePath` | string | ❌ | 保存快照的文件路徑 |

**範例：**
```javascript
// 簡單快照
chrome-devtools_take_snapshot()

// 詳細快照
chrome-devtools_take_snapshot({ verbose: true })

// 保存到文件
chrome-devtools_take_snapshot({ filePath: "snapshot.txt" })
```

**返回格式：**
```
uid=1_0 RootWebArea "頁面標題"
  uid=1_1 link "連結文字" url="https://..."
    uid=1_2 StaticText "文字內容"
```

---

### `chrome-devtools_take_screenshot`

截取頁面或特定元素的截圖。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `format` | string | ❌ | 圖片格式：`png` / `jpeg` / `webp`（預設：png） |
| `quality` | number | ❌ | 圖片品質 0-100（JPEG/WebP 使用，預設：95） |
| `uid` | string | ❌ | 特定元素 ID（省略則截取整個頁面） |
| `fullPage` | boolean | ❌ | 是否截取完整頁面（預設：false） |
| `filePath` | string | ❌ | 保存截圖的文件路徑 |

**範例：**
```javascript
// 截取整個頁面
chrome-devtools_take_screenshot({ fullPage: true })

// 截取特定元素
chrome-devtools_take_screenshot({ uid: "1_60" })

// 保存為 JPEG
chrome-devtools_take_screenshot({ 
  filePath: "screenshot.jpg", 
  format: "jpeg", 
  quality: 80 
})
```

---

### `chrome-devtools_take_memory_snapshot`

捕獲頁面的內存堆快照，用於調試內存洩漏。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `filePath` | string | ✅ | 保存 .heapsnapshot 文件的路徑 |

**範例：**
```javascript
chrome-devtools_take_memory_snapshot({ filePath: "memory.heapsnapshot" })
```

---

## 💻 JavaScript 執行

### `chrome-devtools_evaluate_script`

在頁面中執行 JavaScript 代碼。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `function` | string | ✅ | JavaScript 函數字串（必須是可序列化的返回值） |
| `args` | array | ❌ | 傳遞給函數的參數陣列（陣列元素為頁面上元素的 uid） |

**重要限制：**
- 返回值必須是 JSON 可序列化的
- 不能返回 DOM 元素、函數或循環引用的對象

**範例：**
```javascript
// 獲取頁面標題
chrome-devtools_evaluate_script({ 
  function: "() => document.title" 
})

// 修改元素屬性
chrome-devtools_evaluate_script({ 
  function: `() => {
    document.querySelectorAll('a').forEach(link => {
      link.setAttribute('title', '中文標題');
    });
    return '修改完成';
  }`
})

// 獲取多個元素信息
chrome-devtools_evaluate_script({ 
  function: `() => {
    const links = document.querySelectorAll('a');
    return Array.from(links).map(l => ({
      text: l.textContent, 
      href: l.href
    }));
  }`
})

// 使用參數
chrome-devtools_evaluate_script({ 
  function: "(el) => el.innerText", 
  args: ["1_62"] 
})

// 開啟新視窗（彈出視窗）
chrome-devtools_evaluate_script({ 
  function: `() => {
    window.open('https://example.com', '_blank');
    return '新視窗已開啟';
  }`
})

// 開啟新視窗並指定大小（彈出視窗）
chrome-devtools_evaluate_script({ 
  function: `() => {
    window.open('https://example.com', '_blank', 'width=800,height=600');
    return '新視窗已開啟';
  }`
})
```

---

## 📡 網絡請求

### `chrome-devtools_list_network_requests`

列出頁面的所有網絡請求。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `pageSize` | number | ❌ | 每頁數量 |
| `pageIdx` | number | ❌ | 頁碼（從 0 開始） |
| `resourceTypes` | array | ❌ | 過濾資源類型 |
| `includePreservedRequests` | boolean | ❌ | 是否包含保留的請求（預設：false） |

**支援的資源類型：**
`document`、`stylesheet`、`image`、`media`、`font`、`script`、`texttrack`、`xhr`、`fetch`、`prefetch`、`eventsource`、`websocket`、`manifest`、`signedexchange`、`ping`、`cspviolationreport`、`preflight`、`fedcm`、`other`

**範例：**
```javascript
// 列出所有請求
chrome-devtools_list_network_requests()

// 只列出 XHR 和 Fetch 請求
chrome-devtools_list_network_requests({ resourceTypes: ["xhr", "fetch"] })

// 分頁
chrome-devtools_list_network_requests({ pageSize: 10, pageIdx: 0 })
```

---

### `chrome-devtools_get_network_request`

獲取特定網絡請求的詳細信息。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `reqid` | number | ❌ | 請求 ID（省略則返回當前選中的請求） |
| `requestFilePath` | string | ❌ | 保存請求體的文件路徑 |
| `responseFilePath` | string | ❌ | 保存回應體的文件路徑 |

**範例：**
```javascript
// 獲取特定請求
chrome-devtools_get_network_request({ reqid: 123 })

// 保存請求和回應到文件
chrome-devtools_get_network_request({ 
  reqid: 123, 
  requestFilePath: "request.json",
  responseFilePath: "response.json" 
})
```

---

## 📝 控制台

### `chrome-devtools_list_console_messages`

列出頁面的所有控制台消息。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `pageSize` | number | ❌ | 每頁數量 |
| `pageIdx` | number | ❌ | 頁碼（從 0 開始） |
| `types` | array | ❌ | 過濾消息類型 |
| `includePreservedMessages` | boolean | ❌ | 是否包含保留的消息（預設：false） |

**支援的消息類型：**
`log`、`debug`、`info`、`error`、`warn`、`dir`、`dirxml`、`table`、`trace`、`clear`、`startGroup`、`startGroupCollapsed`、`endGroup`、`assert`、`profile`、`profileEnd`、`count`、`timeEnd`、`verbose`、`issue`

**範例：**
```javascript
// 列出所有消息
chrome-devtools_list_console_messages()

// 只列出錯誤
chrome-devtools_list_console_messages({ types: ["error"] })

// 只列出錯誤和警告
chrome-devtools_list_console_messages({ types: ["error", "warn"] })
```

---

### `chrome-devtools_get_console_message`

獲取特定控制台消息的詳細信息。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `msgid` | number | ✅ | 消息 ID |

**範例：**
```javascript
chrome-devtools_get_console_message({ msgid: 42 })
```

---

## 🎭 設備模擬

### `chrome-devtools_emulate`

模擬設備特性、網絡條件或地理環境。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `networkConditions` | string | ❌ | 網絡條件：`Offline` / `Slow 3G` / `Fast 3G` / `Slow 4G` / `Fast 4G` |
| `cpuThrottlingRate` | number | ❌ | CPU 降速倍率 1-20（預設：1，不降速） |
| `geolocation` | string | ❌ | 地理位置 `"緯度x經度"`（如 `"48.8566x2.3522"`） |
| `userAgent` | string | ❌ | 用戶代理字符串（設為空字符串清除） |
| `colorScheme` | string | ❌ | 顏色主題：`dark` / `light` / `auto`（預設：auto） |
| `viewport` | string | ❌ | 視口尺寸 `"寬x高x設備像素比[,mobile][,touch][,landscape]"` |

**範例：**
```javascript
// 模擬離線
chrome-devtools_emulate({ networkConditions: "Offline" })

// 模擬慢速 3G
chrome-devtools_emulate({ networkConditions: "Slow 3G", cpuThrottlingRate: 4 })

// 模擬 iPhone
chrome-devtools_emulate({ 
  viewport: "375x812x3,mobile,touch",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)..."
})

// 模擬地理位置（巴黎）
chrome-devtools_emulate({ geolocation: "48.8566x2.3522" })

// 深色模式
chrome-devtools_emulate({ colorScheme: "dark" })

// 重置為默認
chrome-devtools_emulate({ userAgent: "", colorScheme: "auto" })
```

---

## ⚡ 性能分析

### `chrome-devtools_performance_start_trace`

開始性能追踪記錄。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `reload` | boolean | ❌ | 追踪開始後是否自動重新載入頁面（預設：true） |
| `autoStop` | boolean | ❌ | 是否自動停止追踪（預設：true） |
| `filePath` | string | ❌ | 保存原始追踪數據的文件路徑 |

**範例：**
```javascript
// 開始追踪（自動重新載入）
chrome-devtools_performance_start_trace({ reload: true })

// 開始追踪（不重新載入）
chrome-devtools_performance_start_trace({ reload: false })

// 保存追踪數據
chrome-devtools_performance_start_trace({ filePath: "trace.json.gz" })
```

---

### `chrome-devtools_performance_stop_trace`

停止當前的性能追踪記錄。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `filePath` | string | ❌ | 保存原始追踪數據的文件路徑 |

**範例：**
```javascript
chrome-devtools_performance_stop_trace({ filePath: "trace.json" })
```

---

### `chrome-devtools_performance_analyze_insight`

分析特定的性能洞察（需要先有追踪結果）。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `insightSetId` | string | ✅ | 洞察集合 ID |
| `insightName` | string | ✅ | 洞察名稱 |

**常見洞察名稱：**
- `DocumentLatency` - 文檔延遲
- `LCPBreakdown` - 最大內容繪製分解
- `RenderBlocking` - 渲染阻塞資源
- `SlowResource` - 慢速資源

**範例：**
```javascript
chrome-devtools_performance_analyze_insight({ 
  insightSetId: "insight-set-1",
  insightName: "LCPBreakdown" 
})
```

---

## 🔍 Lighthouse 審計

### `chrome-devtools_lighthouse_audit`

執行 Lighthouse 性能、無障礙、SEO 和最佳實踐審計。

**參數：**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `mode` | string | ❌ | 審計模式：`navigation` / `snapshot`（預設：navigation） |
| `device` | string | ❌ | 模擬設備：`desktop` / `mobile`（預設：desktop） |
| `outputDirPath` | string | ❌ | 報告輸出目錄（省略使用臨時文件） |

**審計模式說明：**
- `navigation` - 重新載入頁面並審計（包含性能指標）
- `snapshot` - 分析當前狀態（不重新載入）

**範例：**
```javascript
// 桌面端導航審計
chrome-devtools_lighthouse_audit({ mode: "navigation", device: "desktop" })

// 移動端快照審計
chrome-devtools_lighthouse_audit({ mode: "snapshot", device: "mobile" })

// 保存報告到目錄
chrome-devtools_lighthouse_audit({ 
  mode: "navigation", 
  device: "desktop",
  outputDirPath: "./reports" 
})
```

---

## 📊 工作流程範例

### 基本網站自動化流程

```javascript
// 1. 開啟網站
chrome-devtools_new_page({ url: "https://example.com" })

// 2. 等待頁面載入
chrome-devtools_wait_for({ text: ["Welcome", "首頁"], timeout: 10000 })

// 3. 獲取頁面快照
chrome-devtools_take_snapshot()

// 4. 點擊連結
chrome-devtools_click({ uid: "1_5" })

// 5. 填寫表單
chrome-devtools_fill({ uid: "1_10", value: "搜索關鍵字" })
chrome-devtools_press_key({ key: "Enter" })

// 6. 等待結果
chrome-devtools_wait_for({ text: ["結果", "搜索完成"] })

// 7. 截圖
chrome-devtools_take_screenshot({ filePath: "result.png" })
```

### 修改網頁元素流程

```javascript
// 1. 開啟網頁
chrome-devtools_new_page({ url: "https://example.com" })

// 2. 執行 JavaScript 修改元素
chrome-devtools_evaluate_script({ 
  function: `() => {
    // 修改所有連結的 title 屬性
    document.querySelectorAll('a').forEach(link => {
      link.setAttribute('title', '中文標題');
    });
    return '修改完成';
  }`
})

// 3. 驗證修改
chrome-devtools_evaluate_script({ 
  function: "() => document.querySelector('a').getAttribute('title')" 
})
```

### 性能分析流程

```javascript
// 1. 開始性能追踪
chrome-devtools_performance_start_trace({ reload: true })

// 2. 等待頁面載入完成
chrome-devtools_wait_for({ text: ["載入完成"] })

// 3. 停止追踪
chrome-devtools_performance_stop_trace()

// 4. 分析特定洞察
chrome-devtools_performance_analyze_insight({ 
  insightSetId: "insight-1",
  insightName: "LCPBreakdown" 
})

// 5. 執行 Lighthouse 審計
chrome-devtools_lighthouse_audit({ mode: "navigation", device: "mobile" })
```

### 通過 JS 開啟新視窗並操作

```javascript
// 1. 開啟主頁面
chrome-devtools_new_page({ url: "https://example.com" })

// 2. 通過 JavaScript 開啟新視窗（彈出視窗）
chrome-devtools_evaluate_script({ 
  function: `() => {
    window.open('https://target-site.com', '_blank', 'width=800,height=600');
    return '新視窗已開啟';
  }`
})

// 3. 等待新視窗載入
chrome-devtools_wait_for({ text: ["載入完成"], timeout: 10000 })

// 4. 列出所有頁面（包含新開啟的視窗）
chrome-devtools_list_pages()

// 5. 選擇新開啟的頁面（假設是 pageId=2）
chrome-devtools_select_page({ pageId: 2, bringToFront: true })

// 6. 在新視窗中執行操作
chrome-devtools_take_snapshot()
chrome-devtools_click({ uid: "1_10" })

// 7. 或使用 new_page 直接在同一瀏覽器中開啟新分頁
// （這會與 JS 開啟的視窗在同一瀏覽器實例中）
chrome-devtools_new_page({ url: "https://another-site.com" })

// 8. 切換回原始頁面
chrome-devtools_select_page({ pageId: 1 })
```

---

## 📝 注意事項

1. **UID 獲取**：元素的 `uid` 需要先通過 `take_snapshot` 獲取
2. **返回值限制**：`evaluate_script` 的返回值必須是 JSON 可序列化的
3. **頁面上下文**：操作前確保已通過 `select_page` 選擇正確的頁面
4. **超時處理**：對於網絡操作建議設定適當的超時時間
5. **快照優先**：建議先使用 `take_snapshot` 了解頁面結構，再進行操作
6. **連接模式**：
   - `--autoConnect` 可自動連接用戶瀏覽器（需 Chrome 144+）
   - 預設模式使用完全獨立的瀏覽器實例
7. **JS 開啟新視窗**：
   - `window.open()` 開啟的視窗會在同一瀏覽器實例中
   - 通過 `list_pages` 可以看到新開啟的頁面
   - 通過 `select_page` 可以切換到新頁面進行操作
   - `new_page` 開啟的是分頁（tab），不是獨立視窗
8. **安全性**：
   - `--browser-url` 模式下，任何應用都可以連接到調試端口
   - `--autoConnect` 模式下，需用戶手動啟用遠端調試

---

## 🔗 相關資源

- [Chrome DevTools MCP GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Lighthouse 文檔](https://developer.chrome.com/docs/lighthouse/)
- [無障礙樹快照](https://developer.chrome.com/docs/devtools/accessibility/reference/)

---

*最後更新：2026-03-31*
