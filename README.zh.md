# opencode-arise

> ⚔️ **覺醒吧！** 適用於 OpenCode 的我獨自升級主題 Orchestrator 工具層

[![npm version](https://img.shields.io/npm/v/opencode-arise.svg)](https://www.npmjs.com/package/opencode-arise)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一個輕量級、節省 Token 的 Orchestrator 層，透過 Shadow Army 專門 AI Agent 擴展 [OpenCode](https://opencode.ai)。靈感來自於《我獨自升級》中的暗影君王——成振宇。

## 功能特點

- **Shadow Army（影子軍團）** - 7 個針對不同任務的專業 Agent
- **智慧委派（Smart Delegation）** - Monarch 以最少的 Token 使用量進行協調
- **並行執行（Parallel Execution）** - 背景任務用於並發探索
- **品質安全的輸出（Quality-Safe Output）** - 永遠不會截斷錯誤或堆疊追蹤
- **可配置（Configurable）** - 自定義模型、停用 Shadow、調整行為

## 安裝

```bash
bunx @bluelovers/opencode-arise install
```

這會向 OpenCode 註冊插件並建立預設配置。

或者

`~/.config/opencode/opencode.jsonc`

```jsonc
{
  "plugins": [
    "@bluelovers/opencode-arise@latest"
  ]
}
```

**驗證安裝：**
```bash
bunx @bluelovers/opencode-arise doctor
```

## 快速開始

安裝後，照常執行 OpenCode：

```bash
opencode
```

您將看到「覺醒吧！」橫幅，而 **Monarch** 成為您的預設 Agent。直接對話 - Monarch 會決定何時委派給 Shadows。

```
您：「找出所有使用 useState 的 React 元件並添加錯誤邊界」

Monarch：「我會讓 Beru  scout codebase，然後由 Igris 實作變更。」
```

## Shadow Army（影子軍團）

| Shadow | 角色 | 適用場景 |
|--------|------|----------|
| 👑 **monarch** | Shadow Monarch | 協調、委派決策 |
| 🐜 **beru** | Ant King Scout | 快速 codebase 探索、grep、檔案發現 |
| ⚔️ **igris** | Loyal Knight | 精確實作、程式碼變更 |
| 🎖️ **bellion** | Grand Marshal | 策略規劃、架構分析 |
| 🎨 **tusk** | Creative Shadow | UI/UX、前端、樣式 |
| 🛡️ **tank** | Research Shadow | 外部文檔、網路搜尋、範例 |
| 👁️ **shadow-sovereign** | Full Power | 深度推理、複雜除錯 |

### 直接召喚

您可以直接跳過 Monarch 召喚 Shadows：

```
@beru 找出 src/ 中的所有 TODO 註解

@bellion 規劃從 REST 遷移到 GraphQL

@shadow-sovereign 為什麼這個遞迴函數會導致堆疊溢位？
```

## 運作原理

```
┌─────────────────────────────────────────────────────────┐
│                        使用者                              │
│                          │                               │
│                          ▼                               │
│    ┌─────────────────────────────────────────────────┐  │
│    │                👑 MONARCH                        │  │
│    │           (主要協調器)                             │  │
│    │                                                  │  │
│    │     評估任務 → 委派或處理                          │  │
│    └──────────────────────┬──────────────────────────┘  │
│                           │                              │
│       ┌───────┬───────────┼───────────┬───────┐         │
│       ▼       ▼           ▼           ▼       ▼         │
│     🐜      ⚔️          🎖️          🛡️      👁️        │
│    BERU   IGRIS      BELLION       TANK   SOVEREIGN    │
│    scout  implement    plan       research  reason      │
└─────────────────────────────────────────────────────────┘
```

**Monarch 的原則：**
1. 行動前先評估意圖 - 不要過度委派
2. 直接處理簡單任務
3. 使用並行背景任務進行探索
4. 只為複雜問題召喚 shadow-sovereign
5. 在宣布完成前驗證變更是否有效

## 自定義工具

插件為 Monarch 提供以下工具：

| 工具 | 描述 |
|------|-------------|
| `arise_summon` | 召喚 Shadow（同步或背景） |
| `arise_background` | 啟動並行背景任務 |
| `arise_background_output` | 取得背景任務的結果 |
| `arise_background_status` | 列出所有背景任務 |
| `arise_background_cancel` | 取消正在執行的任務 |

## Hooks（鉤子）

| Hook | 描述 |
|------|-------------|
| `arise-banner` | 會話開始時顯示「覺醒吧！」提示 |
| `output-shaper` | 品質安全的輸出截斷（保留錯誤） |
| `compaction-preserver` | 會話壓縮時保留關鍵上下文 |
| `todo-enforcer` | 會話空閒時提醒未完成的 TODO |

## 配置

建立 `~/.config/opencode/opencode-arise.json`：

```json
{
  "show_banner": true,
  "disabled_shadows": [],
  "disabled_hooks": [],
  "agents": {
    "monarch": {
      "model": "opencode/big-pickle"
    },
    "beru": {
      "model": "opencode/big-pickle"
    },
    "igris": {
      "model": "opencode/big-pickle"
    },
    "bellion": {
      "model": "opencode/big-pickle"
    },
    "tusk": {
      "model": "opencode/big-pickle"
    },
    "tank": {
      "model": "opencode/big-pickle"
    },
    "shadow-sovereign": {
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

| 選項 | 類型 | 預設 | 描述 |
|------|------|---------|-------------|
| `show_banner` | boolean | `true` | 會話開始時顯示「覺醒吧！」提示 |
| `banner_every_session` | boolean | `false` | 每個會話都顯示橫幅（不僅僅是第一個） |
| `disabled_shadows` | string[] | `[]` | 要停用的 Shadows（例如 `["tusk", "tank"]`） |
| `disabled_hooks` | string[] | `[]` | 要停用的 Hooks |
| `agents.<name>.model` | string | varies | 覆蓋 Shadow 的模型 |
| `agents.<name>.disabled` | boolean | `false` | 停用特定的 Shadow |
| `output_shaping.max_chars` | number | `12000` | 截斷前的最大輸出長度 |
| `output_shaping.preserve_errors` | boolean | `true` | 永遠不要截斷錯誤輸出 |
| `compaction.threshold_percent` | number | `80` | 壓縮的上下文閾值 |
| `compaction.preserve_todos` | boolean | `true` | 壓縮時保留 TODO |

### 專案層級配置

您也可以在專案根目錄建立 `.opencode/opencode-arise.json`。專案配置會與（並覆蓋）全域配置合併。

## 預設模型

| Shadow | 預設模型 |
|--------|---------------|
| monarch | `anthropic/claude-opus-4-5` |
| beru | `anthropic/claude-haiku-4-5` |
| igris | `zai-coding-plan/glm-4.7` |
| bellion | `openai/gpt-5.2` |
| tusk | `google/gemini-3-pro-preview` |
| tank | `zai-coding-plan/glm-4.7` |
| shadow-sovereign | `openai/gpt-5.2`（高推理） |

## 範例

### 並行 Codebase 探索

```
您：「我需要了解驗證機制如何運作並找出安全最佳實踐」

Monarch：*在背景啟動 beru（codebase）和 tank（research）*
         「Beru 正在探索驗證實作，而 Tank 正在研究
          安全最佳實踐。我會整理他們的發現。」
```

### 複雜重構

```
您：「重構付款模組以使用新的 Stripe API」

Monarch：「這需要規劃。讓我先諮詢 Bellion。」

Bellion：*分析 codebase，建立遷移計劃*

Monarch：「Bellion 的計劃看起來不錯。Igris 會逐步實作它。」

Igris：*實作變更，每步驟後執行測試*
```

### 深度除錯

```
您：「這個非同步函數導致競爭條件，但我無法弄清楚原因」

Monarch：「這需要深度分析。召喚 Shadow Sovereign。」

Shadow-Sovereign：*深度推理分析*
                  「問題是閉包捕獲了過時的參考...」
```

## 解除安裝

從 OpenCode 配置中移除：

```bash
# 編輯 ~/.config/opencode/opencode.json
# 從 "plugin" 陣列中移除 "opencode-arise"
```

或者手動：
```bash
# 移除配置
rm ~/.config/opencode/opencode-arise.json
```

## 需求

- 已安裝 [OpenCode](https://opencode.ai) CLI
- [Bun](https://bun.sh) 執行環境（v1.0.0+）

## 設計理念

- **最小充分委派** - 不要過度委派簡單任務
- **並行探索** - 使用背景任務進行並發偵察
- **品質安全的截斷** - 永遠不要丟失錯誤、追蹤或關鍵輸出
- **Token 效率** - 精簡提示詞、智慧的委派模式

## 貢獻

歡迎貢獻！請先閱讀貢獻指南。

```bash
# 複製儲存庫
git clone https://github.com/bluelovers/opencode-arise.git
cd opencode-arise

# 安裝依賴
bun install

# 執行測試
bun test

# 建置
bun run build
```

## 授權

[MIT](LICENSE) © moinulmoin

---

<p align="center">
  <i>「只有我能升級。」</i> - 成振宇
</p>
