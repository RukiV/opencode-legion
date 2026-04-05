# OpenCode Plugin Hooks 完整分析

> 文件版本：2026-04-05
> 資料來源：SDK 類型定義 (`@opencode-ai/plugin@1.3.9`) + 官方文檔

---

## 一、Hooks 總覽

### 1.1 SDK 中定義的所有 Hooks

根據 `@opencode-ai/plugin` SDK 的類型定義 (`node_modules/@opencode-ai/plugin/dist/index.d.ts`)，共有以下 Hooks：

| Hook 名稱 | 文件分類 | SDK 行號 |
|-----------|---------|---------|
| `chat.message` | 聊天鉤子 | 146-158 |
| `chat.params` | 聊天鉤子 | 162-173 |
| `chat.headers` | 聊天鉤子 | 174-182 |
| `permission.ask` | 權限鉤子 | 183-185 |
| `command.execute.before` | 命令鉤子 | 186-192 |
| `tool.execute.before` | 工具鉤子 | 193-199 |
| `tool.execute.after` | 工具鉤子 | 207-216 |
| `tool.definition` | 工具鉤子 | 252-257 |
| `shell.env` | Shell 鉤子 | 200-206 |
| `experimental.chat.messages.transform` | 實驗性鉤子 | 217-222 |
| `experimental.chat.system.transform` | 實驗性鉤子 | 223-228 |
| `experimental.session.compacting` | 實驗性鉤子 | 236-241 |
| `experimental.text.complete` | 實驗性鉤子 | 242-248 |
| `event` | 事件鉤子 | 135-137 |
| `config` | 配置鉤子 | 138 |
| `tool` | 工具定義 | 139-141 |
| `auth` | 認證鉤子 | 142 |

### 1.2 Enum 定義

所有 Hook 名稱已定義為 TypeScript Enum，位於 `src/types/opencode/enum-hook.ts`：

```typescript
// 穩定 Hooks (Non-Experimental)
export const enum EnumOpenCodeHookNameStable {
  ChatMessage = "chat.message",
  ChatParams = "chat.params",
  ChatHeaders = "chat.headers",
  PermissionAsk = "permission.ask",
  CommandExecuteBefore = "command.execute.before",
  ToolDefinition = "tool.definition",
  ToolExecuteBefore = "tool.execute.before",
  ToolExecuteAfter = "tool.execute.after",
  ShellEnv = "shell.env",
}

// 實驗性 Hooks (Experimental)
export const enum EnumOpenCodeHookNameExperimental {
  ExperimentalChatMessagesTransform = "experimental.chat.messages.transform",
  ExperimentalChatSystemTransform = "experimental.chat.system.transform",
  ExperimentalSessionCompacting = "experimental.session.compacting",
  ExperimentalTextComplete = "experimental.text.complete",
}
```

**使用範例**：

```typescript
import { EnumOpenCodeHookNameStable, EnumOpenCodeHookNameExperimental } from "./types/opencode/enum-hook";

// 使用計算屬性名稱
return {
  async [EnumOpenCodeHookNameStable.ToolExecuteAfter](input, output) {
    // ...
  },
  async [EnumOpenCodeHookNameExperimental.ExperimentalSessionCompacting](_input, output) {
    // ...
  },
};
```

---

## 二、Hooks 詳細說明

### 2.1 已文件化 (官方文檔有說明)

以下 Hooks 在官方文檔中有明確說明和使用範例：

#### `tool.execute.before`

**用途**：在工具執行**前**攔截和修改工具參數

**使用時機**：
- 過濾危險命令（如 `rm -rf`）
- 轉義命令參數（如防止命令注入）
- 記錄工具呼叫日誌
- 根據上下文修改工具行為

**範例**（官方）：
```typescript
export const MyPlugin = async ({ $ }) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        // 轉義命令參數
        output.args.command = escape(output.args.command);
      }
    },
  };
};
```

**Arise 應用**：目前未使用此 Hook

---

#### `tool.execute.after`

**用途**：在工具執行**後**修改輸出結果

**使用時機**：
- 截斷過長的輸出
- 格式化輸出格式
- 過濾敏感資訊
- 添加額外的中繼資料

**範例**（官方）：
```typescript
export const MyPlugin = async () => {
  return {
    "tool.execute.after": async (input, output) => {
      // 截斷過長輸出
      if (output.output.length > 10000) {
        output.output = output.output.slice(0, 10000) + "\n... (truncated)";
      }
    },
  };
};
```

**Arise 應用**：`output-shaper.ts` - 用於截斷工具輸出
- 預設最大 12000 字元
- 保留頭部 70% + 尾部 20%
- 錯誤輸出完整保留

---

#### `experimental.session.compacting`

**用途**：在對話被壓縮（compaction）前自訂保留的上下文

**使用時機**：
- 確保重要的 TODO 項目不被遺失
- 保留關鍵的決策和假設
- 保留 Shadow delegation 結果
- 自訂修剪規則

**範例**（官方）：
```typescript
export const CompactionPlugin: Plugin = async (ctx) => {
  return {
    "experimental.session.compacting": async (input, output) => {
      // 注入額外的上下文
      output.context.push(`## Custom Context
Include any state that should persist:
- Current task status
- Important decisions made
- Files being actively worked on`);
    },
  };
};
```

**Arise 應用**：`compaction-preserver.ts` - 提供 Arise 特有的保留規則
- 保留所有 TODO 項目
- 保留關鍵決策
- 保留檔案路徑和修改
- 保留 Shadow delegation 結果

---

#### `event`

**用途**：接收各種 OpenCode 事件通知

**使用時機**：
- 追蹤會話狀態變化
- 記錄檔案編輯
- 處理錯誤和異常
- 發送通知

**Arise 應用**：`event-handler.ts` - 處理所有事件類型
- `session.created` - 顯示歡迎橫幅
- `session.compacted` - 記錄壓縮事件
- `session.error` - 錯誤追蹤
- `session.idle` - 空閒處理

---

#### `config`

**用途**：接收配置載入事件，可在配置載入後進行修改

**使用時機**：
- 動態調整配置
- 驗證配置完整性
- 添加預設值

**Arise 應用**：`config-handler.ts` - 處理 Agent 配置

---

#### `tool`

**用途**：定義自訂工具

**使用時機**：
- 註冊新的 AI 可呼叫工具
- 擴展 OpenCode 功能

**Arise 應用**：`tools/index.ts` - 註冊 Shadow 召喚工具

---

### 2.2 未文件化 (官方文檔無說明)

以下 Hooks 在 SDK 中存在，但官方文檔未記載：

#### `chat.message`

**用途**：在新訊息接收時攔截和修改

**使用時機**：
- 過濾或修改使用者訊息
- 添加訊息元數據
- 訊息驗證或轉換

**範例**：
```typescript
"chat.message"?: (input: {
  sessionID: string;
  agent?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  messageID?: string;
  variant?: string;
}, output: {
  message: UserMessage;
  parts: Part[];
}) => Promise<void>;
```

**Arise 應用**：目前未使用

---

#### `chat.params`

**用途**：修改發送給 LLM 的參數

**使用時機**：
- 動態調整溫度 (temperature)
- 修改 topP、topK 值
- 添加自訂模型選項
- 根據對話內容調整參數

**範例**：
```typescript
"chat.params"?: (input: {
  sessionID: string;
  agent: string;
  model: Model;
  provider: ProviderContext;
  message: UserMessage;
}, output: {
  temperature: number;
  topP: number;
  topK: number;
  options: Record<string, any>;
}) => Promise<void>;
```

**Arise 應用**：用於快取會話模型
```typescript
async "chat.params"(input) {
  if (input.model) {
    runtimeCache.cacheSessionModel(input.sessionID, input.model.providerID, input.model.id);
  }
}
```

---

#### `chat.headers`

**用途**：修改 HTTP 請求頭

**使用時機**：
- 添加自訂 headers
- 添加認證 token
- 添加追蹤 headers

**範例**：
```typescript
"chat.headers"?: (input: {
  sessionID: string;
  agent: string;
  model: Model;
  provider: ProviderContext;
  message: UserMessage;
}, output: {
  headers: Record<string, string>;
}) => Promise<void>;
```

**Arise 應用**：目前未使用

---

#### `permission.ask`

**用途**：在權限請求時進行干預

**使用時機**：
- 自訂權限處理邏輯
- 根據條件自動允許/拒絕
- 記錄權限請求

**範例**：
```typescript
"permission.ask"?: (input: Permission, output: {
  status: "ask" | "deny" | "allow";
}) => Promise<void>;
```

**Arise 應用**：目前未使用

---

#### `command.execute.before`

**用途**：在命令執行前修改命令參數

**使用時機**：
- 驗證命令參數
- 轉換命令格式
- 添加預處理邏輯

**範例**：
```typescript
"command.execute.before"?: (input: {
  command: string;
  sessionID: string;
  arguments: string;
}, output: {
  parts: Part[];
}) => Promise<void>;
```

**Arise 應用**：目前未使用

---

#### `shell.env`

**用途**：在 Shell 環境變數設定前進行修改

**使用時機**：
- 注入環境變數
- 修改路徑
- 設定 secret

**範例**：
```typescript
"shell.env"?: (input: {
  cwd: string;
  sessionID?: string;
  callID?: string;
}, output: {
  env: Record<string, string>;
}) => Promise<void>;
```

**Arise 應用**：目前未使用

---

#### `experimental.chat.messages.transform`

**用途**：在聊天訊息傳送給 LLM 前進行轉換

**使用時機**：
- 修改歷史訊息
- 添加前綴/後綴
- 訊息過濾或增強

**範例**（社群）：
```typescript
"experimental.chat.messages.transform"?: (input: {}, output: {
  messages: {
    info: Message;
    parts: Part[];
  }[];
}) => Promise<void>;
```

**社群使用**：Prepend prefix to all user messages

**⚠️ 已知問題**：
- 在 compaction 期間不會觸發 (Issue #17820, closed)
- 插件變更會被靜默丟棄 (Issue #17100, closed)
- 與 `system.transform` 無法協調 (Issue #19960, open)

**Arise 應用**：目前未使用

---

#### `experimental.chat.system.transform`

**用途**：修改系統提示

**使用時機**：
- 動態修改系統提示
- 添加條件提示
- 根據對話階段調整提示

**範例**：
```typescript
"experimental.chat.system.transform"?: (input: {
  sessionID?: string;
  model: Model;
}, output: {
  system: string[];
}) => Promise<void>;
```

**⚠️ 已知問題**：
- 插件變更會被靜默丟棄 (Issue #17100, closed)
- 與 `messages.transform` 無法協調 (Issue #19960, open)

**Arise 應用**：目前未使用

---

#### `experimental.text.complete`

**用途**：在文字補全完成後修改結果

**使用時機**：
- 後處理 LLM 輸出
- 文字格式化
- 敏感詞過濾

**範例**：
```typescript
"experimental.text.complete"?: (input: {
  sessionID: string;
  messageID: string;
  partID: string;
}, output: {
  text: string;
}) => Promise<void>;
```

**Arise 應用**：目前未使用

---

#### `tool.definition`

**用途**：修改工具定義（描述和參數）

**使用時機**：
- 動態修改工具描述
- 添加參數說明
- 根據上下文調整工具可見性

**範例**：
```typescript
"tool.definition"?: (input: {
  toolID: string;
}, output: {
  description: string;
  parameters: any;
}) => Promise<void>;
```

**Arise 應用**：目前未使用

---

#### `auth`

**用途**：自訂認證流程

**使用時機**：
- OAuth 整合
- API Key 管理
- 自訂登入流程

**Arise 應用**：目前未使用

---

## 三、官方文檔 vs SDK 差異

### 3.1 官方文檔記錄的 Hooks

根據官方文檔 (`opencode.ai/docs/plugins/`)，記錄了以下幾類事件：

| 類別 | 記錄的事件 |
|------|-----------|
| Command Events | `command.executed` |
| File Events | `file.edited`, `file.watcher.updated` |
| Installation Events | `installation.updated` |
| LSP Events | `lsp.client.diagnostics`, `lsp.updated` |
| Message Events | `message.part.removed`, `message.part.updated`, `message.removed`, `message.updated` |
| Permission Events | `permission.asked`, `permission.replied` |
| Server Events | `server.connected` |
| Session Events | `session.created`, `session.compacted`, `session.deleted`, `session.diff`, `session.error`, `session.idle`, `session.status`, `session.updated` |
| Todo Events | `todo.updated` |
| Shell Events | `shell.env` |
| Tool Events | `tool.execute.after`, `tool.execute.before` |
| TUI Events | `tui.prompt.append`, `tui.command.execute`, `tui.toast.show` |

### 3.2 SDK 定義但未在官方文檔記錄的 Hooks

| Hook 名稱 | 說明 |
|-----------|------|
| `chat.message` | 新訊息接收鉤子 |
| `chat.params` | LLM 參數修改鉤子 |
| `chat.headers` | HTTP headers 修改鉤子 |
| `permission.ask` | 權限請求干預鉤子 |
| `command.execute.before` | 命令執行前鉤子 |
| `experimental.chat.messages.transform` | 訊息轉換鉤子 |
| `experimental.chat.system.transform` | 系統提示轉換鉤子 |
| `experimental.text.complete` | 文字補全完成鉤子 |
| `tool.definition` | 工具定義修改鉤子 |
| `auth` | 認證鉤子 |

### 3.3 僅在 SDK 類型中存在的特殊欄位

某些 Hook 的 output 包含特殊欄位：

```typescript
// experimental.session.compacting 的特殊欄位
"experimental.session.compacting"?: (input: {
  sessionID: string;
}, output: {
  context: string[];     // 額外上下文
  prompt?: string;       // 完全替換預設提示
}) => Promise<void>;
```

---

## 四、Arise 使用的 Hooks 總結

| Hook | 檔案 | 用途 | 狀態 |
|------|------|------|------|
| `chat.params` | `index.ts:162` | 快取會話模型 | ✅ 已使用 |
| `tool.execute.after` | `output-shaper.ts` | 截斷工具輸出 | ✅ 已使用 |
| `experimental.session.compacting` | `compaction-preserver.ts` | 保留上下文規則 | ✅ 已使用 |
| `event` | `event-handler.ts` | 處理所有事件 | ✅ 已使用 |
| `config` | `config-handler.ts` | Agent 配置 | ✅ 已使用 |
| `tool` | `tools/index.ts` | 自訂工具 | ✅ 已使用 |

---

## 五、實驗性 Hooks 使用建議

### 5.1 實驗性 Hooks 一覽

| Hook | 穩定性 | 建議 |
|------|--------|------|
| `experimental.chat.messages.transform` | ⚠️ 不穩定 | 已知問題：compaction 期間不觸發、變更會被丟棄 |
| `experimental.chat.system.transform` | ⚠️ 不穩定 | 已知問題：變更會被丟棄、無法與 messages.transform 協調 |
| `experimental.session.compacting` | ✅ 穩定 | 官方有完整文件 |
| `experimental.text.complete` | 🔍 未知 | 無社群使用案例 |

### 5.2 使用建議

1. **優先使用已文件化的 Hooks**：`tool.execute.before`、`tool.execute.after`、`event`
2. **實驗性 Hooks 需謹慎**：`experimental.*` 前綴的 Hook 可能會變更
3. **避免依賴未文件化 Hooks 的副作用**：如 `chat.message` 的實作細節

---

## 六、範例程式碼

### 6.1 完整的 Hook 註冊結構

```typescript
import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";

export const MyPlugin: Plugin = async (ctx: PluginInput): Promise<Hooks> => {
  return {
    // 工具鉤子
    tool: {
      // 自訂工具定義
    },

    // 配置鉤子
    async config(input) {
      // 處理配置
    },

    // 事件鉤子
    async event(input) {
      const { event } = input;
      switch (event.type) {
        case "session.created":
          // 會話創建
          break;
        case "session.compacted":
          // 會話壓縮
          break;
      }
    },

    // 聊天參數鉤子
    async "chat.params"(input, output) {
      // 修改 LLM 參數
      output.temperature = 0.7;
    },

    // 工具執行前
    async "tool.execute.before"(input, output) {
      // 修改工具參數
    },

    // 工具執行後
    async "tool.execute.after"(input, output) {
      // 修改工具輸出
    },

    // 實驗性：訊息轉換
    async "experimental.chat.messages.transform"(input, output) {
      // ⚠️ 已知問題
    },

    // 實驗性：系統提示轉換
    async "experimental.chat.system.transform"(input, output) {
      // ⚠️ 已知問題
    },

    // 實驗性：會話壓縮
    async "experimental.session.compacting"(input, output) {
      output.context.push("額外上下文");
    },
  };
};
```

---

## 七、參考資源

- [官方插件文檔](https://opencode.ai/docs/plugins/)
- [SDK 類型定義](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts)
- [Issue #17100](https://github.com/anomalyco/opencode/issues/17100) - system.transform 變更被丟棄
- [Issue #17820](https://github.com/anomalyco/opencode/issues/17820) - messages.transform 在 compaction 不觸發
- [Issue #19960](https://github.com/anomalyco/opencode/issues/19960) - system+message 協調問題
