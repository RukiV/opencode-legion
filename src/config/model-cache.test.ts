/**
 * Model Cache Tests
 * 模型緩存測試
 *
 * 測試會話模型快取函數：runtimeCache.cacheSessionModel、runtimeCache.getSessionModel、runtimeCache.clearSessionModel、runtimeCache.clearAllSessionModels
 * Tests for session model cache functions: runtimeCache.cacheSessionModel, runtimeCache.getSessionModel, runtimeCache.clearSessionModel, runtimeCache.clearAllSessionModels
 *
 * 測試重點：
 * 1. 基本的快取讀寫
 * 2. 同一會話的快取覆寫
 * 3. 模型 ID 包含斜線的處理
 * 4. 快取清除的隔離性
 * 5. 多會話的獨立性
 * 6. 歷史記錄功能（不刪除、狀態更新）
 *
 * Test focus areas:
 * 1. Basic cache read/write
 * 2. Cache overwrite for same session
 * 3. Handling model IDs with slashes
 * 4. Isolation of cache clearing
 * 5. Independence of multiple sessions
 * 6. History record functionality (non-deletion, status update)
 *
 * Timer Mocks:
 * - Jest: https://jestjs.io/docs/timer-mocks
 * - Bun: https://bun.com/reference/node/test/default/MockTimers
 */

// @noUnusedParameters:false
/// <reference types="bun" />
import { describe, expect, test, beforeEach, afterEach, setSystemTime } from "bun:test";
import {
	extractProviderModels,
	updateHistoryRecords,
	type IProviderHistory,
	type IProviderHistoryItem,
	EnumProviderHistoryStatus,
} from "./model-cache";
import { IOpenCodeProvider, IOpenCodeProviderCore } from "../types/opencode/types-provider";
import { runtimeCache } from './lib/session-cache';

/** 固定時間戳用於測試 */
const FIXED_TIMESTAMP = 1775233205504;

/**
 * 測試資料工廠
 * Test data factory
 */
function createMockProviders(providers: Array<{ id: string; models: Record<string, { id?: string; name?: string }> }>): IOpenCodeProvider[]
{
	return providers.map((p) => ({
		id: p.id,
		models: Object.fromEntries(
			Object.entries(p.models).map(([key, model]) => [key, { id: model.id ?? key, name: model.name ?? key, providerID: p.id }])
		),
	}));
}

/**
 * runtimeCache.cacheSessionModel 函數測試
 * runtimeCache.cacheSessionModel function tests
 */
describe("runtimeCache.cacheSessionModel", () => {
	test("caches model for session", () => {
		/** 快取並驗證格式為 provider/modelID / Cache and verify format is provider/modelID */
		const sessionId = "session-123";
		runtimeCache.cacheSessionModel(sessionId, "anthropic", "claude-sonnet-4");

		const result = runtimeCache.getSessionModel(sessionId);
		expect(result).toBe("anthropic/claude-sonnet-4");
	});

	test("overwrites existing cache", () => {
		/** 同一會話的後續快取會覆寫前面的值 / Subsequent cache for same session overwrites previous value */
		const sessionId = "session-456";
		runtimeCache.cacheSessionModel(sessionId, "anthropic", "claude-3");
		runtimeCache.cacheSessionModel(sessionId, "openai", "gpt-4");

		const result = runtimeCache.getSessionModel(sessionId);
		expect(result).toBe("openai/gpt-4");
	});

	test("handles model ID with slashes", () => {
		/** 模型 ID 可以包含斜線（如 Azure 部署路徑）/ Model ID can contain slashes (e.g., Azure deployment path) */
		const sessionId = "session-789";
		runtimeCache.cacheSessionModel(sessionId, "azure", "gpt-4/deployment");

		const result = runtimeCache.getSessionModel(sessionId);
		expect(result).toBe("azure/gpt-4/deployment");
	});
});

/**
 * runtimeCache.getSessionModel 函數測試
 * runtimeCache.getSessionModel function tests
 */
describe("runtimeCache.getSessionModel", () => {
	test("returns undefined for non-existent session", () => {
		/** 不存在的會話返回 undefined / Non-existent session returns undefined */
		const result = runtimeCache.getSessionModel("non-existent-session");
		expect(result).toBeUndefined();
	});

	test("returns model string format", () => {
		/** 返回格式為 provider/modelID / Returns format provider/modelID */
		const sessionId = "session-test";
		runtimeCache.cacheSessionModel(sessionId, "provider", "model-id");

		const result = runtimeCache.getSessionModel(sessionId);
		expect(result).toMatch(/^[^\/]+\/[^\/]+/);
	});
});

/**
 * runtimeCache.clearSessionModel 函數測試
 * runtimeCache.clearSessionModel function tests
 */
describe("runtimeCache.clearSessionModel", () => {
	test("removes cached model", () => {
		/** 清除後返回 undefined / Returns undefined after clearing */
		const sessionId = "session-to-clear";
		runtimeCache.cacheSessionModel(sessionId, "test", "model");
		runtimeCache.clearSessionModel(sessionId);

		const result = runtimeCache.getSessionModel(sessionId);
		expect(result).toBeUndefined();
	});

	test("does not affect other sessions", () => {
		/** 清除一個會話不影響其他會話 / Clearing one session doesn't affect others */
		const session1 = "session-1";
		const session2 = "session-2";
		runtimeCache.cacheSessionModel(session1, "provider1", "model1");
		runtimeCache.cacheSessionModel(session2, "provider2", "model2");

		runtimeCache.clearSessionModel(session1);

		expect(runtimeCache.getSessionModel(session1)).toBeUndefined();
		expect(runtimeCache.getSessionModel(session2)).toBe("provider2/model2");
	});

	test("does not throw for non-existent session", () => {
		/** 清除不存在的會話不拋出異常 / Clearing non-existent session doesn't throw */
		expect(() => runtimeCache.clearSessionModel("non-existent")).not.toThrow();
	});
});

/**
 * runtimeCache.clearAllSessionModels 函數測試
 * runtimeCache.clearAllSessionModels function tests
 */
describe("runtimeCache.clearAllSessionModels", () => {
	/** 每個測試前清除所有快取 / Clear all cache before each test */
	beforeEach(() => {
		runtimeCache.clearAllSessionModels();
	});

	/** 每個測試後清除所有快取 / Clear all cache after each test */
	afterEach(() => {
		runtimeCache.clearAllSessionModels();
	});

	test("clears all cached models", () => {
		/** 清除所有快取後，所有會話都返回 undefined / After clearing all cache, all sessions return undefined */
		runtimeCache.cacheSessionModel("session-a", "p1", "m1");
		runtimeCache.cacheSessionModel("session-b", "p2", "m2");
		runtimeCache.cacheSessionModel("session-c", "p3", "m3");

		runtimeCache.clearAllSessionModels();

		expect(runtimeCache.getSessionModel("session-a")).toBeUndefined();
		expect(runtimeCache.getSessionModel("session-b")).toBeUndefined();
		expect(runtimeCache.getSessionModel("session-c")).toBeUndefined();
	});

	test("works on empty cache", () => {
		/** 對空快取執行清除不拋出異常 / Clearing empty cache doesn't throw */
		expect(() => runtimeCache.clearAllSessionModels()).not.toThrow();
	});
});

/**
 * 快取操作測試
 * Cache operations tests
 */
describe("cache operations", () => {
	afterEach(() => {
		runtimeCache.clearAllSessionModels();
	});

	test("multiple sessions independent", () => {
		/** 多個會話的快取相互獨立 / Caches of multiple sessions are independent */
		runtimeCache.cacheSessionModel("s1", "anthropic", "claude-3-5");
		runtimeCache.cacheSessionModel("s2", "openai", "gpt-4");
		runtimeCache.cacheSessionModel("s3", "google", "gemini-pro");

		expect(runtimeCache.getSessionModel("s1")).toBe("anthropic/claude-3-5");
		expect(runtimeCache.getSessionModel("s2")).toBe("openai/gpt-4");
		expect(runtimeCache.getSessionModel("s3")).toBe("google/gemini-pro");
	});

	test("clear one preserves others", () => {
		/** 清除一個會話保留其他會話 / Clearing one session preserves others */
		runtimeCache.cacheSessionModel("s1", "p1", "m1");
		runtimeCache.cacheSessionModel("s2", "p2", "m2");
		runtimeCache.clearSessionModel("s1");

		expect(runtimeCache.getSessionModel("s1")).toBeUndefined();
		expect(runtimeCache.getSessionModel("s2")).toBe("p2/m2");
	});
});

/**
 * 歷史記錄功能測試
 * History record functionality tests
 *
 * 注意：使用 setSystemTime 來固定時間戳，確保 snapshot 穩定
 * Note: Use setSystemTime to fix timestamps for stable snapshots
 */
describe("history records", () => {
	beforeEach(() => {
		/** 固定時間戳為 1775296134613 */
		setSystemTime(1775296134613);
	});

	afterEach(() => {
		/** 恢復真實時間 */
		setSystemTime(undefined);
	});

	describe("extractProviderModels", () => {
		test("extracts all provider-model combinations", () => {
			/** 提取所有廠商與模型的組合 / Extract all provider-model combinations */
			const providers = createMockProviders([
				{
					id: "anthropic",
					models: {
						"claude-3-5": { id: "claude-3-5-sonnet" },
						"claude-4": { id: "claude-4-opus" },
					},
				},
				{
					id: "openai",
					models: {
						"gpt-4": { id: "gpt-4-turbo" },
					},
				},
			]);

			const result = extractProviderModels(providers);

			// 驗證結構：providerId -> IProviderHistoryData -> models -> modelId -> IProviderHistoryItem
			expect(result).toHaveProperty("anthropic");
			expect(result).toHaveProperty("openai");
			expect(Object.keys(result.anthropic.models)).toHaveLength(2);
			expect(Object.keys(result.openai.models)).toHaveLength(1);
			expect(result).toMatchSnapshot();
		});

		test("handles empty models", () => {
			/** 處理空的模型列表 / Handle empty models list */
			const providers = createMockProviders([
				{
					id: "empty-provider",
					models: {},
				},
			]);

			const result = extractProviderModels(providers);

			expect(result).toHaveProperty("empty-provider");
			expect(Object.keys(result["empty-provider"].models)).toHaveLength(0);
			expect(result).toMatchSnapshot();
		});
	});

	describe("updateHistoryRecords", () => {
		test("creates new history from empty", () => {
			/** 從空記錄建立新歷史 / Create new history from empty records */
			const newProviders = createMockProviders([
				{
					id: "anthropic",
					models: { "claude-3-5": {} },
				},
			]);

			const result = updateHistoryRecords(undefined, newProviders);

			expect(result).toHaveProperty("anthropic");
			expect(result.anthropic.models).toHaveProperty("claude-3-5");
			expect(result.anthropic.models["claude-3-5"].status).toBe(EnumProviderHistoryStatus.Active);
			expect(result).toMatchSnapshot();
		});

		test("marks removed models as removed", () => {
			/** 標記被移除的模型為 removed / Mark removed models as removed */
			const oldHistory: IProviderHistory = {
				anthropic: {
					models: {
						"claude-3-5": {
							providerId: "anthropic",
							modelId: "claude-3-5",
							firstSeen: 1000,
							lastSeen: 2000,
							status: EnumProviderHistoryStatus.Active,
						},
					},
				},
				openai: {
					models: {
						"gpt-4": {
							providerId: "openai",
							modelId: "gpt-4",
							firstSeen: 1500,
							lastSeen: 2500,
							status: EnumProviderHistoryStatus.Active,
						},
					},
				},
			};

			// 新資料只保留 anthropic/claude-3-5，移除 openai/gpt-4
			const newProviders = createMockProviders([
				{
					id: "anthropic",
					models: { "claude-3-5": {} },
				},
			]);

			const result = updateHistoryRecords(oldHistory, newProviders);

			// 應該有兩個 provider：anthropic 仍 active，openai 的 gpt-4 變為 removed
			expect(result).toHaveProperty("anthropic");
			expect(result).toHaveProperty("openai");
			expect(result.anthropic.models["claude-3-5"].status).toBe(EnumProviderHistoryStatus.Active);
			expect(result.anthropic.models["claude-3-5"].firstSeen).toBe(1000); // firstSeen 保持不變

			expect(result.openai.models["gpt-4"].status).toBe(EnumProviderHistoryStatus.Removed);
			expect(result.openai.models["gpt-4"].firstSeen).toBe(1500); // firstSeen 保持不變

			expect(result).toMatchSnapshot();
		});

		test("re-activates previously removed model", () => {
			/** 重新激活之前移除的模型 / Re-activate previously removed model */
			const oldHistory: IProviderHistory = {
				anthropic: {
					models: {
						"claude-3-5": {
							providerId: "anthropic",
							modelId: "claude-3-5",
							firstSeen: 1000,
							lastSeen: 2000,
							status: EnumProviderHistoryStatus.Removed, // 之前被移除
						},
					},
				},
			};

			// 新資料重新包含這個模型
			const newProviders = createMockProviders([
				{
					id: "anthropic",
					models: { "claude-3-5": {} },
				},
			]);

			const result = updateHistoryRecords(oldHistory, newProviders);

			expect(result.anthropic.models["claude-3-5"].status).toBe(EnumProviderHistoryStatus.Active);
			expect(result.anthropic.models["claude-3-5"].firstSeen).toBe(1000); // firstSeen 保持不變
			expect(result.anthropic.models["claude-3-5"].lastSeen).toBeGreaterThan(2000); // lastSeen 更新

			expect(result).toMatchSnapshot();
		});

		test("preserves firstSeen across updates", () => {
			/** 跨更新保持 firstSeen 不變 / Preserve firstSeen across updates */
			const oldHistory: IProviderHistory = {
				test: {
					models: {
						"model-a": {
							providerId: "test",
							modelId: "model-a",
							firstSeen: 1000,
							lastSeen: 2000,
							status: EnumProviderHistoryStatus.Active,
						},
					},
				},
			};

			const newProviders = createMockProviders([
				{
					id: "test",
					models: { "model-a": {} },
				},
			]);

			const result = updateHistoryRecords(oldHistory, newProviders);

			expect(result.test.models["model-a"].firstSeen).toBe(1000);
			expect(result.test.models["model-a"].lastSeen).toBeGreaterThan(2000);
			expect(result).toMatchSnapshot();
		});
	});
});
