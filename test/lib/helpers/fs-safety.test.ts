/**
 * 檔案系統安全檢查工具測試
 * File System Safety Checker Tests
 *
 * 驗證路徑安全檢查功能，防止意外操作系統關鍵目錄
 * Verify path safety check functionality to prevent accidental operations on system-critical directories
 *
 * @module test/lib/helpers/fs-safety.test
 */

// @noUnusedParameters:false
/// <reference types="bun" />
/// <reference types="node" />

import { describe, expect, it } from "bun:test";
import {
	checkFsSafety,
	assertFsSafety,
	createSafeFsWrapper,
	getSafePrefixes,
	getDangerousKeywords,
	type IFsSafetyResult,
} from "./fs-safety";
import { __TEST_TEMP, __TEST_FIXTURES, __ROOT } from "../../../__root";

/**
 * ============================================================================
 * 第一部分：基本工具函式測試
 * Part 1: Basic utility function tests
 * ============================================================================
 */
describe("getSafePrefixes", () => {
	it("should return array of safe prefixes", () => {
		const prefixes = getSafePrefixes();
		expect(Array.isArray(prefixes)).toBe(true);
		expect(prefixes.length).toBeGreaterThan(0);
	});

	it("should include test temp directory", () => {
		const prefixes = getSafePrefixes();
		expect(prefixes).toContain(__TEST_TEMP);
	});

	it("should include test fixtures directory", () => {
		const prefixes = getSafePrefixes();
		expect(prefixes).toContain(__TEST_FIXTURES);
	});

	it("should include project root", () => {
		const prefixes = getSafePrefixes();
		expect(prefixes).toContain(__ROOT);
	});
});

describe("getDangerousKeywords", () => {
	it("should return array of dangerous keywords", () => {
		const keywords = getDangerousKeywords();
		expect(Array.isArray(keywords)).toBe(true);
		expect(keywords.length).toBeGreaterThan(0);
	});

	it("should include Windows system directories", () => {
		const keywords = getDangerousKeywords();
		expect(keywords.some((k) => k.includes("Windows"))).toBe(true);
	});

	it("should include Unix system directories", () => {
		const keywords = getDangerousKeywords();
		expect(keywords.some((k) => k.includes("/etc/"))).toBe(true);
		expect(keywords.some((k) => k.includes("/bin/"))).toBe(true);
	});
});

/**
 * ============================================================================
 * 第二部分：安全路徑測試
 * Part 2: Safe path tests
 * ============================================================================
 */
describe("checkFsSafety - Safe Paths", () => {
	describe("test temp directory", () => {
		it("should mark test temp as safe", () => {
			const result = checkFsSafety(__TEST_TEMP);
			expect(result.isSafe).toBe(true);
			expect(result.rule).toBe("whitelist");
		});

		it("should mark files in test temp as safe", () => {
			const result = checkFsSafety(`${__TEST_TEMP}/test-file.txt`);
			expect(result.isSafe).toBe(true);
			expect(result.rule).toBe("whitelist");
		});

		it("should mark nested paths in test temp as safe", () => {
			const result = checkFsSafety(`${__TEST_TEMP}/nested/deep/path/file.txt`);
			expect(result.isSafe).toBe(true);
			expect(result.rule).toBe("whitelist");
		});
	});

	describe("test fixtures directory", () => {
		it("should mark test fixtures as safe", () => {
			const result = checkFsSafety(__TEST_FIXTURES);
			expect(result.isSafe).toBe(true);
			expect(result.rule).toBe("whitelist");
		});

		it("should mark files in test fixtures as safe", () => {
			const result = checkFsSafety(`${__TEST_FIXTURES}/config.json`);
			expect(result.isSafe).toBe(true);
			expect(result.rule).toBe("whitelist");
		});
	});

	describe("project root directory", () => {
		it("should mark project root as safe", () => {
			const result = checkFsSafety(__ROOT);
			expect(result.isSafe).toBe(true);
			expect(result.rule).toBe("whitelist");
		});

		it("should mark files in project root as safe", () => {
			const result = checkFsSafety(`${__ROOT}/package.json`);
			expect(result.isSafe).toBe(true);
			expect(result.rule).toBe("whitelist");
		});

		it("should mark src directory as safe", () => {
			const result = checkFsSafety(`${__ROOT}/src`);
			expect(result.isSafe).toBe(true);
			expect(result.rule).toBe("whitelist");
		});
	});
});

/**
 * ============================================================================
 * 第三部分：危險關鍵詞測試
 * Part 3: Dangerous keyword tests
 * ============================================================================
 */
describe("checkFsSafety - Dangerous Keywords", () => {
	it("should block Unix /etc/passwd", () => {
		const result = checkFsSafety("/etc/passwd");
		expect(result.isSafe).toBe(false);
		// 可能是 dangerous_keyword 或 outside_root，取決於路徑處理順序
		// May be dangerous_keyword or outside_root, depending on path processing order
		expect(["dangerous_keyword", "outside_root"]).toContain(result.rule);
	});

	it("should block /usr/bin", () => {
		const result = checkFsSafety("/usr/bin/bash");
		expect(result.isSafe).toBe(false);
		expect(["dangerous_keyword", "outside_root"]).toContain(result.rule);
	});

	it("should block sys directory", () => {
		const result = checkFsSafety("/sys/kernel");
		expect(result.isSafe).toBe(false);
		expect(["dangerous_keyword", "outside_root"]).toContain(result.rule);
	});

	it("should block /tmp that is outside test temp", () => {
		const result = checkFsSafety("/tmp/sensitive-data.txt");
		expect(result.isSafe).toBe(false);
		expect(result.rule).toBe("outside_root");
	});
});

/**
 * ============================================================================
 * 第四部分：相對路徑測試
 * Part 4: Relative path tests
 * ============================================================================
 */
describe("checkFsSafety - Relative Paths", () => {
	it("should block relative paths by default", () => {
		const result = checkFsSafety("relative/path/file.txt");
		expect(result.isSafe).toBe(false);
		expect(result.rule).toBe("relative_path");
	});

	it("should allow relative paths when allowRelative is true", () => {
		const result = checkFsSafety("relative/path/file.txt", true);
		// 允許相對路徑，但仍然檢查危險關鍵詞
		// Allow relative paths, but still check dangerous keywords
		expect(result.rule).not.toBe("relative_path");
	});
});

/**
 * ============================================================================
 * 第五部分：assertFsSafety 測試
 * Part 5: assertFsSafety tests
 * ============================================================================
 */
describe("assertFsSafety", () => {
	it("should not throw for safe paths", () => {
		expect(() => {
			assertFsSafety(__TEST_TEMP);
		}).not.toThrow();
	});

	it("should throw for unsafe paths", () => {
		expect(() => {
			assertFsSafety("/etc/passwd");
		}).toThrow();
	});

	it("should include rule in error message", () => {
		let errorThrown = false;
		let errorRule = "";

		try {
			assertFsSafety("/etc/passwd");
		} catch (error) {
			errorThrown = true;
			const message = (error as Error).message;
			if (message.includes("dangerous_keyword")) {
				errorRule = "dangerous_keyword";
			} else if (message.includes("outside_root")) {
				errorRule = "outside_root";
			}
		}

		expect(errorThrown).toBe(true);
		expect(errorRule).not.toBe("");
	});

	it("should include operation in error message", () => {
		let errorThrown = false;

		try {
			assertFsSafety("/etc/passwd", "writeFile");
		} catch (error) {
			errorThrown = true;
			const message = (error as Error).message;
			expect(message).toContain("writeFile");
		}

		expect(errorThrown).toBe(true);
	});
});

/**
 * ============================================================================
 * 第六部分：createSafeFsWrapper 測試
 * Part 6: createSafeFsWrapper tests
 * ============================================================================
 */
describe("createSafeFsWrapper", () => {
	const mockFsModule = {
		readFileSync: (path: string) => `content of ${path}`,
		writeFileSync: (path: string, _content: string) => {
			// Mock implementation
		},
		existsSync: (_path: string) => true,
		statSync: (_path: string) => ({ size: 100 }),
	};

	it("should create wrapper with same interface", () => {
		const wrapper = createSafeFsWrapper(mockFsModule);
		expect(typeof wrapper.readFileSync).toBe("function");
		expect(typeof wrapper.writeFileSync).toBe("function");
		expect(typeof wrapper.existsSync).toBe("function");
	});

	it("should pass safe paths to underlying functions", () => {
		const wrapper = createSafeFsWrapper(mockFsModule);
		const result = wrapper.readFileSync(`${__TEST_TEMP}/test.txt`);
		expect(result).toBe(`content of ${__TEST_TEMP}/test.txt`);
	});

	it("should throw for unsafe paths", () => {
		const wrapper = createSafeFsWrapper(mockFsModule);
		expect(() => {
			wrapper.writeFileSync("/etc/passwd", "malicious");
		}).toThrow();
	});

	it("should preserve non-function properties", () => {
		const mockWithProps = {
			...mockFsModule,
			constant: 42,
			flag: true,
		};
		const wrapper = createSafeFsWrapper(mockWithProps);
		expect((wrapper as typeof mockWithProps).constant).toBe(42);
		expect((wrapper as typeof mockWithProps).flag).toBe(true);
	});
});

/**
 * ============================================================================
 * 第七部分：IFsSafetyResult 類型測試
 * Part 7: IFsSafetyResult type tests
 * ============================================================================
 */
describe("IFsSafetyResult interface", () => {
	it("should have correct structure for safe results", () => {
		const result = checkFsSafety(__TEST_TEMP);
		expect(result).toHaveProperty("isSafe");
		expect(result).toHaveProperty("reason");
		expect(result).toHaveProperty("rule");
		expect(typeof result.isSafe).toBe("boolean");
		expect(typeof result.reason).toBe("string");
		expect(typeof result.rule).toBe("string");
	});

	it("should have correct rule values", () => {
		const safeResult = checkFsSafety(__TEST_TEMP);
		const unsafeResult = checkFsSafety("/tmp/outside");

		const validRules = ["whitelist", "dangerous_keyword", "outside_root", "relative_path", "unknown"];

		expect(validRules).toContain(safeResult.rule);
		expect(validRules).toContain(unsafeResult.rule);
	});
});
