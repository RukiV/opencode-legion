# OpenCode Arise 專案結構

## 目錄架構總覽

```
opencode-arise/
├── src/                          # 主要 Source 程式碼
│   ├── index.ts                  # 主入口點，插件初始化與事件處理
│   ├── index.test.ts             # 主入口測試
│   ├── integration.test.ts       # 整合測試
│   ├── build.test.ts             # 建置測試
│   │
│   ├── agents/                   # Shadow Agents 定義
│   │   ├── README.md             # Agents 總覽
│   │   ├── shadows.ts            # 核心 Shadow 代理實作（monarch, beru, igris 等）
│   │   ├── shadow-descriptions.test.ts
│   │   ├── shadows.test.ts       # Shadow 代理測試
│   │   │
│   │   ├── lib/                  # Agent 輔助功能
│   │   │   ├── shadow-prompts.ts    # Shadow 提示詞定義
│   │   │   ├── shadow-prompt-monarch.ts  # Monarch 專屬提示
│   │   │   ├── shadow-descriptions.ts   # 代理描述生成
│   │   │   ├── arise-tools-descriptions.ts
│   │   │   ├── arise-tools-utils.ts
│   │   │   ├── arise-tools-descriptions.ts
│   │   │   ├── tool-guides.ts
│   │   │   ├── rules-skills-ref.ts
│   │   │   ├── prompts.test.ts
│   │   │   └── __snapshots__/     # Test snapshots
│   │
│   ├── cli/                      # 命令列工具
│   │   ├── index.ts              # CLI 主體
│   │   └── parser.test.ts        # CLI 解析器測試
│   │
│   ├── config/                   # 配置相關模組
│   │   ├── schema/               # Zod Schema 定義
│   │   │   ├── entry.ts          # Schema 入口
│   │   │   └── utils.ts          # Schema 輔助工具
│   │   ├── schema.ts             # 核心 Zod Schema（驗證邏輯）
│   │   ├── schema.test.ts        # Schema 測試
│   │   ├── schema-helpers.test.ts
│   │   │
│   │   ├── io.ts                 # 配置讀寫（~700 行，最大檔案）
│   │   ├── io.test.ts            # IO 測試
│   │   ├── paths.ts              # 路徑解析工具
│   │   ├── paths.test.ts         # 路徑測試
│   │   ├── getters.ts            # 配置 Getter  helpers
│   │   ├── model-cache.ts        # 模型快取管理
│   │   ├── model-cache.test.ts   # 模型快取測試
│   │   ├── __snapshots__/        # Test snapshots
│   │
│   ├── tools/                    # 自訂工具
│   │   ├── index.ts              # Tools barrel export
│   │   ├── enum-arise-tools.ts   # Tools 枚舉定義
│   │   │
│   │   ├── lib/                  # Tools 輔助功能
│   │   │   ├── collaboration-session.ts      # Collaborat 會話管理
│   │   │   ├── background-manager.ts         # 背景任務管理器
│   │   │   ├── arise-collaborate-*.ts        # Collaborate 相關工具
│   │   │   └── __snapshots__/
│   │
│   │   ├── arise-list-models.ts      # 模型列表工具
│   │   ├── arise-git-summary.ts      # Git summary 工具
│   │   ├── arise-background.ts       # 背景任務基礎工具
│   │   ├── arise-collaborate.ts      # Collaborate 工具（多代理協作）
│   │   ├── arise-continue.ts         # Continue 功能
│   │   ├── arise-summon.ts           # 召喚 Agent 工具
│   │   ├── arise-debug.ts            # Debug 工具
│   │
│   │   ├── tools.test.ts             # Tools 測試
│   │   └── enum-arise-tools.test.ts  # Tools 枚舉測試
│   │
│   ├── hooks/                    # Lifecycle Hooks
│   │   ├── arsie-banner.ts           # 橫幅顯示 Hook
│   │   ├── compaction-preserver.ts   # 對話壓縮保留 Hook
│   │   ├── output-shaper.ts          # 輸出格式化 Hook
│   │   ├── output-shaper.test.ts
│   │   ├── todo-enforcer.ts          # TODO 強制執行 Hook
│   │   ├── hooks.test.ts             # Hooks 整合測試
│   │
│   ├── utils/                    # 工具函式
│   │   ├── session/                # Session 相關
│   │   │   ├── opencode-session.ts
│   │   │   └── session-cache.ts
│   │   ├── config/                 # 配置相關
│   │   │   ├── jsonc.ts
│   │   │   └── config-merge.ts
│   │   ├── type/                   # 類型相關
│   │   │   ├── type-guard.ts
│   │   │   ├── zod-type-guards.ts
│   │   │   ├── zod-schema-helpers.ts
│   │   │   └── zod-defaults.ts
│   │   ├── date/                   # 日期相關
│   │   │   └── dayjs.ts
│   │   ├── string/                 # 字串相關
│   │   │   ├── regexp.ts
│   │   │   ├── string-utils.ts
│   │   │   ├── prompt-utils.ts
│   │   │   ├── message.ts
│   │   │   └── arsie-message.ts
│   │   ├── syntax/                 # 語法相關
│   │   │   └── map-set.ts
│   │   ├── log/                    # 日誌相關
│   │   │   └── opencode-log.ts
│   │   ├── error.ts                # 錯誤處理
│   │   ├── debug-control.ts        # Debug 控制
│   │   ├── debug-control.test.ts
│   │   ├── session-utils.ts        # Session 工具
│   │   ├── session-utils.test.ts
│   │   ├── bun-shim.ts             # Bun API Shim（測試用）
│   │   ├── bun-shim.test.ts
│   │   ├── queue-utils.ts          # 佇列工具
│   │   ├── queue-utils.test.ts
│   │   └── model-resolver.ts       # 模型解析器
│   │       └── model-resolver.test.ts
│   │
│   ├── plugin/                    # Plugin 相關
│   │   ├── event-handler.ts        # Event 處理
│   │   └── config-handler.ts       # 配置處理
│   │
│   └── types/                     # 類型定義
│       ├── enums.ts                # Enums 定義
│       ├── const-project.ts        # 專案常數
│       ├── const-default.ts        # 預設常數
│       ├── enum-opencode.ts        # OpenCode Enums
│       ├── types-opencode.ts       # OpenCode 類型
│       ├── types.ts                # 通用類型別名
│       ├── types/
│       │   ├── session.ts          # Session 類型
│       │   ├── config-defaults.ts  # Config defaults 類型
│       │   ├── version.ts          # Version 類型
│       │   └── regexp.ts           # Regexp 類型
│       └── opencode/               # OpenCode SDK 類型
│           ├── types-provider.ts
│           ├── types-session.ts
│           ├── enum-hook.ts
│           ├── enum-message.ts
│           └── enum-event.ts
│
├── test/                         # 測試輔助目錄（Centralized / Decoupled）
│   ├── temp/                     # 臨時測試檔案
│   ├── fixtures/                 # 測試靜態資料
│   │   ├── arsie-collaborate-validator-test-cases.ts
│   │   ├── high-load-error-test-cases.ts
│   │   ├── zod-defaults-test-cases.ts
│   │   └── model-resolver/        # Model resolver 測試資料
│   ├── lib/                      # 測試輔助庫
│   │   ├── mock-env.ts            # 環境 Mock
│   │   ├── mock-env.test.ts
│   │   ├── mock-fs.ts             # 檔案系統 Mock
│   │   ├── mock-fs.test.ts
│   │   ├── bun-mock.ts            # Bun Mock
│   │   ├── bun-mock.test.ts
│   │   ├── helpers/               # Helper 工具
│   │   │   ├── fs-safety.ts       # 檔案安全
│   │   │   └── fs-safety.test.ts
│   │   ├── issues/                # Issues 相關
│   │   │   ├── zod-defaults.ts
│   │   │   └── type-member.ts
│   │   └── impl/                  # Implementation 相關
│   │       └── patch-console-logger-reference.ts
│   ├── scripts/                  # 測試腳本
│   │   ├── generate-config-defaults.ts
│   │   ├── generate-json-schema.ts
│   │   ├── extract-free-models.ts
│   │   ├── generate-version.ts
│   │   └── extract-api-keys.ts
│   ├── issues/                   # Issues 相關測試
│   │   ├── to-match-inline-snapshot-bad-literal.test.ts
│   │   ├── arsie-config-schema-export.test.ts
│   │   ├── to-match-object-explain.test.ts
│   │   ├── to-match-object-static.test.ts
│   │   ├── zod-defaults-all.test.ts
│   │   └── to-match-object.test.ts
│   ├── impl/                     # Implementation 相關測試
│   │   └── patch-console-logger-reference.test.ts
│   ├── scripts/                  # 測試腳本（重複目錄？）
│   ├── deprecated/               # 舊版測試
│   │   └── get-effective-model.test.ts
│   ├── merge-comparison.test.ts  # 合併比較測試
│   ├── env.test.test.ts          # 環境測試
│   ├── temp.ts                   # 臨時測試
│   └── temp2.ts                  # 臨時測試 2
│
├── docs/                         # 文件
│   ├── STRUCTURE.md              # 本文件
│   ├── background-poll-interval.md
│   ├── index.ts                  # Docs 入口（未來？）
│   └── snapshots/                # Snapshot 測試結果
│       ├── shadow-descriptions.test.ts.snap
│       └── model-resolver.test.ts.snap
│
├── __root.ts                     # 測試路徑常數
├── __root.d.ts                   # 測試路徑類型
├── package.json
├── tsconfig.json
└── pnpm-lock.yaml
```

## 模組架構解析

### 1. 核心模組（Core Modules）

| 模組 | 位置 | 主要功能 |
|--|--|--|
| **index** | `src/index.ts` | 插件初始化與事件處理 |
| **Config** | `src/config/` | 配置讀寫、驗證、路徑管理（~700 行最大檔案） |
| **Agents** | `src/agents/` | Shadow agents 實作（monarch, beru, igris 等） |
| **Tools** | `src/tools/` | 工具基礎與協作功能 |
| **Hooks** | `src/hooks/` | Lifecycle hooks（橫幅、輸出整形等） |
| **Utils** | `src/utils/` | 通用工具函式（Session, Config, Type, Date 等） |
| **Types** | `src/types/` | 類型定義與 OpenCode SDK 類型 |

### 2. 測試架構（Test Architecture）

| 模式 | 說明 | 範例 |
|--|--|--|
| **Centralized / Decoupled** | 測試檔案統一放置於獨立測試目錄，與原始碼分離 | `test/` |
| **Co-located (Hybrid)** | 測試檔案放置於原始碼相同目錄，適合小型模組 | `src/` 中的 `*.test.ts` |

**測試分層：**
- `/src/*.test.ts` - 小型模組測試
- `/test/issues/*.test.ts` - Issues 相關測試
- `/test/lib/*` - 測試輔助庫（Mock 環境）
- `/test/fixtures/*` - 測試資料集（集中管理）
- `/test/scripts/*` - 測試腳本（資料生成/環境準備）

### 3. Tools 架構（Tools Architecture）

| 層級 | 位置 | 功能 |
|--|--|--|
| **基礎 Tools** | `src/tools/*` |單一功能 tool（arise-summon, arise-background 等） |
| **Collaboration** | `src/tools/lib/collaboration-session.ts` | Collaborate 會話管理與多代理協作 |
| **Auxiliary** | `src/tools/lib/*.ts` | 輔助工具（background-manager, arsie-collaborate-*） |

### 4. Config 架構（Config Architecture）

```
src/config/
├── schema/        # Zod Schema 定義（配置驗證核心）
├── io.ts          # 配置讀寫（~700 行最大檔案）
├── paths.ts       # 路徑解析工具
├── getters.ts     # 配置 Getter helpers
├── model-cache.ts # 模型快取管理
├── schema.ts      # 核心 Schema（驗證邏輯）
└── io.test.ts     # IO 測試
```

### 5. Agents 架構（Agents Architecture）

```
src/agents/
├── shadows.ts         # 核心 Shadow 代理實作
├── shadow-descriptions.ts
├── shadow-prompt-monarch.ts
├── arsie-tools-descriptions.ts
├── arsie-tools-utils.ts
─├── tool-guides.ts
├── rules-skills-ref.ts
├── prompts.test.ts
└── lib/
    └── __snapshots__/    # Test snapshots
```

## 模組依賴關係

```
index.ts (主入口)
├── agents/          # 依賴 tools/lib/*, types/opencode
│   ├── shadows.ts             # 依賴 tools/lib/shadow-prompt-monarch
│   └── lib/*                  # 依賴 lib/*（循環依賴檢查）
├── config/          # 配置讀寫與驗證
│   ├── schema/*              # 依賴 config/*.ts
│   ├── io.ts                 # 依賴 config/schema/* (核心)
│   ├── model-cache.ts        # 依賴 config/schema/*
│   └── getters.ts            # 依賴 config/*.ts
├── hooks/           # Lifecycle hooks
│   ├── arsie-banner.ts       # 依賴 index
│   ├── compaction-preserver.ts  # 依賴 index
│   ├── output-shaper.ts      # 依賴 hooks/*
│   └── todo-enforcer.ts      # 依賴 index
├── tools/          # 自訂工具
│   ├── tools/*            # 相互依賴（部分循環）
│   ├── lib/*              # 相互依賴
│   └── arsie-collaborate-*    # 依賴 tools/lib/*
└── types/          # 類型定義
    └── utils/             # 依賴 core types
        └── types/*           # 相互依賴
```

## 插件規則（Plugin Rules）

1. **只導出 `default`** - OpenCode 會將所有導出視為插件實例
2. **使用 FakeBun** - 檔案操作使用 `FakeBun.file()` 而非 native fs
3. **配置檔案** - `opencode-arise.json` 搜尋路徑：
   - `./.opencode/opencode-arise.json`
   - `~/.config/opencode/opencode-arise.json`

## 測試最佳實踐

| 類型 | 位置 | 特性 |
|--|--|--|
| **Shadow Tests** | `src/agents/*-test.ts` | Shadow 代理測試 |
| **Configuration Tests** | `src/config/*-test.ts` | Config 測試 |
| **Tools Tests** | `src/tools/*-test.ts` | Tools 測試 |
| **Hooks Tests** | `src/hooks/*-test.ts` | Hooks 測試 |
| **Utils Tests** | `src/utils/*-test.ts` | Utils 測試 |
| **Integration Tests** | `src/integration.test.ts` | 整合測試 |

## 相關資源

- [AGENTS.md](./AGENTS.md) - Agents 執行規則與最佳實踐
- [docs/shadow-summoning-methods.md](./docs/shadow-summoning-methods.md) - Shadow 召喚方法
- [test-file-best-practices.md](./test-file-best-practices.md) - 測試最佳實踐
- [comment-format-rules.md](./comment-format-rules.md) - 註解格式規範

---

**總結：**
- **Source Files:** TypeScript 檔案
- **Test Files:** TypeScript 測試檔案
- **Test Architecture:** Centralized / Decoupled + Co-located (Hybrid)
