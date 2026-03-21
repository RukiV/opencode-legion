# OpenCode Arise 專案結構

## 目錄架構

```
opencode-arise/
├── src/                          # 主要 Source 程式碼
│   ├── index.ts                  # 主入口點，插件初始化與事件處理
│   │
│   ├── agents/                   # Shadow Agents 定義
│   │   ├── shadows.ts            # Shadow 代理實作（7 種代理）
│   │   ├── shadow-names.ts       # Shadow 名稱枚舉與類型
│   │   ├── shadows.test.ts       # Shadow 代理測試
│   │   └── index.ts              # Barrel export
│   │
│   ├── cli/                      # 命令列工具
│   │   ├── index.ts              # CLI 主體（註冊/狀態指令）
│   │   └── parser.test.ts        # CLI 解析器測試
│   │
│   ├── config/                   # 配置相關模組
│   │   ├── schema.ts             # Zod Schema 定義（配置驗證）
│   │   ├── io.ts                 # 配置讀寫（~700 行，最大檔案）
│   │   ├── paths.ts              # 路徑解析工具
│   │   ├── plugin-name.ts        # 插件名稱常數
│   │   ├── model-cache.ts        # 模型快取管理
│   │   ├── schema-helpers.test.ts # Schema 輔助函式測試
│   │   ├── io.test.ts            # IO 測試
│   │   ├── model-cache.test.ts   # 模型快取測試
│   │   ├── paths.test.ts         # 路徑測試
│   │   ├── schema.test.ts        # Schema 測試
│   │   └── index.ts              # Barrel export
│   │
│   ├── hooks/                    # Lifecycle Hooks
│   │   ├── arise-banner.ts       # 橫幅顯示 Hook
│   │   ├── output-shaper.ts      # 輸出格式化 Hook
│   │   ├── compaction-preserver.ts # 對話壓縮保留 Hook
│   │   ├── todo-enforcer.ts      # TODO 強制執行 Hook
│   │   ├── hooks.test.ts         # Hooks 測試
│   │   ├── output-shaper.test.ts # Output Shaper 測試
│   │   └── index.ts              # Barrel export
│   │
│   ├── tools/                    # 自訂工具
│   │   ├── plugin-tools.ts       # 插件工具工廠
│   │   ├── background-tools.ts   # 背景任務工具（重複 Zod import）
│   │   ├── background-manager.ts # 背景任務管理器
│   │   ├── call-arise-agent.ts   # 召喚 Agent 工具
│   │   ├── tool-names.ts         # 工具名稱枚舉（重複 Zod import）
│   │   ├── tools.test.ts         # 工具測試
│   │   └── index.ts              # Barrel export
│   │
│   ├── types/                    # 類型定義
│   │   ├── types.ts              # 通用類型別名
│   │   └── opencode.ts           # OpenCode SDK 類型包裝
│   │
│   ├── utils/                    # 工具函式
│   │   ├── bun-shim.ts           # Bun API Shim（測試用）
│   │   ├── model-resolver.ts     # 模型解析器
│   │   ├── bun-shim.test.ts      # Bun Shim 測試
│   │   └── model-resolver.test.ts # 模型解析器測試
│   │
│   ├── index.test.ts             # 主入口測試
│   ├── build.test.ts             # 建置測試
│   ├── integration.test.ts       # 整合測試
│   └── integration.test.ts       # 整合測試
│
├── test/                         # 測試輔助目錄
│   └── temp/                     # 臨時測試檔案
│
├── docs/                         # 文件
│   ├── STRUCTURE.md              # 本文件
│   └── background-poll-interval.md
│
├── __root.ts                     # 測試路徑常數
├── package.json
├── tsconfig.json
└── pnpm-lock.yaml
```

## 測試檔案位置

測試檔案採用 **co-located** 模式，與源文件放置於同一目錄：

```
src/
├── config/
│   ├── io.ts
│   └── io.test.ts       ← 同目錄測試
├── hooks/
│   ├── output-shaper.ts
│   └── output-shaper.test.ts
└── ...
```

測試路徑使用 `__root.ts` 定義的常數：

```typescript
import { __TEST_TEMP } from "../../__root";

// ✅ 正確：建立子目錄
const TEST_DIR = join(__TEST_TEMP, "module-name");

// ❌ 錯誤：直接操作 __TEST_TEMP
const TEST_DIR = __TEST_TEMP;
```

## 已知重複模式

| 問題 | 位置 | 說明 |
|------|------|------|
| **重複 Zod import** | `tools/background-tools.ts`<br>`tools/tool-names.ts` | 完全相同的 import 語句 |
| **過度使用常數** | `config/plugin-name.ts` | `PLUGIN_NAME`/`LEGACY_PLUGIN_NAME` 有 87 處引用 |
| **大型檔案** | `config/io.ts` | ~700 行，可考慮分離 concerns |

## 模組依賴關係

```
index.ts (主入口)
├── agents/          # 依賴 tools/tool-names, types/opencode
├── config/          # 配置讀寫與驗證
├── hooks/           # Lifecycle hooks
├── tools/          # 自訂工具
│   ├── tools/      # 相互依賴
│   └── agents/
└── types/          # 類型定義
```

## 插件規則

1. **只導出 `default`** - OpenCode 會將所有導出視為插件實例
2. **使用 FakeBun** - 檔案操作使用 `FakeBun.file()` 而非 native fs
3. **配置檔案** - `opencode-arise.json` 搜尋路徑：
   - `./.opencode/opencode-arise.json`
   - `~/.config/opencode/opencode-arise.json`
