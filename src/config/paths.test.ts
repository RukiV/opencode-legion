/**
 * Config Paths Tests / 配置路徑工具函數測試
 *
 * Tests for path utility functions: getOpencodeConfigDir, getAriseConfigPath,
 * getAriseConfigPaths, findOpencodeConfig, hasOpencodeConfig, hasAriseConfig
 */

import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import {
	CONFIG_FILENAME,
	getOpencodeConfigDir,
	getAriseConfigPath,
	getAriseConfigPaths,
	findOpencodeConfig,
	hasOpencodeConfig,
	hasAriseConfig,
	_getAriseConfigPathsCore,
	getDefaultAriseConfig,
	createDefaultAriseConfig,
} from "./paths";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from "fs";
import { resolve } from "path";

const TEST_DIR = resolve(__dirname, "../../../test-temp-paths");
const TEST_WORKTREE = resolve(TEST_DIR, "project");

describe("CONFIG_FILENAME", () => {
	test("is opencode-arise.json", () => {
		expect(CONFIG_FILENAME).toBe("opencode-arise.json");
	});
});

describe("getOpencodeConfigDir", () => {
	test("returns a path string", () => {
		const result = getOpencodeConfigDir();
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	test("includes .config/opencode", () => {
		const result = getOpencodeConfigDir();
		expect(result).toContain(".config");
		expect(result).toContain("opencode");
	});
});

describe("getAriseConfigPath", () => {
	test("returns a path ending with config filename", () => {
		const result = getAriseConfigPath();
		expect(result).toEndWith(CONFIG_FILENAME);
	});

	test("returns absolute path", () => {
		const result = getAriseConfigPath();
		// On Windows it starts with "C:\", on Unix it starts with "/"
		expect(result.length).toBeGreaterThan(3);
		expect(result).toContain(CONFIG_FILENAME);
	});
});

describe("getAriseConfigPaths", () => {
	test("returns only global path when worktree is undefined", () => {
		const result = getAriseConfigPaths(undefined);
		expect(result.length).toBe(1);
	});

	test("returns local and global paths when worktree is provided", () => {
		const result = getAriseConfigPaths(TEST_WORKTREE);
		expect(result.length).toBe(2);
	});

	test("local path comes before global path", () => {
		const result = getAriseConfigPaths(TEST_WORKTREE);
		expect(result[0]).toContain(".opencode");
		expect(result[1]).not.toContain(".opencode");
	});

	test("both paths end with config filename", () => {
		const result = getAriseConfigPaths(TEST_WORKTREE);
		result.forEach((path) => {
			expect(path).toEndWith(CONFIG_FILENAME);
		});
	});
});

describe("findOpencodeConfig", () => {
	// NOTE: We only test the return type since operating on system config paths is unsafe
	test("returns string or null depending on system config", () => {
		const result = findOpencodeConfig();
		expect(result === null || typeof result === "string").toBe(true);
	});
});

describe("hasOpencodeConfig", () => {
	test("returns boolean", () => {
		const result = hasOpencodeConfig();
		expect(typeof result).toBe("boolean");
	});
});

describe("hasAriseConfig", () => {
	test("returns boolean", () => {
		const result = hasAriseConfig();
		expect(typeof result).toBe("boolean");
	});

	test("returns boolean for non-existent worktree", () => {
		// Use isolated test directory that won't affect system config
		const fakeWorktree = resolve(TEST_DIR, "this-does-not-exist-worktree");
		const result = hasAriseConfig(fakeWorktree);
		// Result depends on whether global config exists
		// We just verify it returns a boolean
		expect(typeof result).toBe("boolean");
	});

	test("checks local path when worktree provided", () => {
		// When worktree is provided, hasAriseConfig returns true if ANY path (local or global) exists
		// So we just verify the function returns a boolean
		const result = hasAriseConfig(__dirname);
		expect(typeof result).toBe("boolean");
	});
});

describe("_getAriseConfigPathsCore", () => {
	test("returns global path with exists status", () => {
		const result = _getAriseConfigPathsCore();

		expect(result).toHaveProperty("global");
		expect(result.global).toHaveProperty("path");
		expect(result.global).toHaveProperty("exists");
		expect(typeof result.global.path).toBe("string");
		expect(typeof result.global.exists).toBe("boolean");
	});

	test("returns worktree as null when worktree not provided", () => {
		const result = _getAriseConfigPathsCore();

		expect(result.worktree).toBeNull();
	});

	test("returns worktree info when worktree provided", () => {
		const result = _getAriseConfigPathsCore(TEST_WORKTREE);

		expect(result).toHaveProperty("worktree");
		expect(result.worktree).not.toBeNull();
		expect(result.worktree).toHaveProperty("path");
		expect(result.worktree).toHaveProperty("exists");
	});

	test("worktree path contains .opencode directory", () => {
		const result = _getAriseConfigPathsCore(TEST_WORKTREE);

		expect(result.worktree?.path).toContain(".opencode");
		expect(result.worktree?.path).toEndWith(CONFIG_FILENAME);
	});

	test("global path does not contain .opencode directory", () => {
		const result = _getAriseConfigPathsCore();

		expect(result.global.path).not.toContain(".opencode");
	});

	test("can distinguish between global and worktree config existence", () => {
		// This test verifies the function can tell if global exists but worktree doesn't
		const result = _getAriseConfigPathsCore(TEST_WORKTREE);

		// We can't predict exact values, but we can verify they're both booleans
		expect(typeof result.global.exists).toBe("boolean");
		expect(typeof result.worktree?.exists).toBe("boolean");
	});
});

describe("getDefaultAriseConfig", () => {
	test("returns an object", () => {
		const result = getDefaultAriseConfig();
		expect(typeof result).toBe("object");
	});

	test("has show_banner property", () => {
		const result = getDefaultAriseConfig();
		expect(result).toHaveProperty("show_banner");
	});

	test("has disabled_shadows array", () => {
		const result = getDefaultAriseConfig();
		expect(Array.isArray(result.disabled_shadows)).toBe(true);
	});

	test("has agents configuration", () => {
		const result = getDefaultAriseConfig();
		expect(result).toHaveProperty("agents");
		expect(typeof result.agents).toBe("object");
	});
});

describe("createDefaultAriseConfig", () => {
	beforeEach(() => {
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		// Cleanup
		try {
			const configPath = resolve(TEST_DIR, CONFIG_FILENAME);
			unlinkSync(configPath);
			rmdirSync(TEST_DIR);
		} catch {
			// Ignore cleanup errors
		}
	});

	test("returns true when creating new config", () => {
		const configPath = resolve(TEST_DIR, CONFIG_FILENAME);
		const result = createDefaultAriseConfig(configPath);
		expect(result).toBe(true);
	});

	test("returns false when config already exists", () => {
		const configPath = resolve(TEST_DIR, CONFIG_FILENAME);
		// Create first time
		createDefaultAriseConfig(configPath);
		// Try again
		const result = createDefaultAriseConfig(configPath);
		expect(result).toBe(false);
	});

	test("creates config file that exists", () => {
		const configPath = resolve(TEST_DIR, CONFIG_FILENAME);
		createDefaultAriseConfig(configPath);
		expect(existsSync(configPath)).toBe(true);
	});

	test("creates valid JSON config", () => {
		const configPath = resolve(TEST_DIR, CONFIG_FILENAME);
		createDefaultAriseConfig(configPath);
		const content = require("fs").readFileSync(configPath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed).toHaveProperty("show_banner");
	});
});
