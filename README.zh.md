# opencode-legion

> ⚔️ **覺醒吧！** 適用於 OpenCode 的 Shadow Slave 主題 Orchestrator 工具層

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一個輕量級、節省 Token 的 Orchestrator 層，透過 Shadow Legion 專門 AI Agent 擴展 [OpenCode](https://opencode.ai)。靈感來自於《Shadow Slave》。

## 功能特點

- **Shadow Legion（影子軍團）** - 8 個針對不同任務的專業 Agent
- **智慧委派（Smart Delegation）** - Sunless 以最少的 Token 使用量進行協調
- **並行執行（Parallel Execution）** - 背景任務用於並發探索
- **品質安全的輸出（Quality-Safe Output）** - 永遠不會截斷錯誤或堆疊追蹤
- **可配置（Configurable）** - 自定義模型、停用 Shadow、調整行為

## 安裝

```bash
opencode plugin @RukiV/opencode-legion
```

這會向 OpenCode 註冊插件並建立預設配置。

或者手動加入 `~/.config/opencode/opencode.jsonc`：

```jsonc
{
  "plugin": [
    "@RukiV/opencode-legion"
  ]
}
```

## 快速開始

安裝後，照常執行 OpenCode：

```bash
opencode
```

你會看到 "ARISE!" 橫幅，**Sunless** 將成為你的預設 Agent。自然地對話 — Sunless 會決定何時委派給 shadows。

## Shadow Legion

| Shadow | 角色 | 最佳用途 |
|--------|------|----------|
| ☀️ **sunless** | 影子軍團之主 | 協調、委派決策 |
| 🐎 **nightmare** | 影子偵查兵 | 快速程式碼探索、grep、檔案搜尋 |
| ⚔️ **saint** | 軍團聖者 | 精確實作、程式碼變更 |
| 🔮 **cassie** | 策略大師 | 策略規劃、架構分析 |
| 🎨 **fiend** | UI 工匠 | UI/UX、前端、樣式 |
| 📚 **slayer** | 知識追尋者 | 外部文件、網路搜尋、範例 |
| 👁️ **weaver** | 命運編織者 | 深度推理、複雜除錯 |
| 🎤 **kai** | Nightingale | 聊天陪伴、情感交流 |

### 直接召喚

你可以繞過 Sunless 直接召喚 shadows：

```
@nightmare 在 src/ 中找出所有 TODO 註解

@cassie 規劃從 REST 遷移到 GraphQL 的方案

@weaver 為什麼這個遞迴函式會導致堆疊溢出？
```

## 運作方式

```
┌─────────────────────────────────────────────────────────┐
│                        使用者                             │
│                          │                               │
│                          ▼                               │
│    ┌─────────────────────────────────────────────────┐  │
│    │              ☀️ SUNLESS                          │  │
│    │         (影子軍團之主 / 協調者)                    │  │
│    │                                                  │  │
│    │     評估任務 → 委派或直接處理                    │  │
│    └──────────────────────┬──────────────────────────┘  │
│                           │                              │
│       ┌──────┬──────┬─────┼──────┬──────┬──────┐        │
│       ▼      ▼      ▼     ▼      ▼      ▼      ▼        │
│      🐎     ⚔️     🔮    🎨     📚     👁️     🎤     │
│   NIGHT-  SAINT  CASSIE FIEND  SLAYER WEAVER   KAI    │
│   MARE                                                     │
│   偵查   實作    規劃   UI    搜尋   推理   聊天        │
└─────────────────────────────────────────────────────────┘
```

**Sunless 的原則：**
1. 先評估意圖再行動 — 不要過度委派
2. 直接處理簡單任務
3. 使用並行背景任務進行探索
4. 只在處理複雜問題時召喚 weaver
5. 在宣告完成前驗證變更是否正常運作

## 自訂工具

插件為 Sunless 提供以下工具：

| 工具 | 描述 |
|------|------|
| `arise_summon` | 召喚 shadow（同步或背景） |
| `arise_background` | 啟動並行背景任務 |
| `arise_background_output` | 取得背景任務結果 |
| `arise_background_status` | 列出所有背景任務 |
| `arise_background_cancel` | 取消執行中的任務 |

## Hooks

| Hook | 描述 |
|------|------|
| `arise-banner` | 在會話開始時顯示 "ARISE!" 通知 |
| `output-shaper` | 品質安全的輸出截斷（保留錯誤） |
| `compaction-preserver` | 在會話壓縮期間保留關鍵上下文 |
| `todo-enforcer` | 在會話空閒時提醒未完成的 TODO |

## 配置

建立 `~/.config/opencode/opencode-legion.json`：

```json
{
  "show_banner": true,
  "disabled_shadows": [],
  "disabled_hooks": [],
  "agents": {
    "sunless": {
      "model": "opencode/big-pickle"
    },
    "nightmare": {
      "model": "opencode/big-pickle"
    },
    "saint": {
      "model": "opencode/deepseek-v4-flash-free"
    },
    "cassie": {
      "model": "opencode/mimo-v2.5-free"
    },
    "fiend": {
      "model": "opencode/mimo-v2.5-free"
    },
    "slayer": {
      "model": "opencode/big-pickle"
    },
    "weaver": {
      "model": "opencode/big-pickle"
    },
    "kai": {
      "model": "opencode/big-pickle"
    }
  },
  "output_shaping": {
    "max_chars": 12000,
    "preserve_errors": true
  },
  "compaction": {
    "threshold_percent": 80,
    "preserve_todos": true
  }
}
```

### 配置選項

| 選項 | 類型 | 預設值 | 描述 |
|------|------|--------|------|
| `show_banner` | boolean | `true` | 在會話開始時顯示 "ARISE!" 通知 |
| `banner_every_session` | boolean | `false` | 每次會話都顯示橫幅（不僅是首次）|
| `disabled_shadows` | string[] | `[]` | 要停用的 shadows（例如 `["fiend", "slayer"]`）|
| `disabled_hooks` | string[] | `[]` | 要停用的 hooks |
| `agents.<name>.model` | string | 各異 | 覆蓋特定 shadow 的模型 |
| `agents.<name>.disabled` | boolean | `false` | 停用特定 shadow |
| `output_shaping.max_chars` | number | `12000` | 截斷前的最大輸出長度 |
| `output_shaping.preserve_errors` | boolean | `true` | 永遠不截斷錯誤輸出 |
| `compaction.threshold_percent` | number | `80` | 壓縮的上下文閾值 |
| `compaction.preserve_todos` | boolean | `true` | 在壓縮期間保留 TODOs |

### 專案級配置

你也可以在專案根目錄建立 `.opencode/opencode-legion.json`。專案配置會合併（並覆蓋）全域配置。

## 預設模型

| Shadow | 預設模型 |
|--------|----------|
| sunless | `opencode/big-pickle` |
| nightmare | `opencode/big-pickle` |
| saint | `opencode/deepseek-v4-flash-free` |
| cassie | `opencode/mimo-v2.5-free` |
| fiend | `opencode/mimo-v2.5-free` |
| slayer | `opencode/big-pickle` |
| weaver | `opencode/big-pickle` |
| kai | `opencode/big-pickle` |

## 卸載

從 OpenCode 配置中移除：

```bash
# 編輯 ~/.config/opencode/opencode.jsonc
# 從 "plugin" 陣列中刪除 "@RukiV/opencode-legion"
```

或者手動：

```bash
# 移除配置
rm ~/.config/opencode/opencode-legion.json
```

## 需求

- 已安裝 [OpenCode](https://opencode.ai) CLI
- [Bun](https://bun.sh) 執行環境（v1.0.0+）

## 理念

- **最小充分委派** — 不要過度委派簡單任務
- **並行探索** — 使用背景任務進行並發偵查
- **品質安全截斷** — 永遠不遺失錯誤、回溯或關鍵輸出
- **Token 效率** — 精簡提示、智慧委派模式

## 貢獻

歡迎貢獻！請先閱讀貢獻指南。

```bash
# 複製儲存庫
git clone https://github.com/RukiV/opencode-legion.git
cd opencode-legion

# 安裝依賴
bun install

# 執行測試
bun test

# 建置
bun run build
```

## 授權

[MIT](LICENSE) © RukiV

---

<p align="center">
  <i>"Even a shadow can grow long enough to cover the sun."</i><br>
  — Sunless
</p>
