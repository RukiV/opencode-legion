# 測試 Mock 環境 (Test Mock Environment)

提供安全的檔案系統操作隔離，防止測試意外修改系統檔案。

---

## 目錄

- [概述](#概述)
- [功能特性](#功能特性)
- [安裝依賴](#安裝依賴)
- [快速開始](#快速開始)
- [API 參考](#api-參考)
- [安全機制](#安全機制)
- [常見問題](#常見問題)

---

## 概述

### 什麼是測試 Mock 環境？

測試 Mock 環境是一個用於隔離檔案系統操作的工具，提供：

1. **記憶體模擬檔案系統 (MockFs)** - 完全隔離於真實檔案系統
2. **安全路徑檢查 (FsSafety)** - 防止意外操作危險路徑
3. **統一測試環境 (MockEnv)** - 整合以上功能於一體

### 可以防止什麼狀況？

| 狀況 | 說明 | 防護方式 |
|------|------|----------|
| **誤刪系統檔案** | 測試意外刪除 `/etc/passwd` | 阻擋危險路徑 |
| **誤改系統配置** | 測試修改 `C:\Windows\System32` | 阻擋系統目錄 |
| **污染專案根目錄** | 測試在 `src/` 意外建立檔案 | 白名單限制 |
| **並行測試衝突** | 多個測試同時操作同一檔案 | 記憶體隔離 |
| **路徑格式問題** | Windows/Unix 路徑不一致 | upath2 統一處理 |

### 是否可以模擬讀寫路徑外檔案？

**可以**，但需要显式禁用安全检查：

```typescript
// ✅ 安全模式（預設）：阻擋路徑外操作
const mockFs = new MockFs({ enableSafetyCheck: true });
mockFs.writeFileSync("/etc/passwd", "data"); // ❌ 拋出錯誤

// ⚠️ 危險模式：允許路徑外操作
const mockFs = new MockFs({ enableSafetyCheck: false });
mockFs.writeFileSync("/etc/passwd", "data"); // ✅ 成功（但僅在記憶體中）
```

---

## 功能特性

### 1. MockFs - 記憶體檔案系統

```
操作真實檔案系統：
┌─────────────────────────────────────┐
│  Test Code                          │
│      │                              │
│      ▼                              │
│  ┌─────────────────┐                │
│  │ MockFs          │                │
│  │ (記憶體模擬)     │                │
│  └────────┬────────┘                │
│           │                         │
│           ▼                         │
│  ┌─────────────────┐                │
│  │ 真實檔案系統     │                │
│  │ (不被影響)       │                │
│  └─────────────────┘                │
└─────────────────────────────────────┘
```

**功能：**
- 讀寫檔案（`writeFileSync`、`readFileSync`）
- JSON 檔案（`writeJsonSync`、`readJsonSync`）
- 目錄操作（`mkdirSync`、`rmSync`、`readdirSync`）
- 批次操作（`setFiles`、`clear`）

### 1.5. Audit Mode - 審計模式

Audit Mode 是 MockFs 的可選功能，可以將記憶體中的檔案變更同步寫入實際目錄，方便測試後查閱變更內容。

```
┌──────────────────────────────────────────────────────┐
│  MockFs 操作                                           │
│     │                                                  │
│     ▼                                                  │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │  記憶體檔案系統   │───▶│   Audit 目錄     │          │
│  │                  │    │  (可選同步寫入)   │          │
│  └─────────────────┘    └─────────────────┘          │
│                                                      │
│  用途：                                               │
│  - 查閱測試期間的檔案變更                            │
│  - 保留有價值的測試輸出供人工審閱                     │
│  - 驗證測試邏輯的正確性                              │
└──────────────────────────────────────────────────────┘
```

**使用時機：**
- 測試需要產出檔案，但不想汙染專案
- 需要查閱測試期間的檔案變更
- 保留錯誤發生時的診斷資訊

### 2. FsSafety - 安全路徑檢查

```
路徑檢查流程：
                                    ┌──────────────────┐
                                    │   檢查結果        │
                                    │                  │
                                    │ ✅ Safe          │
┌──────────────┐    ┌──────────────┤                  │
│  輸入路徑    │───▶│  相對路徑檢查 │                  │
└──────────────┘    └──────┬───────┘                  │
                            │                          │
                            ▼                          │
                     ┌──────────────┐    ┌────────────▼──────┐
                     │  白名單檢查   │───▶│   ✅ Safe        │
                     │ (test/temp)  │    └──────────────────┘
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐    ┌────────────▼──────┐
                     │ 危險關鍵詞檢查 │───▶│   ❌ Dangerous     │
                     │ (/etc, /sys) │    └──────────────────┘
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐    ┌────────────▼──────┐
                     │ 範圍檢查      │───▶│   ❌ Outside Root │
                     │ (專案外)     │    └──────────────────┘
                     └──────────────┘
```

**白名單路徑：**
- `test/temp/` - 測試臨時目錄
- `test/fixtures/` - 測試資料目錄
- 專案根目錄

**危險關鍵詞：**
- Windows: `\Windows\`, `\System32\`, `\Program Files\`
- Unix: `/etc/`, `/usr/bin/`, `/sys/`, `/boot/`

### 3. MockEnv - 統一測試環境

整合 MockFs 和 FsSafety，提供便利的 API：

```typescript
const env = new MockEnv();

env.mockFs     // MockFs 實例
env.safeFs     // 安全的 fs-extra 包裝
env.safety     // 路徑安全檢查工具
env.temp       // 臨時目錄管理
```

---

## 安裝依賴

```bash
pnpm add -D upath2 path-in-dir path-is-same micromatch
```

### 路徑工具說明

| 套件 | 用途 |
|------|------|
| `upath2` | 跨平台路徑處理（統一正斜線 `/`） |
| `path-in-dir` | 檢查路徑是否在指定目錄內 |
| `path-is-same` | 比較路徑是否相同（解析符號連結） |
| `micromatch` | Glob pattern 匹配（用於 Audit Mode 過濾） |

---

## 快速開始

### 基本用法

```typescript
import { MockEnv } from "./test/lib/mock-env";

describe("Config Tests", () => {
    // 建立環境
    const env = new MockEnv();

    // 每個測試前重置
    beforeEach(() => env.reset());

    // 每個測試後清理
    afterEach(() => env.cleanup());

    it("should mock config file", () => {
        // 寫入模擬檔案
        env.mockFs.writeJsonSync("/test/config.json", {
            show_banner: true,
            agents: { monarch: { poll_interval: 5000 } }
        });

        // 讀取並驗證
        const config = env.mockFs.readJsonSync("/test/config.json");
        expect(config.show_banner).toBe(true);
    });
});
```

### 使用安全路徑函式

```typescript
import { safeTestPath, safeFixturesPath } from "./test/lib/mock-env";

// 建立測試檔案路徑
const configPath = safeTestPath("config.json");
// → "D:/path/to/test/temp/config.json"

const mockDataPath = safeFixturesPath("mock-data.json");
// → "D:/path/to/test/fixtures/mock-data.json"
```

### 使用臨時目錄管理

```typescript
import { setupTestTemp, cleanupTestTemp } from "./test/lib/mock-env";

it("should create and cleanup temp directory", () => {
    // 建立臨時目錄（自動加入時間戳）
    const dir = setupTestTemp("my-test");
    // → "D:/path/to/test/temp/my-test-1234567890"

    // 在臨時目錄中建立檔案
    fsExtra.writeFileSync(join(dir, "output.txt"), "result");

    // 測試完成後清理
    cleanupTestTemp(dir);
});
```

### 使用 MockFs 鉤子工廠

```typescript
import { createMockEnvHook } from "./test/lib/mock-env";

describe("Multiple Tests", () => {
    // 建立鉤子工廠
    const createEnv = createMockEnvHook();

    // 每個測試獲得獨立環境
    it("test 1", () => {
        const env = createEnv();
        // ...
        env.cleanup();
    });

    it("test 2", () => {
        const env = createEnv();
        // ...
        env.cleanup();
    });
});
```

### 使用 Audit Mode

```typescript
import { MockFs } from "./test/lib/mock-fs";
import { __TEST_TEMP } from "../__root";

describe("Audit Mode Tests", () => {
    let mockFs: MockFs;
    let auditDir: string;

    beforeEach(() => {
        // 每個測試使用獨立 Audit 目錄
        auditDir = `${__TEST_TEMP}/audit/${Date.now()}`;
        mockFs = new MockFs({
            enableSafetyCheck: false,
            auditDir: auditDir,
            auditEnabled: true,
            auditPatterns: ["**/*.ts", "!**/*.test.ts"]
        });
    });

    it("should sync files to audit directory", () => {
        // 寫入會同步到 Audit 目錄
        mockFs.writeFileSync("/test/output.ts", "export const value = 1;");

        // 驗證 Audit 目錄中的檔案
        const files = mockFs.getAuditFiles();
        expect(files).toContain("/test/output.ts");
        expect(mockFs.readAuditFile("/test/output.ts")).toBe("export const value = 1;");
    });

    it("should filter files by patterns", () => {
        mockFs.writeFileSync("/test/main.ts", "main code");
        mockFs.writeFileSync("/test/main.test.ts", "test code");  // 會被過濾

        const files = mockFs.getAuditFiles();
        expect(files).toContain("/test/main.ts");
        expect(files).not.toContain("/test/main.test.ts");
    });

    afterEach(() => {
        mockFs.clear();
        // 可選：保留 Audit 目錄供人工審閱
        // mockFs.clearAuditDir();
    });
});
```

#### Pattern 語法（Micromatch）

| Pattern | 說明 |
|---------|------|
| `**/*` | 所有檔案 |
| `**/*.ts` | 所有 TypeScript 檔案 |
| `**/src/**` | src 目錄下的所有檔案 |
| `!**/*.test.ts` | 排除測試檔案 |

**範例：只審計 src 目錄下的非測試檔案**
```typescript
const mockFs = new MockFs({
    auditDir: `${__TEST_TEMP}/audit`,
    auditEnabled: true,
    auditPatterns: ["**/src/**/*.ts", "!**/*.test.ts"]
});
```

---

## API 參考

### MockFs

```typescript
import { MockFs } from "./test/lib/mock-fs";

const mockFs = new MockFs({
    enableSafetyCheck: true,  // 啟用安全檢查（預設）
    autoCreateDir: true       // 自動建立父目錄（預設）
});

// 寫入操作
mockFs.writeFileSync(path: string, content: string, encoding?: BufferEncoding): void
mockFs.writeJsonSync(path: string, data: unknown): void

// 讀取操作
mockFs.readFileSync(path: string, encoding?: BufferEncoding): string
mockFs.readJsonSync<T>(path: string): T

// 目錄操作
mockFs.mkdirSync(path: string, recursive?: boolean): void
mockFs.rmSync(path: string, options?: { recursive?: boolean }): void
mockFs.readdirSync(path: string): string[]

// 查詢操作
mockFs.existsSync(path: string): boolean
mockFs.isDirectory(path: string): boolean
mockFs.isFile(path: string): boolean
mockFs.statSync(path: string): { isFile, isDirectory, size, createdAt, modifiedAt }

// 批次操作
mockFs.setFiles(files: Record<string, string>): void  // 批次寫入
mockFs.clear(): void                                   // 清除所有檔案

// 除錯
mockFs.toDebugString(): string  // 取得檔案樹字串
```

#### Audit Mode API

```typescript
// 初始化時設定 Audit Mode
const mockFs = new MockFs({
    auditDir: `${__TEST_TEMP}/audit/my-test`,  // Audit 目錄路徑
    auditEnabled: true,                         // 啟用 Audit Mode
    auditPatterns: ["**/*.ts", "!**/*.test.ts"] // Pattern 過濾（可選）
});

// 動態啟用/停用
mockFs.enableAudit();                           // 啟用
mockFs.enableAudit(["**/*.json"]);             // 啟用並設定 patterns
mockFs.disableAudit();                          // 停用
mockFs.isAuditEnabled(): boolean                // 檢查狀態

// Pattern 管理
mockFs.setAuditPatterns(["**/*.ts"]);           // 設定 patterns
mockFs.getAuditPatterns(): string[]             // 取得目前 patterns

// Audit 目錄操作
mockFs.setAuditDir(dir: string | null): void    // 設定 Audit 目錄
mockFs.getAuditFiles(): string[]                // 取得 Audit 目錄中的檔案
mockFs.readAuditFile(mockPath: string): string | null  // 讀取 Audit 檔案
mockFs.clearAuditDir(): void                    // 清除 Audit 目錄
```

### MockEnv

```typescript
import { MockEnv } from "./test/lib/mock-env";

const env = new MockEnv({
    mockFs: { enableSafetyCheck: true },
    useSafeWrapper: true,
    tempPrefix: "test-temp"
});

// 屬性
env.mockFs      // MockFs 實例
env.safeFs      // 安全的 fs-extra 包裝
env.safeFsNative // 安全的 fs 包裝
env.safety      // 路徑安全檢查工具
env.temp        // 臨時目錄管理

// 方法
env.reset(): void     // 重置 MockFs
env.cleanup(): void  // 清理並重置
```

### 安全檢查

```typescript
import { checkFsSafety, assertFsSafety } from "./test/lib/helpers/fs-safety";

// 檢查路徑（不拋出）
const result = checkFsSafety("/path/to/file");
if (!result.isSafe) {
    console.log(`不安全：${result.reason} (規則：${result.rule})`);
}

// 驗證路徑（拋出錯誤）
assertFsSafety("/path/to/file", "writeFile");

// 安全檢查結果
interface IFsSafetyResult {
    isSafe: boolean;           // 是否安全
    reason: string;           // 原因說明
    rule: "whitelist" | "dangerous_keyword" | "outside_root" | "relative_path" | "unknown";
}
```

### 便利函式

```typescript
import {
    safeTestPath,           // 建立安全的測試檔案路徑
    safeFixturesPath,        // 建立安全的 fixtures 檔案路徑
    setupTestTemp,          // 建立並返回臨時目錄
    cleanupTestTemp,        // 清理臨時目錄
    createMockEnvHook,      // 建立 MockEnv 工廠函式
    getGlobalMockEnv,       // 取得全域 MockEnv
} from "./test/lib/mock-env";
```

---

## 安全機制

### 路徑安全檢查流程

```
1. 相對路徑檢查
   └── 如果是相對路徑且未允許 → ❌ REJECTED

2. 白名單檢查 (pathInsideDirectory + pathIsSame)
   ├── test/temp/        → ✅ ALLOWED
   ├── test/fixtures/    → ✅ ALLOWED
   └── 專案根目錄         → ✅ ALLOWED

3. 危險關鍵詞檢查
   ├── \Windows\          → ❌ REJECTED
   ├── /etc/             → ❌ REJECTED
   ├── /sys/             → ❌ REJECTED
   └── /usr/bin/         → ❌ REJECTED

4. 範圍檢查
   └── 是否在專案根目錄內  → ❌ REJECTED
```

### 安全限制示意圖

```
┌──────────────────────────────────────────────────────────────┐
│  允許的檔案操作範圍                                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 專案根目錄 (/path/to/project)                          │ │
│  │                                                         │ │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  │ │
│  │  │ test/temp/           │  │ test/fixtures/        │  │ │
│  │  │ ✅ 可讀寫             │  │ ✅ 可讀取             │  │ │
│  │  │ (自動清理)            │  │ (唯讀資料)           │  │ │
│  │  └──────────────────────┘  └──────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ src/, dist/, 其他目錄                            │ │ │
│  │  │ ✅ 可讀取但不可寫入                               │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ❌ 禁止的區域                                               │
│                                                              │
│  ├── Windows: \Windows\, \System32\, \Program Files\        │
│  ├── Unix: /etc/, /usr/bin/, /sys/, /boot/                 │
│  └── 其他: 專案根目錄外的所有路徑                              │
└──────────────────────────────────────────────────────────────┘
```

### 如何繞過安全檢查（不建議）

如果確實需要模擬路徑外操作，可以使用禁用安全檢查的 MockFs：

```typescript
// ⚠️ 警告：這會繞過所有安全檢查，請謹慎使用

// 方式 1：建立禁用安全檢查的 MockFs
const mockFs = new MockFs({ enableSafetyCheck: false });

// 方式 2：在 MockEnv 中傳入禁用選項
const env = new MockEnv({
    mockFs: { enableSafetyCheck: false }
});

// 方式 3：直接使用 MockFs（繞過 MockEnv 的安全包裝）
import { MockFs } from "./test/lib/mock-fs";
const mockFs = new MockFs({ enableSafetyCheck: false });

// 現在可以模擬任何路徑
mockFs.writeFileSync("/etc/passwd", "模擬內容");
mockFs.writeFileSync("C:\\Windows\\System32\\config.sys", "模擬內容");
```

---

## 常見問題

### Q: 測試失敗，報錯 "路徑在專案根目錄之外"

**原因**：嘗試操作的路徑不在白名單內。

**解決方案**：
```typescript
// ❌ 錯誤：使用絕對路徑
mockFs.writeFileSync("/test/file.txt", "content");

// ✅ 正確：使用 MockFs 的虛擬路徑
mockFs.writeFileSync("/test/file.txt", "content");  // 這是 MockFs 內部路徑，不是真實檔案系統

// ✅ 正確：使用相對路徑（如果啟用）
const result = checkFsSafety("relative/path", true);
```

### Q: Windows 路徑和 Unix 路徑不一致

**原因**：測試中使用混合的路徑格式。

**解決方案**：所有路徑工具都使用 `upath2` 統一處理：
```typescript
import { normalize } from "upath2";

const path = normalize("D:\\path\\to\\file");  // → "D:/path/to/file"
```

### Q: 如何測試需要讀取真實檔案的程式碼？

**解決方案**：使用 `safeFs` 包裝的真實檔案操作：
```typescript
const env = new MockEnv();

// safeFs 允許操作白名單內的路徑
env.safeFs.writeFileSync(`${__TEST_TEMP}/real-file.txt`, "content");
```

### Q: 測試之間的 MockFs 狀態洩漏

**原因**：使用了全域 MockFs 單例但未正確重置。

**解決方案**：
```typescript
// ❌ 錯誤：使用全域單例
defaultMockFs.writeFileSync("/test/file.txt", "content");

// ✅ 正確：每個測試建立新環境
const env = new MockEnv();
beforeEach(() => env.reset());
afterEach(() => env.cleanup());
```

### Q: 如何查看 MockFs 內部的檔案狀態？

**解決方案**：使用 `toDebugString()` 除錯：
```typescript
mockFs.setFiles({
    "/test/a.txt": "content A",
    "/test/b.txt": "content B",
});

console.log(mockFs.toDebugString());
// 輸出：
// 📁/
//   📁/test/
//     📄 content A
//     📄 content B
```

---

## 範例專案結構

```
project/
├── src/
│   └── ...
├── test/
│   ├── lib/
│   │   ├── helpers/
│   │   │   ├── fs-safety.ts           # 安全檢查工具
│   │   │   └── fs-safety.test.ts      # 安全檢查測試
│   │   ├── mock-fs.ts                 # MockFS 實作
│   │   ├── mock-fs.test.ts            # MockFS 測試
│   │   ├── mock-env.ts               # Mock 環境
│   │   └── mock-env.test.ts           # Mock 環境測試
│   ├── fixtures/                      # 測試資料（唯讀）
│   │   └── mock-data.json
│   └── temp/                         # 測試臨時檔案（可寫）
│       └── .gitkeep
├── docs/
│   └── test-mock-environment.md       # 本文件
└── __root.ts                          # 路徑定義
```

---

## 參考資源

- [upath2](https://github.com/bluelovers/ws-iconv/tree/master/packages/upath2) - 跨平台路徑處理
- [path-in-dir](https://github.com/bluelovers/ws-iconv/tree/master/packages/path-in-dir) - 路徑範圍檢查
- [path-is-same](https://github.com/bluelovers/ws-iconv/tree/master/packages/path-is-same) - 路徑比較
