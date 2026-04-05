# OpenCode Config 設定參考

> 本文檔記錄 OpenCode `opencode.json` 配置的完整欄位、我們目前的設定狀態、以及實際設定方式。

---

## 一、配置檔案位置

| 配置類型 | 檔案路徑 | 說明 |
|----------|----------|------|
| **OpenCode 配置** | `~/.config/opencode/opencode.json` 或 `opencode.jsonc` | OpenCode 主配置，框架自身讀取 |
| **Arise 配置** | `./.opencode/opencode-arise.json` (局部，優先) | 本插件的專屬配置 |
| **Arise 配置** | `~/.config/opencode/opencode-arise.json` (全域) | 全域 Arise 配置 |

> **注意**：OpenCode 配置由框架自身解析後，透過 `config` hook 注入給插件。插件**不主動讀取** `opencode.json`。

---

## 二、Config 完整欄位總覽

> 基於 `@opencode-ai/sdk/dist/gen/types.gen.d.ts` 的 `Config` 型別。

### 2.1 我們有設定的欄位

| 欄位 | 設定位置 | 值 |
|------|----------|-----|
| `default_agent` | `src/plugin/config-handler.ts:131` | `"shadow-monarch"` |
| `agent` | `src/plugin/config-handler.ts:62-93` | 所有 shadow agents + build/plan/explore/general 覆寫 |
| `agent.*.description` | `src/agents/shadows.ts` | 各 agent 描述 |
| `agent.*.mode` | `src/agents/shadows.ts` | PRIMARY / SUBAGENT / ALL |
| `agent.*.model` | `src/plugin/config-handler.ts:81` | 解析後的模型 (AUTO → parent model) |
| `agent.*.steps` | `src/agents/shadows.ts` | 最大步驟數 |
| `agent.*.prompt` | `src/agents/shadows.ts` | 系統提示 |
| `agent.*.permission` | `src/agents/shadows.ts` + `_handlePermission()` | 權限設定 |
| `agent.*.options` | `src/agents/shadows.ts` | 如 reasoningEffort |
| `agent.*.hidden` | `src/agents/shadows.ts:620-624` | explore/general 隱藏 |

### 2.2 我們未設定的欄位

| 欄位 | 說明 | 潛在用途 |
|------|------|---------|
| `$schema` | JSON Schema URI | 配置驗證提示 |
| `theme` | 介面主題 | 自訂 UI 主題 |
| `keybinds` | 按鍵綁定 | 自訂快捷鍵 |
| `logLevel` | 日誌級別 | 控制框架日誌 |
| `tui` | TUI 設定 | 終端介面行為 |
| `command` | 自訂命令模板 | 新增自訂 `/command` |
| `watcher.ignore` | 檔案監聽忽略 | 排除特定檔案 |
| `snapshot` | 快照模式 | 會話快照 |
| `share` | 分享模式 | 會話分享 |
| `autoupdate` | 自動更新 | 更新行為 |
| `disabled_providers` | 停用 provider | 停用特定 AI 提供商 |
| `enabled_providers` | 啟用 provider | 僅啟用特定 AI 提供商 |
| `model` | 預設模型 | 全域預設模型 |
| `small_model` | 小模型 | 用於標題生成等輕量任務 |
| `username` | 自訂使用者名稱 | 顯示名稱 |
| `provider` | 自訂 provider | 自訂 API endpoint |
| `mcp` | MCP 伺服器 | 連接外部 MCP 服務 |
| `formatter` | 程式碼格式化 | 自訂 formatter |
| `lsp` | LSP 伺服器 | 語言伺服器 |
| `instructions` | 額外指令檔案 | 載入自訂 instructions |
| `layout` | 佈局設定 | UI 佈局 |
| `permission` (全域) | 全域權限預設值 | 所有 agent 的預設權限 |
| `tools` (全域) | 全域工具開關 | 停用/啟用特定工具 |
| `enterprise.url` | 企業 URL | 企業版功能 |
| `experimental.*` | 實驗性功能 | 各種實驗性設定 |

### 2.3 AgentConfig 欄位 vs 我們有設定的

| 欄位 | 我們有設定？ | 備註 |
|------|:---:|------|
| `model` | ✅ | 透過 resolveModel |
| `variant` | ❌ | 模型變體 |
| `temperature` | ❌ | 溫度控制 |
| `top_p` | ❌ | 採樣參數 |
| `prompt` | ✅ | SHADOW_MONARCH_PROMPT 等 |
| `tools` (deprecated) | ❌ | 改用 `permission` |
| `disable` | ❌ | 停用特定 agent |
| `description` | ✅ | 各 agent 描述 |
| `mode` | ✅ | PRIMARY/SUBAGENT/ALL |
| `hidden` | ✅ | explore/general 隱藏 |
| `options` | ✅ | 如 reasoningEffort |
| `color` | ❌ | Agent 顯示顏色 |
| `steps` | ✅ | 最大步驟數 |
| `maxSteps` (deprecated) | ❌ | 改用 `steps` |
| `permission` | ✅ | 權限設定 |

---

## 三、各欄位實際設定方式

### 3.1 Agent 顏色 (`color`)

**用途**：設定 agent 在 OpenCode UI 中的顯示顏色，提升可識別性。

**支援的值**：
- **Hex 色碼**：如 `"#FF5733"`、`"#00D4AA"`
- **主題色**：`"primary"`、`"secondary"`、`"accent"`、`"success"`、`"warning"`、`"error"`、`"info"`

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "agent": {
    "beru": {
      "color": "#00D4AA"  // 自訂 Hex 色碼
    },
    "igris": {
      "color": "#FF5733"  // 自訂 Hex 色碼
    },
    "shadow-sovereign": {
      "color": "accent"   // 使用主題色
    },
    "tusk": {
      "color": "warning"  // 使用主題色
    }
  }
}
```

**設定方式 — 在程式碼中 (`shadows.ts`)：**

目前 `IShadowAgent` 介面未包含 `color` 欄位，`config-handler.ts` 也未設定。若要支援：

```typescript
// 1. IShadowAgent 介面新增 color 欄位
export interface IShadowAgent<N extends IAllShadowAgentsName = IAllShadowAgentsName> {
  // ...現有欄位
  /** Agent 顯示顏色 / Agent display color */
  color?: string;
}

// 2. shadows.ts 中為各 agent 設定 color
[EnumShadowSubAgentsName.Beru]: {
  name: EnumShadowSubAgentsName.Beru,
  description: "🐜 Ant King - Fastest scout",
  color: "#00D4AA",  // ← 新增
  // ...其他欄位
},

// 3. config-handler.ts 中輸出 color
agents[name] = {
  // ...現有欄位
  ...(shadow.color && { color: shadow.color }),
};
```

---

### 3.2 Agent 溫度 (`temperature`) 與採樣 (`top_p`)

**用途**：控制 agent 的生成隨機性。低溫度（0.1-0.3）適合精確任務，高溫度（0.7-1.0）適合創意任務。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "agent": {
    "beru": {
      "temperature": 0.1,  // 低溫度，適合程式碼搜尋的精確性
      "top_p": 0.9
    },
    "tusk": {
      "temperature": 0.8,  // 高溫度，適合 UI 創意設計
      "top_p": 0.95
    },
    "esil-radiru": {
      "temperature": 0.9,  // 高溫度，適合對話的自然性
      "top_p": 0.95
    }
  }
}
```

**設定方式 — 在程式碼中 (`shadows.ts`)：**

```typescript
// IShadowAgent 介面新增
export interface IShadowAgent<N extends IAllShadowAgentsName = IAllShadowAgentsName> {
  // ...現有欄位
  /** 生成溫度 / Generation temperature */
  temperature?: number;
  /** 採樣參數 / Top-p sampling */
  top_p?: number;
}

// shadows.ts 中為各 agent 設定
[EnumShadowSubAgentsName.Beru]: {
  name: EnumShadowSubAgentsName.Beru,
  temperature: 0.1,
  top_p: 0.9,
  // ...其他欄位
},

// config-handler.ts 中輸出
agents[name] = {
  // ...現有欄位
  ...(shadow.temperature && { temperature: shadow.temperature }),
  ...(shadow.top_p && { top_p: shadow.top_p }),
};
```

---

### 3.3 Agent 模型變體 (`variant`)

**用途**：指定模型的特定變體，僅在使用該 agent 配置的模型時生效。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "agent": {
    "shadow-monarch": {
      "model": "anthropic/claude-sonnet-4-5",
      "variant": "thinking"  // 使用 thinking 變體
    }
  }
}
```

---

### 3.4 Agent 工具開關 (`tools`)

> ⚠️ 已標記為 deprecated，建議使用 `permission` 替代。

**用途**：針對特定 agent 停用/啟用某些工具。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "agent": {
    "beru": {
      "tools": {
        "edit": false,    // 停用編輯工具
        "write": false,   // 停用寫入工具
        "bash": true      // 啟用 bash 工具
      }
    }
  }
}
```

---

### 3.5 Agent 停用 (`disable`)

**用途**：停用特定 agent，使其無法被呼叫。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "agent": {
    "explore": {
      "disable": true  // 停用 OpenCode 內建的 explore
    }
  }
}
```

> **注意**：我們已使用 `hidden: true` 隱藏 explore/general，但 `disable` 會完全停用。

---

### 3.6 全域權限 (`permission`)

**用途**：設定所有 agent 的預設權限，作為 fallback。

**權限類型**：

| 分類 | Key | 說明 |
|------|-----|------|
| 檔案操作 | `read` | 讀取檔案 |
| 檔案操作 | `edit` | 檔案修改 |
| 檔案操作 | `glob` | 檔案 glob |
| 檔案操作 | `grep` | 內容搜尋 |
| 檔案操作 | `list` | 列出目錄 |
| 執行操作 | `bash` | 執行指令 |
| 執行操作 | `task` | 啟動子代理 |
| 執行操作 | `skill` | 載入 skill |
| 執行操作 | `lsp` | LSP 查詢 |
| 執行操作 | `question` | 執行中提問 |
| 網路操作 | `webfetch` | 請求 URL |
| 網路操作 | `websearch` | 網路搜尋 |
| 網路操作 | `codesearch` | 代碼搜尋 |
| 安全防護 | `external_directory` | 存取工作目錄外的路徑 |
| 安全防護 | `doom_loop` | 相同工具呼叫重複 3 次 |
| 安全防護 | `todowrite` | TODO 寫入 |

**權限值**：
- `"allow"` — 允許
- `"deny"` — 拒絕
- `"ask"` — 詢問使用者
- **物件格式**（用於 bash 等需要 pattern matching 的權限）：`{ "git *": "allow", "npm *": "deny" }`

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  // 全域權限（所有 agent 的預設值）
  "permission": {
    "edit": "ask",
    "bash": {
      "git *": "allow",
      "npm *": "allow",
      "rm *": "deny",
      "del *": "deny"
    },
    "webfetch": "allow",
    "external_directory": "ask",
    "doom_loop": "deny"
  },
  "agent": {
    // 個別 agent 可覆寫全域權限
    "beru": {
      "permission": {
        "edit": "deny",   // 覆寫全域設定
        "bash": "deny"    // 完全停用 bash
      }
    },
    "igris": {
      "permission": {
        "edit": "allow",  // 允許編輯
        "write": "allow"  // 允許寫入
      }
    }
  }
}
```

**設定方式 — 在程式碼中 (`shadows.ts`)：**

目前已在 `shadows.ts` 中為各 agent 設定 `permission`，例如：

```typescript
// ShadowMonarch
permission: {
  doom_loop: EnumOpencodeAgentPermission.ALLOW,
  task: EnumOpencodeAgentPermission.ALLOW,
},

// Beru
permission: {
  edit: EnumOpencodeAgentPermission.DENY,
  write: EnumOpencodeAgentPermission.DENY,
},

// ShadowSovereign
permission: {
  edit: EnumOpencodeAgentPermission.DENY,
  write: EnumOpencodeAgentPermission.DENY,
},

// EsilRadiru
permission: {
  edit: EnumOpencodeAgentPermission.DENY,
  write: EnumOpencodeAgentPermission.DENY,
  webfetch: EnumOpencodeAgentPermission.ALLOW,
  external_directory: EnumOpencodeAgentPermission.ASK,
},
```

> **注意**：目前我們使用的 `EnumOpencodeAgentPermission` 對應值為 `"allow"` / `"deny"` / `"ask"`。
> Bash 權限支援 pattern matching，但目前未在各 agent 中設定 bash 的 pattern rules。

---

### 3.7 全域工具開關 (`tools`)

**用途**：全域停用/啟用特定工具，影響所有 agent。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "tools": {
    "edit": false,       // 全域停用編輯工具
    "webfetch": true,    // 全域啟用 webfetch
    "bash": true         // 全域啟用 bash
  }
}
```

---

### 3.8 小模型 (`small_model`)

**用途**：指定用於輕量任務（如標題生成）的小模型，節省成本。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "model": "anthropic/claude-sonnet-4-5",      // 主模型
  "small_model": "anthropic/claude-haiku-4-5"  // 小模型用於輕量任務
}
```

---

### 3.9 自訂命令 (`command`)

**用途**：定義自訂 `/command`，可指定使用的 agent、模型、模板。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "command": {
    "review": {
      "template": "Review the following code and provide feedback: {{input}}",
      "agent": "shadow-sovereign",
      "model": "openai/gpt-5.2",
      "description": "使用 Shadow Sovereign 進行程式碼審查",
      "subtask": true
    },
    "explain": {
      "template": "Explain this code in detail: {{input}}",
      "agent": "beru",
      "subtask": false
    }
  }
}
```

---

### 3.10 TUI 設定 (`tui`)

**用途**：控制終端介面的行為。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "tui": {
    "scroll_speed": 3,
    "scroll_acceleration": {
      "enabled": true
    },
    "diff_style": "auto"  // 或 "stacked"
  }
}
```

---

### 3.11 Provider 自訂設定 (`provider`)

**用途**：自訂 AI 提供商的 API endpoint、模型列表等。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "provider": {
    "my-custom-provider": {
      "api": "https://api.example.com/v1",
      "models": {
        "my-model": {
          "id": "my-model-id",
          "name": "My Custom Model",
          "tool_call": true,
          "reasoning": false,
          "cost": {
            "input": 0.001,
            "output": 0.003
          }
        }
      }
    }
  }
}
```

---

### 3.12 MCP 伺服器設定 (`mcp`)

**用途**：連接外部 MCP (Model Context Protocol) 服務。

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "mcp": {
    "my-server": {
      "type": "local",
      "command": ["npx", "-y", "@my-org/my-mcp-server"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

---

### 3.13 實驗性功能 (`experimental`)

**設定方式 — 在 `opencode.json` 中：**

```jsonc
{
  "experimental": {
    "chatMaxRetries": 3,              // 聊天重試次數
    "disable_paste_summary": false,   // 停用貼上摘要
    "batch_tool": true,               // 啟用批次工具
    "openTelemetry": false,           // 啟用 OpenTelemetry
    "primary_tools": ["edit", "bash"] // 僅 primary agent 可用的工具
  }
}
```

---

## 四、PermissionConfig 完整型別 (v2 SDK)

> 基於 `@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts`

```typescript
// 權限動作
type PermissionActionConfig = "ask" | "allow" | "deny";

// 權限規則：可以是簡單動作，也可以是物件（用於 pattern matching）
type PermissionRuleConfig = PermissionActionConfig | PermissionObjectConfig;
type PermissionObjectConfig = { [key: string]: PermissionActionConfig };

// 完整 PermissionConfig
type PermissionConfig = {
  read?: PermissionRuleConfig;
  edit?: PermissionRuleConfig;
  glob?: PermissionRuleConfig;
  grep?: PermissionRuleConfig;
  list?: PermissionRuleConfig;
  bash?: PermissionRuleConfig;
  task?: PermissionRuleConfig;
  external_directory?: PermissionRuleConfig;
  todowrite?: PermissionActionConfig;
  question?: PermissionActionConfig;
  webfetch?: PermissionActionConfig;
  websearch?: PermissionActionConfig;
  codesearch?: PermissionActionConfig;
  lsp?: PermissionRuleConfig;
  doom_loop?: PermissionActionConfig;
  skill?: PermissionRuleConfig;
};
```

**使用範例：**

```jsonc
{
  "agent": {
    "igris": {
      "permission": {
        // 簡單動作
        "edit": "allow",
        "write": "allow",
        "doom_loop": "allow",
        
        // Pattern matching（用於 bash、read 等）
        "bash": {
          "git *": "allow",
          "npm *": "allow",
          "pnpm *": "allow",
          "rm *": "deny",
          "del *": "deny"
        },
        "read": {
          "/etc/*": "deny",     // 拒絕讀取系統檔案
          "**/*": "allow"       // 允許讀取其他檔案
        },
        
        // 其他權限
        "webfetch": "allow",
        "external_directory": "ask",
        "skill": {
          "browser-*": "allow",
          "dangerous-*": "deny"
        }
      }
    }
  }
}
```

---

## 五、AgentConfig 完整型別 (v2 SDK)

> 基於 `@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts`

```typescript
type AgentConfig = {
  model?: string;                                    // 模型名稱
  variant?: string;                                  // 模型變體
  temperature?: number;                              // 溫度 (0-2)
  top_p?: number;                                    // 採樣參數 (0-1)
  prompt?: string;                                   // 系統提示
  tools?: { [key: string]: boolean };               // @deprecated 工具開關
  disable?: boolean;                                 // 停用 agent
  description?: string;                              // agent 描述
  mode?: "subagent" | "primary" | "all";            // agent 模式
  hidden?: boolean;                                  // 隱藏於 @ 選單
  options?: { [key: string]: unknown };             // 自訂選項
  color?: string | "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "info";
  steps?: number;                                    // 最大步驟數
  maxSteps?: number;                                 // @deprecated 改用 steps
  permission?: PermissionConfig;                     // 權限設定
  [key: string]: unknown;                            // 允許動態屬性
};
```

---

## 六、Config 完整型別

> 基於 `@opencode-ai/sdk/dist/gen/types.gen.d.ts`

```typescript
type Config = {
  $schema?: string;
  theme?: string;
  keybinds?: KeybindsConfig;
  logLevel?: "DEBUG" | "INFO" | "WARN" | "ERROR";
  tui?: {
    scroll_speed?: number;
    scroll_acceleration?: { enabled: boolean };
    diff_style?: "auto" | "stacked";
  };
  command?: {
    [key: string]: {
      template: string;
      description?: string;
      agent?: string;
      model?: string;
      subtask?: boolean;
    };
  };
  watcher?: { ignore?: Array<string> };
  plugin?: Array<string>;
  snapshot?: boolean;
  share?: "manual" | "auto" | "disabled";
  autoshare?: boolean;       // @deprecated 改用 share
  autoupdate?: boolean | "notify";
  disabled_providers?: Array<string>;
  enabled_providers?: Array<string>;
  model?: string;
  small_model?: string;
  username?: string;
  mode?: { [key: string]: AgentConfig };  // @deprecated 改用 agent
  agent?: { [key: string]: AgentConfig };
  provider?: { [key: string]: ProviderConfig };
  mcp?: { [key: string]: McpLocalConfig | McpRemoteConfig };
  formatter?: false | { [key: string]: { disabled?: boolean; command?: Array<string>; ... } };
  lsp?: false | { [key: string]: { command: Array<string>; ... } };
  instructions?: Array<string>;
  layout?: LayoutConfig;
  permission?: {
    edit?: "ask" | "allow" | "deny";
    bash?: ("ask" | "allow" | "deny") | { [key: string]: "ask" | "allow" | "deny" };
    webfetch?: "ask" | "allow" | "deny";
    doom_loop?: "ask" | "allow" | "deny";
    external_directory?: "ask" | "allow" | "deny";
  };
  tools?: { [key: string]: boolean };
  enterprise?: { url?: string };
  experimental?: {
    hook?: {
      file_edited?: { [key: string]: Array<{ command: Array<string>; environment?: { [key: string]: string } }> };
      session_completed?: Array<{ command: Array<string>; environment?: { [key: string]: string } }>;
    };
    chatMaxRetries?: number;
    disable_paste_summary?: boolean;
    batch_tool?: boolean;
    openTelemetry?: boolean;
    primary_tools?: Array<string>;
  };
};
```
