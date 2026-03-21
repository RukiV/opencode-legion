/**
 * Model Cache Tests
 * 模型緩存測試
 *
 * 測試會話模型快取函數：cacheSessionModel、getSessionModel、clearSessionModel、clearAllSessionModels
 * Tests for session model cache functions: cacheSessionModel, getSessionModel, clearSessionModel, clearAllSessionModels
 *
 * 測試重點：
 * 1. 基本的快取讀寫
 * 2. 同一會話的快取覆寫
 * 3. 模型 ID 包含斜線的處理
 * 4. 快取清除的隔離性
 * 5. 多會話的獨立性
 *
 * Test focus areas:
 * 1. Basic cache read/write
 * 2. Cache overwrite for same session
 * 3. Handling model IDs with slashes
 * 4. Isolation of cache clearing
 * 5. Independence of multiple sessions
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
	cacheSessionModel,
	getSessionModel,
	clearSessionModel,
	clearAllSessionModels,
} from "./model-cache";

/**
 * cacheSessionModel 函數測試
 * cacheSessionModel function tests
 */
describe("cacheSessionModel", () => {
	test("caches model for session", () => {
		/** 快取並驗證格式為 provider/modelID / Cache and verify format is provider/modelID */
		const sessionId = "session-123";
		cacheSessionModel(sessionId, "anthropic", "claude-sonnet-4");

		const result = getSessionModel(sessionId);
		expect(result).toBe("anthropic/claude-sonnet-4");
	});

	test("overwrites existing cache", () => {
		/** 同一會話的後續快取會覆寫前面的值 / Subsequent cache for same session overwrites previous value */
		const sessionId = "session-456";
		cacheSessionModel(sessionId, "anthropic", "claude-3");
		cacheSessionModel(sessionId, "openai", "gpt-4");

		const result = getSessionModel(sessionId);
		expect(result).toBe("openai/gpt-4");
	});

	test("handles model ID with slashes", () => {
		/** 模型 ID 可以包含斜線（如 Azure 部署路徑）/ Model ID can contain slashes (e.g., Azure deployment path) */
		const sessionId = "session-789";
		cacheSessionModel(sessionId, "azure", "gpt-4/deployment");

		const result = getSessionModel(sessionId);
		expect(result).toBe("azure/gpt-4/deployment");
	});
});

/**
 * getSessionModel 函數測試
 * getSessionModel function tests
 */
describe("getSessionModel", () => {
	test("returns undefined for non-existent session", () => {
		/** 不存在的會話返回 undefined / Non-existent session returns undefined */
		const result = getSessionModel("non-existent-session");
		expect(result).toBeUndefined();
	});

	test("returns model string format", () => {
		/** 返回格式為 provider/modelID / Returns format provider/modelID */
		const sessionId = "session-test";
		cacheSessionModel(sessionId, "provider", "model-id");

		const result = getSessionModel(sessionId);
		expect(result).toMatch(/^[^\/]+\/[^\/]+/);
	});
});

/**
 * clearSessionModel 函數測試
 * clearSessionModel function tests
 */
describe("clearSessionModel", () => {
	test("removes cached model", () => {
		/** 清除後返回 undefined / Returns undefined after clearing */
		const sessionId = "session-to-clear";
		cacheSessionModel(sessionId, "test", "model");
		clearSessionModel(sessionId);

		const result = getSessionModel(sessionId);
		expect(result).toBeUndefined();
	});

	test("does not affect other sessions", () => {
		/** 清除一個會話不影響其他會話 / Clearing one session doesn't affect others */
		const session1 = "session-1";
		const session2 = "session-2";
		cacheSessionModel(session1, "provider1", "model1");
		cacheSessionModel(session2, "provider2", "model2");

		clearSessionModel(session1);

		expect(getSessionModel(session1)).toBeUndefined();
		expect(getSessionModel(session2)).toBe("provider2/model2");
	});

	test("does not throw for non-existent session", () => {
		/** 清除不存在的會話不拋出異常 / Clearing non-existent session doesn't throw */
		expect(() => clearSessionModel("non-existent")).not.toThrow();
	});
});

/**
 * clearAllSessionModels 函數測試
 * clearAllSessionModels function tests
 */
describe("clearAllSessionModels", () => {
	/** 每個測試前清除所有快取 / Clear all cache before each test */
	beforeEach(() => {
		clearAllSessionModels();
	});

	/** 每個測試後清除所有快取 / Clear all cache after each test */
	afterEach(() => {
		clearAllSessionModels();
	});

	test("clears all cached models", () => {
		/** 清除所有快取後，所有會話都返回 undefined / After clearing all cache, all sessions return undefined */
		cacheSessionModel("session-a", "p1", "m1");
		cacheSessionModel("session-b", "p2", "m2");
		cacheSessionModel("session-c", "p3", "m3");

		clearAllSessionModels();

		expect(getSessionModel("session-a")).toBeUndefined();
		expect(getSessionModel("session-b")).toBeUndefined();
		expect(getSessionModel("session-c")).toBeUndefined();
	});

	test("works on empty cache", () => {
		/** 對空快取執行清除不拋出異常 / Clearing empty cache doesn't throw */
		expect(() => clearAllSessionModels()).not.toThrow();
	});
});

/**
 * 快取操作測試
 * Cache operations tests
 */
describe("cache operations", () => {
	afterEach(() => {
		clearAllSessionModels();
	});

	test("multiple sessions independent", () => {
		/** 多個會話的快取相互獨立 / Caches of multiple sessions are independent */
		cacheSessionModel("s1", "anthropic", "claude-3-5");
		cacheSessionModel("s2", "openai", "gpt-4");
		cacheSessionModel("s3", "google", "gemini-pro");

		expect(getSessionModel("s1")).toBe("anthropic/claude-3-5");
		expect(getSessionModel("s2")).toBe("openai/gpt-4");
		expect(getSessionModel("s3")).toBe("google/gemini-pro");
	});

	test("clear one preserves others", () => {
		/** 清除一個會話保留其他會話 / Clearing one session preserves others */
		cacheSessionModel("s1", "p1", "m1");
		cacheSessionModel("s2", "p2", "m2");
		clearSessionModel("s1");

		expect(getSessionModel("s1")).toBeUndefined();
		expect(getSessionModel("s2")).toBe("p2/m2");
	});
});
