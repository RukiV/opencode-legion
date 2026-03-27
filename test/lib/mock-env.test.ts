/**
 * Mock 環境測試
 * Mock Environment Tests
 *
 * 驗證 MockEnv 類的統一測試 mock 環境功能
 * Verify MockEnv class unified test mock environment functionality
 *
 * @module test/lib/mock-env.test
 */

// @noUnusedParameters:false
/// <reference types="bun" />
/// <reference types="node" />

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
	MockEnv,
	defaultMockEnv,
	createMockEnvHook,
	getGlobalMockEnv,
	safeTestPath,
	safeFixturesPath,
	setupTestTemp,
	cleanupTestTemp,
} from "./mock-env";
import { __TEST_TEMP, __TEST_FIXTURES } from "../../__root";
import { normalize } from "upath2";
import * as fsExtra from "fs-extra";

/**
 * ============================================================================
 * 第一部分：基本功能測試
 * Part 1: Basic functionality tests
 * ============================================================================
 */
describe("MockEnv - Basic Functionality", () => {
	let env: MockEnv;

	beforeEach(() => {
		env = new MockEnv({ mockFs: { enableSafetyCheck: false } });
	});

	afterEach(() => {
		env.cleanup();
	});

	describe("basic properties", () => {
		it("should have mockFs property", () => {
			expect(env.mockFs).toBeDefined();
			expect(typeof env.mockFs.writeFileSync).toBe("function");
			expect(typeof env.mockFs.readFileSync).toBe("function");
		});

		it("should have safeFs property", () => {
			expect(env.safeFs).toBeDefined();
			expect(typeof env.safeFs.writeFileSync).toBe("function");
			expect(typeof env.safeFs.readFileSync).toBe("function");
		});

		it("should have safety property", () => {
			expect(env.safety).toBeDefined();
			expect(typeof env.safety.check).toBe("function");
			expect(typeof env.safety.assert).toBe("function");
		});

		it("should have temp property", () => {
			expect(env.temp).toBeDefined();
			expect(typeof env.temp.createDir).toBe("function");
			expect(typeof env.temp.getTempDir).toBe("function");
			expect(typeof env.temp.getFixturesDir).toBe("function");
		});
	});

	describe("reset", () => {
		it("should clear mockFs", () => {
			env.mockFs.writeFileSync("/test/file.txt", "content");
			expect(env.mockFs.existsSync("/test/file.txt")).toBe(true);

			env.reset();

			expect(env.mockFs.existsSync("/test/file.txt")).toBe(false);
		});
	});

	describe("cleanup", () => {
		it("should clear mockFs", () => {
			env.mockFs.writeFileSync("/test/file.txt", "content");
			env.cleanup();

			expect(env.mockFs.existsSync("/test/file.txt")).toBe(false);
		});
	});
});

/**
 * ============================================================================
 * 第二部分：MockFs 隔離測試
 * Part 2: MockFs isolation tests
 * ============================================================================
 */
describe("MockEnv - MockFs Isolation", () => {
	let env: MockEnv;

	beforeEach(() => {
		env = new MockEnv({ mockFs: { enableSafetyCheck: false } });
	});

	afterEach(() => {
		env.cleanup();
	});

	it("should isolate file operations in memory", () => {
		env.mockFs.writeFileSync("/test/isolated.txt", "isolated content");
		expect(env.mockFs.readFileSync("/test/isolated.txt")).toBe("isolated content");
	});

	it("should not affect real filesystem", () => {
		env.mockFs.writeFileSync("/test/isolated.txt", "isolated content");
		// 在真實檔案系統中應該不存在
		// Should not exist in real filesystem
		const realPath = `${__TEST_TEMP}/isolated.txt`;
		expect(fsExtra.existsSync(realPath)).toBe(false);
	});
});

/**
 * ============================================================================
 * 第三部分：臨時目錄管理測試
 * Part 3: Temporary directory management tests
 * ============================================================================
 */
describe("MockEnv - Temp Management", () => {
	let env: MockEnv;

	beforeEach(() => {
		env = new MockEnv();
	});

	afterEach(() => {
		env.cleanup();
	});

	describe("temp.getTempDir", () => {
		it("should return test temp directory", () => {
			const result = env.temp.getTempDir();
			expect(result).toBe(__TEST_TEMP);
		});
	});

	describe("temp.getFixturesDir", () => {
		it("should return test fixtures directory", () => {
			const result = env.temp.getFixturesDir();
			expect(result).toBe(__TEST_FIXTURES);
		});
	});

	describe("temp.createDir", () => {
		it("should create isolated temp directory with timestamp", () => {
			const dir = env.temp.createDir("test");

			// 路徑應該包含測試 temp 目錄關鍵詞
			// Path should contain test temp directory keyword
			expect(dir).toContain("test-temp");
			expect(dir).toContain("test");
		});

		it("should create nested directories", () => {
			const dir = env.temp.createDir("nested/deep/path");

			expect(dir).toContain("nested");
			expect(dir).toContain("deep");
			expect(dir).toContain("path");
		});
	});
});

/**
 * ============================================================================
 * 第四部分：便利函式測試
 * Part 4: Convenience functions tests
 * ============================================================================
 */
describe("MockEnv - Convenience Functions", () => {
	describe("safeTestPath", () => {
		it("should return path in test temp", () => {
			const path = safeTestPath("config.json");
			expect(path).toContain("test");
			expect(path).toContain("temp");
			expect(path).toContain("config.json");
		});

		it("should handle nested paths", () => {
			const path = safeTestPath("nested/deep/config.json");
			expect(path).toContain("nested");
			expect(path).toContain("config.json");
		});
	});

	describe("safeFixturesPath", () => {
		it("should return path in test fixtures", () => {
			const path = safeFixturesPath("mock-data.json");
			expect(path).toContain("test");
			expect(path).toContain("fixtures");
			expect(path).toContain("mock-data.json");
		});
	});

	describe("setupTestTemp", () => {
		it("should create and return temp directory", () => {
			const dir = setupTestTemp("test-setup");
			expect(dir).toContain("test-setup");

			// 清理
			cleanupTestTemp(dir);
		});

		it("should create directory if not exists", () => {
			const dir = setupTestTemp("test-setup-new");

			expect(fsExtra.existsSync(dir)).toBe(true);

			// 清理
			cleanupTestTemp(dir);
		});
	});

	describe("cleanupTestTemp", () => {
		it("should remove directory", () => {
			const dir = setupTestTemp("test-cleanup");

			expect(fsExtra.existsSync(dir)).toBe(true);

			cleanupTestTemp(dir);

			expect(fsExtra.existsSync(dir)).toBe(false);
		});

		it("should warn when path is outside temp", () => {
			// 建立一個在 temp 外面的測試目錄
			// Create a test directory outside temp
			const outsideDir = normalize(`${__TEST_TEMP}/../temp-should-not-delete`);

			// 應該發出警告但不會拋出錯誤
			// Should warn but not throw error
			expect(() => {
				cleanupTestTemp(outsideDir);
			}).not.toThrow();
		});
	});
});

/**
 * ============================================================================
 * 第五部分：全域單例測試
 * Part 5: Global singleton tests
 * ============================================================================
 */
describe("MockEnv - Global Singletons", () => {
	describe("defaultMockEnv", () => {
		it("should be instance of MockEnv", () => {
			expect(defaultMockEnv instanceof MockEnv).toBe(true);
		});

		it("should be usable with safe paths", () => {
			const safePath = `${__TEST_TEMP}/global-test.txt`;
			defaultMockEnv.mockFs.writeFileSync(safePath, "global content");
			expect(defaultMockEnv.mockFs.readFileSync(safePath)).toBe("global content");
			defaultMockEnv.reset();
		});
	});

	describe("getGlobalMockEnv", () => {
		it("should return defaultMockEnv", () => {
			const env = getGlobalMockEnv();
			expect(env).toBe(defaultMockEnv);
		});
	});

	describe("createMockEnvHook", () => {
		it("should create factory function", () => {
			const createHook = createMockEnvHook();
			expect(typeof createHook).toBe("function");
		});

		it("should create new MockEnv on each call", () => {
			const createHook = createMockEnvHook();
			const env1 = createHook();
			const env2 = createHook();

			expect(env1).not.toBe(env2);
			expect(env1 instanceof MockEnv).toBe(true);
			expect(env2 instanceof MockEnv).toBe(true);

			env1.cleanup();
			env2.cleanup();
		});
	});
});

/**
 * ============================================================================
 * 第六部分：整合測試範例
 * Part 6: Integration test examples
 * ============================================================================
 */
describe("MockEnv - Integration Examples", () => {
	describe("mock config file reading", () => {
		it("should mock config file operations", () => {
			const env = new MockEnv({ mockFs: { enableSafetyCheck: false } });

			// 模擬配置檔案
			// Mock config file
			env.mockFs.writeJsonSync("/test/config.json", {
				show_banner: true,
				agents: { monarch: { poll_interval: 5000 } },
			});

			// 讀取配置
			// Read config
			const config = env.mockFs.readJsonSync<{
				show_banner: boolean;
				agents: Record<string, unknown>;
			}>("/test/config.json");

			expect(config.show_banner).toBe(true);
			expect(config.agents).toBeDefined();

			env.cleanup();
		});
	});

	describe("test file creation and validation", () => {
		it("should validate created files", () => {
			const env = new MockEnv({ mockFs: { enableSafetyCheck: false } });

			// 創建測試資料
			// Create test data
			env.mockFs.writeJsonSync("/test/results.json", {
				items: ["a", "b", "c"],
				count: 3,
			});

			// 驗證資料
			// Validate data
			const data = env.mockFs.readJsonSync<{
				items: string[];
				count: number;
			}>("/test/results.json");

			expect(data.items).toHaveLength(3);
			expect(data.count).toBe(3);

			env.cleanup();
		});
	});
});
