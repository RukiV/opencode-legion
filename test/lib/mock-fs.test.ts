/**
 * Mock 檔案系統測試
 * Mock File System Tests
 *
 * 驗證 MockFs 類的檔案系統模擬功能
 * Verify MockFs class file system simulation functionality
 *
 * @module test/lib/mock-fs.test
 */

// @noUnusedParameters:false
/// <reference types="bun" />
/// <reference types="node" />

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { MockFs, defaultMockFs } from "./mock-fs";
import { __TEST_TEMP } from "../../__root";

/**
 * ============================================================================
 * 第一部分：基本功能測試（停用安全檢查）
 * Part 1: Basic functionality tests (safety checks disabled)
 * ============================================================================
 */
describe("MockFs - Basic Operations (Safety Disabled)", () => {
	let mockFs: MockFs;

	beforeEach(() => {
		// 停用安全檢查以測試基本功能
		// Disable safety checks for basic functionality testing
		mockFs = new MockFs({ enableSafetyCheck: false });
	});

	afterEach(() => {
		mockFs.clear();
	});

	describe("writeFileSync / readFileSync", () => {
		it("should write and read text file", () => {
			const path = "/test/file.txt";
			const content = "Hello, World!";

			mockFs.writeFileSync(path, content);
			const result = mockFs.readFileSync(path);

			expect(result).toBe(content);
		});

		it("should overwrite existing file", () => {
			const path = "/test/file.txt";

			mockFs.writeFileSync(path, "original");
			mockFs.writeFileSync(path, "updated");

			expect(mockFs.readFileSync(path)).toBe("updated");
		});

		it("should handle empty content", () => {
			const path = "/test/empty.txt";

			mockFs.writeFileSync(path, "");
			const result = mockFs.readFileSync(path);

			expect(result).toBe("");
		});

		it("should handle unicode content", () => {
			const path = "/test/unicode.txt";
			const content = "你好世界 🌍 مرحبا";

			mockFs.writeFileSync(path, content);
			const result = mockFs.readFileSync(path);

			expect(result).toBe(content);
		});

		it("should throw for non-existent file", () => {
			const path = "/test/nonexistent.txt";

			expect(() => {
				mockFs.readFileSync(path);
			}).toThrow();
		});
	});

	describe("writeJsonSync / readJsonSync", () => {
		it("should write and read JSON file", () => {
			const path = "/test/data.json";
			const data = { name: "test", value: 123 };

			mockFs.writeJsonSync(path, data);
			const result = mockFs.readJsonSync<typeof data>(path);

			expect(result).toEqual(data);
		});

		it("should pretty-print JSON", () => {
			const path = "/test/data.json";
			const data = { nested: { key: "value" } };

			mockFs.writeJsonSync(path, data);
			const content = mockFs.readFileSync(path);

			expect(content).toContain("\n");
			expect(content).toContain("  ");
		});

		it("should handle arrays", () => {
			const path = "/test/array.json";
			const data = [1, 2, 3, "four", true];

			mockFs.writeJsonSync(path, data);
			const result = mockFs.readJsonSync<typeof data>(path);

			expect(result).toEqual(data);
		});
	});

	describe("mkdirSync", () => {
		it("should create directory", () => {
			const path = "/test/newdir";

			mockFs.mkdirSync(path);

			expect(mockFs.isDirectory(path)).toBe(true);
		});

		it("should create nested directories", () => {
			const path = "/test/nested/deep/path";

			mockFs.mkdirSync(path, true);

			expect(mockFs.isDirectory(path)).toBe(true);
		});

		it("should not throw when directory already exists", () => {
			const path = "/test/existing";

			mockFs.mkdirSync(path);
			expect(() => {
				mockFs.mkdirSync(path);
			}).not.toThrow();
		});
	});

	describe("rmSync", () => {
		it("should delete file", () => {
			const path = "/test/file.txt";

			mockFs.writeFileSync(path, "content");
			expect(mockFs.existsSync(path)).toBe(true);

			mockFs.rmSync(path);
			expect(mockFs.existsSync(path)).toBe(false);
		});

		it("should delete empty directory", () => {
			const path = "/test/emptydir";

			mockFs.mkdirSync(path);
			mockFs.rmSync(path);

			expect(mockFs.isDirectory(path)).toBe(false);
		});

		it("should delete directory with recursive option", () => {
			const dirPath = "/test/fulldir";
			const filePath = "/test/fulldir/file.txt";

			mockFs.mkdirSync(dirPath);
			mockFs.writeFileSync(filePath, "content");

			mockFs.rmSync(dirPath, { recursive: true });

			expect(mockFs.existsSync(dirPath)).toBe(false);
			expect(mockFs.existsSync(filePath)).toBe(false);
		});
	});

	describe("existsSync", () => {
		it("should return true for existing file", () => {
			const path = "/test/exists.txt";
			mockFs.writeFileSync(path, "content");

			expect(mockFs.existsSync(path)).toBe(true);
		});

		it("should return false for non-existent path", () => {
			expect(mockFs.existsSync("/test/doesnotexist.txt")).toBe(false);
		});
	});

	describe("isDirectory", () => {
		it("should return true for directory", () => {
			const path = "/test/mydir";
			mockFs.mkdirSync(path);

			expect(mockFs.isDirectory(path)).toBe(true);
		});

		it("should return false for file", () => {
			const path = "/test/myfile.txt";
			mockFs.writeFileSync(path, "content");

			expect(mockFs.isDirectory(path)).toBe(false);
		});
	});

	describe("isFile", () => {
		it("should return true for file", () => {
			const path = "/test/myfile.txt";
			mockFs.writeFileSync(path, "content");

			expect(mockFs.isFile(path)).toBe(true);
		});

		it("should return false for directory", () => {
			const path = "/test/mydir";
			mockFs.mkdirSync(path);

			expect(mockFs.isFile(path)).toBe(false);
		});
	});

	describe("readdirSync", () => {
		it("should list directory contents", () => {
			const dir = "/test/listing";
			mockFs.mkdirSync(dir);
			mockFs.writeFileSync(`${dir}/file1.txt`, "");
			mockFs.writeFileSync(`${dir}/file2.txt`, "");
			mockFs.mkdirSync(`${dir}/subdir`);

			const entries = mockFs.readdirSync(dir);

			expect(entries).toContain("file1.txt");
			expect(entries).toContain("file2.txt");
			expect(entries).toContain("subdir");
		});

		it("should throw for non-existent directory", () => {
			expect(() => {
				mockFs.readdirSync("/test/nonexistent");
			}).toThrow();
		});
	});

	describe("statSync", () => {
		it("should return file stats", () => {
			const path = "/test/stats.txt";
			const content = "test content";
			mockFs.writeFileSync(path, content);

			const stats = mockFs.statSync(path);

			expect(stats.isFile).toBe(true);
			expect(stats.isDirectory).toBe(false);
			expect(stats.size).toBe(content.length);
		});

		it("should return directory stats", () => {
			const path = "/test/statsdir";
			mockFs.mkdirSync(path);

			const stats = mockFs.statSync(path);

			expect(stats.isFile).toBe(false);
			expect(stats.isDirectory).toBe(true);
			expect(stats.size).toBe(0);
		});
	});

	describe("copyFileSync", () => {
		it("should copy file", () => {
			const src = "/test/source.txt";
			const dest = "/test/dest.txt";
			const content = "copy me";

			mockFs.writeFileSync(src, content);
			mockFs.copyFileSync(src, dest);

			expect(mockFs.readFileSync(dest)).toBe(content);
			expect(mockFs.existsSync(src)).toBe(true); // Original still exists
		});

		it("should overwrite existing destination", () => {
			const src = "/test/source.txt";
			const dest = "/test/dest.txt";

			mockFs.writeFileSync(src, "new content");
			mockFs.writeFileSync(dest, "old content");
			mockFs.copyFileSync(src, dest);

			expect(mockFs.readFileSync(dest)).toBe("new content");
		});
	});

	describe("setFiles", () => {
		it("should set multiple files at once", () => {
			const files: Record<string, string> = {
				"/test/file1.txt": "content 1",
				"/test/file2.txt": "content 2",
				"/test/file3.txt": "content 3",
			};

			mockFs.setFiles(files);

			expect(mockFs.readFileSync("/test/file1.txt")).toBe("content 1");
			expect(mockFs.readFileSync("/test/file2.txt")).toBe("content 2");
			expect(mockFs.readFileSync("/test/file3.txt")).toBe("content 3");
		});
	});

	describe("clear", () => {
		it("should clear all files", () => {
			mockFs.writeFileSync("/test/file1.txt", "content 1");
			mockFs.writeFileSync("/test/file2.txt", "content 2");
			mockFs.mkdirSync("/test/subdir");

			mockFs.clear();

			expect(mockFs.existsSync("/test/file1.txt")).toBe(false);
			expect(mockFs.existsSync("/test/file2.txt")).toBe(false);
			expect(mockFs.isDirectory("/test/subdir")).toBe(false);
		});
	});

	describe("toDebugString", () => {
		it("should return string representation", () => {
			mockFs.writeFileSync("/test/file.txt", "content");
			mockFs.mkdirSync("/test/subdir");

			const debug = mockFs.toDebugString();

			expect(typeof debug).toBe("string");
			expect(debug).toContain("📁"); // 包含目錄標記
		});
	});
});

/**
 * ============================================================================
 * 第二部分：安全檢查測試
 * Part 2: Safety checks tests
 * ============================================================================
 */
describe("MockFs - Safety Checks", () => {
	describe("with safety checks enabled (default)", () => {
		let mockFs: MockFs;

		beforeEach(() => {
			// 預設啟用安全檢查
			// Enable safety checks by default
			mockFs = new MockFs({ enableSafetyCheck: true });
		});

		afterEach(() => {
			mockFs.clear();
		});

		it("should block dangerous paths like /etc/passwd", () => {
			expect(() => {
				mockFs.writeFileSync("/etc/passwd", "malicious");
			}).toThrow();
		});

		it("should block Windows system paths", () => {
			expect(() => {
				mockFs.writeFileSync("C:/Windows/System32/config.sys", "malicious");
			}).toThrow();
		});

		it("should block paths outside project root", () => {
			expect(() => {
				mockFs.writeFileSync("/tmp/outside.txt", "malicious");
			}).toThrow();
		});

		it("should allow paths within safe prefixes", () => {
			const safePath = `${__TEST_TEMP}/test.txt`;
			expect(() => {
				mockFs.writeFileSync(safePath, "content");
			}).not.toThrow();
		});
	});

	describe("with safety checks disabled", () => {
		let mockFs: MockFs;

		beforeEach(() => {
			mockFs = new MockFs({ enableSafetyCheck: false });
		});

		afterEach(() => {
			mockFs.clear();
		});

		it("should allow dangerous paths when safety check disabled", () => {
			expect(() => {
				mockFs.writeFileSync("/etc/passwd", "malicious");
			}).not.toThrow();
		});
	});
});

/**
 * ============================================================================
 * 第三部分：配置選項測試
 * Part 3: Configuration options tests
 * ============================================================================
 */
describe("MockFs - Configuration Options", () => {
	describe("auto-create directories", () => {
		it("should create parent directories by default", () => {
			const mockFs = new MockFs({ autoCreateDir: true, enableSafetyCheck: false });

			expect(() => {
				mockFs.writeFileSync("/test/nonexistent/parent/file.txt", "content");
			}).not.toThrow();

			mockFs.clear();
		});

		it("should throw when parent directory doesn't exist and autoCreateDir disabled", () => {
			const mockFs = new MockFs({ autoCreateDir: false, enableSafetyCheck: false });

			expect(() => {
				mockFs.writeFileSync("/test/nonexistent/parent/file.txt", "content");
			}).toThrow();

			mockFs.clear();
		});
	});
});

/**
 * ============================================================================
 * 第四部分：預設單例測試
 * Part 4: Default singleton tests
 * ============================================================================
 */
describe("MockFs - Default Singleton", () => {
	it("should be instance of MockFs", () => {
		expect(defaultMockFs instanceof MockFs).toBe(true);
	});

	it("should be usable for testing with safe paths", () => {
		// 使用安全的路徑前綴
		// Use safe path prefix
		const safePath = `${__TEST_TEMP}/default-test.txt`;
		const content = "default test";

		defaultMockFs.writeFileSync(safePath, content);
		expect(defaultMockFs.readFileSync(safePath)).toBe(content);

		defaultMockFs.clear();
	});
});

/**
 * ============================================================================
 * 第五部分：Audit Mode 測試
 * Part 5: Audit Mode tests
 * ============================================================================
 */
describe("MockFs - Audit Mode", () => {
	let auditCounter = 0;

	// 每個測試使用唯一的 audit 目錄
	const createUniqueAuditDir = () => {
		return `${__TEST_TEMP}/audit/${Date.now()}-${++auditCounter}`;
	};

	describe("enableAudit / disableAudit", () => {
		it("should start with audit disabled", () => {
			const mockFs = new MockFs({ enableSafetyCheck: false });
			expect(mockFs.isAuditEnabled).toBe(false);
			expect(mockFs.isAuditModeEnabled()).toBe(false);
		});

		it("should enable audit mode", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir
			});
			mockFs.enableAudit();

			expect(mockFs.isAuditEnabled).toBe(true);
			expect(mockFs.isAuditModeEnabled()).toBe(true);
		});

		it("should disable audit mode", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true
			});
			mockFs.disableAudit();

			expect(mockFs.isAuditEnabled).toBe(false);
			expect(mockFs.isAuditModeEnabled()).toBe(false);
		});

		it("should enable audit with custom patterns", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir
			});
			mockFs.enableAudit(["**/*.ts", "!**/*.test.ts"]);

			expect(mockFs.isAuditEnabled).toBe(true);
			expect(mockFs.getAuditPatterns()).toEqual(["**/*.ts", "!**/*.test.ts"]);
		});
	});

	describe("auditPatterns", () => {
		it("should use default patterns", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir
			});

			expect(mockFs.getAuditPatterns()).toEqual(["**/*"]);
		});

		it("should set custom patterns", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir
			});
			mockFs.setAuditPatterns(["**/*.json", "**/*.txt"]);

			expect(mockFs.getAuditPatterns()).toEqual(["**/*.json", "**/*.txt"]);
		});

		it("should filter files by patterns", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true,
				auditPatterns: ["**/*.txt"]
			});

			mockFs.writeFileSync("/test/file.txt", "text content");
			mockFs.writeFileSync("/test/data.json", '{"key": "value"}');

			// Check audit files
			const auditFiles = mockFs.getAuditFiles();
			expect(auditFiles).toContain("/test/file.txt");
			expect(auditFiles).not.toContain("/test/data.json");
		});

		it("should support negation patterns", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true,
				auditPatterns: ["**/*.ts", "!**/*.test.ts"]
			});

			mockFs.writeFileSync("/test/util.ts", "util code");
			mockFs.writeFileSync("/test/util.test.ts", "test code");
			mockFs.writeFileSync("/test/util.js", "js code");

			const auditFiles = mockFs.getAuditFiles();
			expect(auditFiles).toContain("/test/util.ts");
			expect(auditFiles).not.toContain("/test/util.test.ts");
			expect(auditFiles).not.toContain("/test/util.js");
		});
	});

	describe("audit writing", () => {
		it("should not write to audit when disabled", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: false
			});

			mockFs.writeFileSync("/test/file.txt", "content");
			expect(mockFs.getAuditFiles()).toHaveLength(0);
		});

		it("should write to audit when enabled", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true
			});

			mockFs.writeFileSync("/test/file.txt", "Hello, Audit!");
			const auditFiles = mockFs.getAuditFiles();

			expect(auditFiles).toHaveLength(1);
			expect(mockFs.readAuditFile("/test/file.txt")).toBe("Hello, Audit!");
		});

		it("should dynamically enable audit", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir
			});

			// Write before enabling
			mockFs.writeFileSync("/test/before.txt", "before enable");

			// Enable and write again
			mockFs.enableAudit();
			mockFs.writeFileSync("/test/after.txt", "after enable");

			const auditFiles = mockFs.getAuditFiles();
			expect(auditFiles).not.toContain("/test/before.txt");
			expect(auditFiles).toContain("/test/after.txt");
		});
	});

	describe("constructor options", () => {
		it("should accept auditEnabled in constructor", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true
			});

			expect(mockFs.isAuditEnabled).toBe(true);
		});

		it("should accept auditPatterns in constructor", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true,
				auditPatterns: ["**/*.json"]
			});

			expect(mockFs.getAuditPatterns()).toEqual(["**/*.json"]);
		});
	});

	describe("clearAuditDir", () => {
		it("should clear audit directory", () => {
			const auditDir = createUniqueAuditDir();
			const mockFs = new MockFs({
				enableSafetyCheck: false,
				auditDir: auditDir,
				auditEnabled: true
			});

			mockFs.writeFileSync("/test/file1.txt", "content1");
			mockFs.writeFileSync("/test/file2.txt", "content2");

			expect(mockFs.getAuditFiles()).toHaveLength(2);

			mockFs.clearAuditDir();

			expect(mockFs.getAuditFiles()).toHaveLength(0);
		});
	});
});
