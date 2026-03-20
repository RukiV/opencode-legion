/**
 * Model Cache Tests / 模型緩存測試
 *
 * Tests for session model cache functions: cacheSessionModel, getSessionModel,
 * clearSessionModel, clearAllSessionModels
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
	cacheSessionModel,
	getSessionModel,
	clearSessionModel,
	clearAllSessionModels,
} from "./model-cache";

describe("cacheSessionModel", () => {
	test("caches model for session", () => {
		const sessionId = "session-123";
		cacheSessionModel(sessionId, "anthropic", "claude-sonnet-4");

		const result = getSessionModel(sessionId);
		expect(result).toBe("anthropic/claude-sonnet-4");
	});

	test("overwrites existing cache", () => {
		const sessionId = "session-456";
		cacheSessionModel(sessionId, "anthropic", "claude-3");
		cacheSessionModel(sessionId, "openai", "gpt-4");

		const result = getSessionModel(sessionId);
		expect(result).toBe("openai/gpt-4");
	});

	test("handles model ID with slashes", () => {
		const sessionId = "session-789";
		cacheSessionModel(sessionId, "azure", "gpt-4/deployment");

		const result = getSessionModel(sessionId);
		expect(result).toBe("azure/gpt-4/deployment");
	});
});

describe("getSessionModel", () => {
	test("returns undefined for non-existent session", () => {
		const result = getSessionModel("non-existent-session");
		expect(result).toBeUndefined();
	});

	test("returns model string format", () => {
		const sessionId = "session-test";
		cacheSessionModel(sessionId, "provider", "model-id");

		const result = getSessionModel(sessionId);
		expect(result).toMatch(/^[^\/]+\/[^\/]+/);
	});
});

describe("clearSessionModel", () => {
	test("removes cached model", () => {
		const sessionId = "session-to-clear";
		cacheSessionModel(sessionId, "test", "model");
		clearSessionModel(sessionId);

		const result = getSessionModel(sessionId);
		expect(result).toBeUndefined();
	});

	test("does not affect other sessions", () => {
		const session1 = "session-1";
		const session2 = "session-2";
		cacheSessionModel(session1, "provider1", "model1");
		cacheSessionModel(session2, "provider2", "model2");

		clearSessionModel(session1);

		expect(getSessionModel(session1)).toBeUndefined();
		expect(getSessionModel(session2)).toBe("provider2/model2");
	});

	test("does not throw for non-existent session", () => {
		expect(() => clearSessionModel("non-existent")).not.toThrow();
	});
});

describe("clearAllSessionModels", () => {
	beforeEach(() => {
		clearAllSessionModels();
	});

	afterEach(() => {
		clearAllSessionModels();
	});

	test("clears all cached models", () => {
		cacheSessionModel("session-a", "p1", "m1");
		cacheSessionModel("session-b", "p2", "m2");
		cacheSessionModel("session-c", "p3", "m3");

		clearAllSessionModels();

		expect(getSessionModel("session-a")).toBeUndefined();
		expect(getSessionModel("session-b")).toBeUndefined();
		expect(getSessionModel("session-c")).toBeUndefined();
	});

	test("works on empty cache", () => {
		expect(() => clearAllSessionModels()).not.toThrow();
	});
});

describe("cache operations", () => {
	afterEach(() => {
		clearAllSessionModels();
	});

	test("multiple sessions independent", () => {
		cacheSessionModel("s1", "anthropic", "claude-3-5");
		cacheSessionModel("s2", "openai", "gpt-4");
		cacheSessionModel("s3", "google", "gemini-pro");

		expect(getSessionModel("s1")).toBe("anthropic/claude-3-5");
		expect(getSessionModel("s2")).toBe("openai/gpt-4");
		expect(getSessionModel("s3")).toBe("google/gemini-pro");
	});

	test("clear one preserves others", () => {
		cacheSessionModel("s1", "p1", "m1");
		cacheSessionModel("s2", "p2", "m2");
		clearSessionModel("s1");

		expect(getSessionModel("s1")).toBeUndefined();
		expect(getSessionModel("s2")).toBe("p2/m2");
	});
});
