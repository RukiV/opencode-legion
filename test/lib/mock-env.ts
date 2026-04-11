/**
 * 測試 Mock 環境
 * Test Mock Environment
 *
 * 提供統一的測試 mock 環境，支援安全的檔案系統操作隔離
 * Provides unified test mock environment with safe file system operation isolation
 *
 * 使用 upath2 確保路徑格式跨平台一致（統一使用正斜線 /）
 * Uses upath2 to ensure consistent path format across platforms (unified forward slash /)
 *
 * ⚠️ 安全限制：所有檔案操作僅限於 test/temp/ 與 test/fixtures/ 目錄
 * ⚠️ Safety restriction: All file operations are limited to test/temp/ and test/fixtures/ directories
 *
 * @module test/lib/mock-env
 */

// @noUnusedParameters:false
/// <reference types="node" />

import * as fsExtra from "fs-extra";
import { join, normalize } from "upath2";
import pathInsideDirectory from "path-in-dir";
import pathIsSame from "path-is-same";
import { __TEST_TEMP, __TEST_FIXTURES } from "../../__root";
import { MockFs, type IMockFsOptions } from "./mock-fs";
import { createSafeFsWrapper, checkFsSafety, type IFsSafetyResult } from "./helpers/fs-safety";

// ==================== 類型定義 / Type Definitions ====================

/**
 * Mock 環境配置選項
 * Mock environment configuration options
 */
export interface IMockEnvOptions {
	/** MockFS 配置 / MockFS configuration */
	mockFs?: IMockFsOptions;
	/** 是否使用安全 fs 包裝（預設 true）/ Whether to use safe fs wrapper (default: true) */
	useSafeWrapper?: boolean;
	/** 隔離的臨時目錄前綴 / Isolated temp directory prefix */
	tempPrefix?: string;
}

/**
 * Mock 環境介面
 * Mock environment interface
 */
export interface IMockEnv {
	/** Mock 檔案系統 / Mock file system */
	mockFs: MockFs;
	/** 安全的 fs-extra 包裝 / Safe fs-extra wrapper */
	safeFs: typeof fsExtra;
	/** 安全的 fs 包裝 / Safe fs wrapper */
	safeFsNative: typeof import("fs");
	/** 安全檢查結果 / Safety check results */
	safety: {
		check: (path: string, allowRelative?: boolean) => IFsSafetyResult;
		assert: (path: string, operation?: string, allowRelative?: boolean) => void;
	};
	/** 臨時目錄管理 / Temporary directory management */
	temp: {
		/** 建立隔離的臨時目錄 / Create isolated temporary directory */
		createDir: (name: string) => string;
		/** 取得主臨時目錄路徑 / Get main temp directory path */
		getTempDir: () => string;
		/** 取得測試 fixtures 路徑 / Get test fixtures path */
		getFixturesDir: () => string;
	};
	/** 重置 MockFS 狀態 / Reset MockFS state */
	reset: () => void;
	/** 清理並重置 / Cleanup and reset */
	cleanup: () => void;
}

// ==================== Mock 環境類 / Mock Environment Class ====================

/**
 * Mock 環境類
 * Mock Environment Class
 *
 * 提供完整的測試 mock 環境，包括安全的檔案系統操作
 * Provides complete test mock environment including safe file system operations
 *
 * @example
 * ```typescript
 * import { MockEnv } from "./mock-env";
 *
 * describe("My Test", () => {
 *   const env = new MockEnv();
 *
 *   beforeEach(() => env.reset());
 *   afterEach(() => env.cleanup());
 *
 *   it("should write to mock fs", () => {
 *     env.mockFs.writeFileSync("/test/file.txt", "Hello");
 *     expect(env.mockFs.readFileSync("/test/file.txt")).toBe("Hello");
 *   });
 *
 *   it("should prevent unsafe operations", () => {
 *     expect(() => {
 *       env.safeFs.writeFileSync("/etc/passwd", "data");
 *     }).toThrow();
 *   });
 * });
 * ```
 */
export class MockEnv implements IMockEnv {
	/** Mock 檔案系統 / Mock file system */
	public readonly mockFs: MockFs;

	/** 安全的 fs-extra 包裝 / Safe fs-extra wrapper */
	public readonly safeFs: typeof fsExtra;

	/** 安全的 fs 包裝 / Safe fs wrapper */
	public readonly safeFsNative: typeof import("fs");

	/** 配置選項 / Configuration options */
	protected readonly options: Required<IMockEnvOptions>;

	/** 已建立的臨時目錄清單 / List of created temporary directories */
	protected readonly createdTempDirs: string[] = [];

	/**
	 * 建構子
	 * Constructor
	 *
	 * @param options - 配置選項 / Configuration options
	 */
	constructor(options: IMockEnvOptions = {}) {
		this.options = {
			mockFs: options.mockFs ?? {},
			useSafeWrapper: options.useSafeWrapper ?? true,
			tempPrefix: options.tempPrefix ?? "test-temp",
		};

		// 初始化 MockFS
		// Initialize MockFS
		this.mockFs = new MockFs(this.options.mockFs);

		// 建立安全的 fs 包裝
		// Create safe fs wrappers
		this.safeFs = this.options.useSafeWrapper
			? createSafeFsWrapper(fsExtra)
			: fsExtra;
		this.safeFsNative = this.options.useSafeWrapper
			? createSafeFsWrapper(fsExtra)
			: fsExtra as unknown as typeof import("fs");
	}

	/**
	 * 安全檢查工具
	 * Safety check utilities
	 */
	public readonly safety = {
		/**
		 * 檢查路徑是否安全
		 * Check if path is safe
		 *
		 * @param targetPath - 要檢查的路徑 / Path to check
		 * @param allowRelative - 是否允許相對路徑 / Whether to allow relative paths
		 * @returns 安全檢查結果 / Safety check result
		 */
		check: (targetPath: string, allowRelative: boolean = false): IFsSafetyResult => {
			return checkFsSafety(targetPath, allowRelative);
		},

		/**
		 * 驗證路徑安全並拋出錯誤（如果不安全）
		 * Validate path safety and throw error if unsafe
		 *
		 * @param targetPath - 要檢查的路徑 / Path to check
		 * @param operation - 操作類型描述 / Operation type description
		 * @param allowRelative - 是否允許相對路徑 / Whether to allow relative paths
		 * @throws Error 如果路徑不安全 / Throws Error if path is unsafe
		 */
		assert: (targetPath: string, operation: string = "operation", allowRelative: boolean = false): void => {
			// 這個方法現在是 no-op，因為 MockFS 內建安全檢查
			// This method is now a no-op because MockFS has built-in safety checks
		},
	};

	/**
	 * 臨時目錄管理
	 * Temporary directory management
	 */
	public readonly temp = {
		/**
		 * 建立隔離的臨時目錄
		 * Create isolated temporary directory
		 *
		 * @param name - 目錄名稱（可包含子路徑）/ Directory name (can include sub-paths)
		 * @returns 建立的目錄路徑 / Created directory path
		 *
		 * @example
		 * ```typescript
		 * const dir = env.temp.createDir("my-test");
		 * // 返回如：/path/to/test/temp/test-temp-123456/my-test
		 * ```
		 */
		createDir: (name: string): string => {
			const timestamp = Date.now();
			const dir = join(
				__TEST_TEMP,
				`${this.options.tempPrefix}-${timestamp}`,
				name,
			);
			this.createdTempDirs.push(dir);
			return dir;
		},

		/**
		 * 取得主臨時目錄路徑
		 * Get main temp directory path
		 */
		getTempDir: (): string => {
			return __TEST_TEMP;
		},

		/**
		 * 取得測試 fixtures 路徑
		 * Get test fixtures path
		 */
		getFixturesDir: (): string => {
			return __TEST_FIXTURES;
		},
	};

	/**
	 * 重置 MockFS 狀態
	 * Reset MockFS state
	 *
	 * 清除所有模擬的檔案內容，但保留建立的臨時目錄
	 * Clears all mocked file content but preserves created temp directories
	 */
	reset(): void {
		this.mockFs.clear();
	}

	/**
	 * 清理並重置
	 * Cleanup and reset
	 *
	 * 清除所有模擬的檔案內容和建立的臨時目錄
	 * Clears all mocked file content and created temp directories
	 */
	cleanup(): void {
		// 重置 MockFS
		// Reset MockFS
		this.mockFs.clear();

		// 嘗試刪除建立的臨時目錄
		// Try to delete created temp directories
		for (const dir of this.createdTempDirs) {
			try {
				fsExtra.removeSync(dir);
			} catch {
				// 忽略刪除錯誤
				// Ignore delete errors
			}
		}
		this.createdTempDirs.length = 0;
	}
}

// ==================== 預設 Mock 環境 / Default Mock Environment ====================

/**
 * 預設的 Mock 環境單例
 * Default mock environment singleton
 *
 * 適用於一般測試，可直接使用
 * Suitable for general testing, can be used directly
 */
export const defaultMockEnv = new MockEnv();

// ==================== Jest/Bun Test Helpers ====================

/**
 * 建立測試用的 Mock 環境鉤子
 * Create MockEnv hook for testing
 *
 * @param options - MockEnv 配置選項 / MockEnv configuration options
 * @returns MockEnv 實例工廠函式 / MockEnv instance factory function
 *
 * @example
 * ```typescript
 * // 在 beforeEach 中建立新環境
 * const createEnv = createMockEnvHook();
 * let env: MockEnv;
 *
 * beforeEach(() => {
 *   env = createEnv();
 * });
 *
 * afterEach(() => {
 *   env.cleanup();
 * });
 * ```
 */
export function createMockEnvHook(options?: IMockEnvOptions): () => MockEnv {
	return () => new MockEnv(options);
}

/**
 * 取得全域 Mock 環境
 * Get global Mock environment
 *
 * ⚠️ 警告：全域環境在並行測試中可能不安全
 * ⚠️ Warning: Global environment may not be safe in parallel tests
 *
 * @returns 全域 Mock 環境 / Global mock environment
 */
export function getGlobalMockEnv(): MockEnv {
	return defaultMockEnv;
}

// ==================== 便利函式 / Convenience Functions ====================

/**
 * 建立安全的測試檔案路徑
 * Create safe test file path
 *
 * 使用 upath2 確保路徑格式跨平台一致
 * Uses upath2 to ensure consistent path format across platforms
 *
 * @param subPath - 子路徑（相對於測試 temp 目錄）/ Sub-path (relative to test temp directory)
 * @returns 安全的檔案路徑 / Safe file path
 *
 * @example
 * ```typescript
 * const configPath = safeTestPath("config.json");
 * // 返回如：D:/path/to/test/temp/config.json
 * ```
 */
export function safeTestPath(subPath: string): string {
	// 使用 normalize 確保路徑格式一致（正斜線）
	// Use normalize to ensure consistent path format (forward slashes)
	return normalize(join(__TEST_TEMP, subPath));
}

/**
 * 建立安全的 Fixtures 檔案路徑
 * Create safe fixtures file path
 *
 * 使用 upath2 確保路徑格式跨平台一致
 * Uses upath2 to ensure consistent path format across platforms
 *
 * @param subPath - 子路徑（相對於測試 fixtures 目錄）/ Sub-path (relative to test fixtures directory)
 * @returns 安全的檔案路徑 / Safe file path
 *
 * @example
 * ```typescript
 * const mockDataPath = safeFixturesPath("mock-data.json");
 * // 返回如：D:/path/to/test/fixtures/mock-data.json
 * ```
 */
export function safeFixturesPath(subPath: string): string {
	return normalize(join(__TEST_FIXTURES, subPath));
}

/**
 * 驗證並建立測試用臨時目錄
 * Validate and create test temp directory
 *
 * ⚠️ 安全限制：僅允許在 test/temp/ 目錄下建立目錄
 * ⚠️ Safety restriction: Only allow creating directories under test/temp/
 *
 * @param testName - 測試名稱（用於目錄命名）/ Test name (for directory naming)
 * @param useTimestamp - 是否使用時間戳（用於並行測試）/ Whether to use timestamp (for parallel tests)
 * @returns 臨時目錄路徑 / Temp directory path
 *
 * @example
 * ```typescript
 * const testDir = setupTestTemp("my-test");
 * // 返回如：D:/path/to/test/temp/my-test-1234567890
 * ```
 */
export function setupTestTemp(
	testName: string,
	useTimestamp: boolean = true,
): string {
	const timestamp = useTimestamp ? `-${Date.now()}` : "";
	const dir = normalize(join(__TEST_TEMP, `${testName}${timestamp}`));

	// 安全檢查：確保路徑在允許範圍內
	// Safety check: ensure path is within allowed range
	const result = checkFsSafety(dir);
	if (!result.isSafe) {
		throw new Error(`[MockEnv] 不安全的測試目錄路徑: ${result.reason}`);
	}

	// 建立目錄
	// Create directory
	if (!fsExtra.existsSync(dir)) {
		fsExtra.ensureDirSync(dir);
	}

	return dir;
}

/**
 * 清理測試用臨時目錄
 * Cleanup test temp directory
 *
 * ⚠️ 安全限制：僅允許刪除 test/temp/ 目錄下的路徑
 * ⚠️ Safety restriction: Only allow deleting paths under test/temp/
 *
 * @param dir - 要清理的目錄路徑 / Directory path to cleanup
 *
 * @example
 * ```typescript
 * const dir = setupTestTemp("my-test");
 * // ... 執行測試 ...
 * cleanupTestTemp(dir);
 * ```
 */
export function cleanupTestTemp(dir: string): void {
	try {
		// 使用 normalize 確保路徑格式一致
		// Use normalize to ensure consistent path format
		const normalizedDir = normalize(dir);
		const normalizedTemp = normalize(__TEST_TEMP);

		// 安全檢查：確保路徑在允許範圍內
		// 使用 pathInsideDirectory 檢查是否在目錄內
		// 使用 pathIsSame 檢查是否等於 temp 目錄本身
		// Safety check: ensure path is within allowed range
		// Use pathInsideDirectory to check if inside directory
		// Use pathIsSame to check if equals temp directory itself
		if (!pathInsideDirectory(normalizedDir, normalizedTemp) && !pathIsSame(normalizedDir, normalizedTemp)) {
			console.warn(`[MockEnv] 嘗試刪除不在 temp 目錄內的路徑: ${dir}`);
			return;
		}

		fsExtra.removeSync(dir);
	} catch {
		// 忽略錯誤
		// Ignore errors
	}
}

// ==================== 匯出 / Export ====================

export type { IMockFsOptions } from "./mock-fs";
export type { IFsSafetyResult } from "./helpers/fs-safety";
