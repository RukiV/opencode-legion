/**
 * 模型解析工具測試
 * Model resolver utility tests
 *
 * 測試 getEffectiveModel、parseModelString、resolveModelContext 函數的行為
 * Tests for getEffectiveModel, parseModelString, and resolveModelContext functions
 *
 * 測試重點：
 * 1. <auto> 模型的特殊處理邏輯
 * 2. 模型字串解析（provider/modelID 格式）
 * 3. 無效輸入的錯誤處理
 * 4. 多段模型 ID 的支援
 *
 * Test focus areas:
 * 1. Special handling logic for <auto> model
 * 2. Model string parsing (provider/modelID format)
 * 3. Error handling for invalid inputs
 * 4. Support for multi-segment model IDs
 */

import { describe, expect, test } from "bun:test";
import { AUTO_MODEL } from "../config/schema";
import {
	getEffectiveModel,
	parseModelString,
	resolveModelContext,
} from "./model-resolver";
import { EnumShadowSubAgentsName } from "../agents/shadow-names";
import type { IShadowAgents } from "../agents/shadows";

/**
 * getEffectiveModel 函數測試
 * getEffectiveModel function tests
 *
 * 測試 <auto> 模型的特殊處理邏輯
 * Tests special handling logic for <auto> model
 */
describe("getEffectiveModel", () => {
	test("當 defaultModel 是 <auto> 且有 parentModel 時，返回 parentModel", () => {
		/** <auto> 模式會使用父模型的模型 / <auto> mode uses parent's model */
		const result = getEffectiveModel("anthropic/claude-sonnet-4", AUTO_MODEL);
		expect(result).toBe("anthropic/claude-sonnet-4");
	});

	test("當 defaultModel 是 <auto> 且無 parentModel 時，返回 <auto>", () => {
		/** 無父模型時，<auto> 無法解析 / <auto> cannot resolve without parent model */
		const result = getEffectiveModel(undefined, AUTO_MODEL);
		expect(result).toBe(AUTO_MODEL);
	});

	test("當 defaultModel 不是 <auto> 時，直接返回 defaultModel", () => {
		/** 非 <auto> 模型直接使用 / Non-<auto> models are used directly */
		const result = getEffectiveModel(
			"anthropic/claude-sonnet-4",
			"openai/gpt-4",
		);
		expect(result).toBe("openai/gpt-4");
	});

	test("當 parentModel 為 undefined 且 defaultModel 不是 <auto> 時，返回 defaultModel", () => {
		/** 即使無父模型，非 <auto> 模型仍直接使用 / Non-<auto> models used directly even without parent */
		const result = getEffectiveModel(undefined, "openai/gpt-4");
		expect(result).toBe("openai/gpt-4");
	});

	test("當兩者都為 undefined 時，返回 undefined", () => {
		/** 兩者都未定義時返回 undefined / Returns undefined when both are undefined */
		const result = getEffectiveModel(undefined, undefined);
		expect(result).toBe(undefined);
	});

	test("當 defaultModel 為空字串時，返回空字串", () => {
		/** 空字串是有效值（不同於 undefined）/ Empty string is a valid value (different from undefined) */
		const result = getEffectiveModel("anthropic/claude", "");
		expect(result).toBe("");
	});
});

/**
 * parseModelString 函數測試
 * parseModelString function tests
 *
 * 測試模型字串解析為 providerID 和 modelID
 * Tests parsing model string into providerID and modelID
 */
describe("parseModelString", () => {
	test("正確解析標準格式的模型字串", () => {
		/** 標準格式：provider/modelID / Standard format: provider/modelID */
		const result = parseModelString("anthropic/claude-sonnet-4");
		expect(result).toEqual({
			providerID: "anthropic",
			modelID: "claude-sonnet-4",
		});
	});

	test("解析包含版本號的模型字串", () => {
		/** 版本號作為 modelID 的一部分 / Version as part of modelID */
		const result = parseModelString("openai/gpt-4-0613");
		expect(result).toEqual({
			providerID: "openai",
			modelID: "gpt-4-0613",
		});
	});

	test("preserves all path segments after provider", () => {
		/** 模型 ID 可以包含額外斜線（如 Azure 部署路徑）/ Model ID can contain additional slashes (e.g., Azure deployment path) */
		const result = parseModelString("azure/gpt-4/deployment-name");
		expect(result).toEqual({
			providerID: "azure",
			modelID: "gpt-4/deployment-name",
		});
	});

	test("當模型字串為 undefined 時，返回 undefined", () => {
		const result = parseModelString(undefined);
		expect(result).toBeUndefined();
	});

	test("當模型字串為 <auto> 時，返回 undefined", () => {
		/** <auto> 是特殊值，需要單獨處理 / <auto> is a special value that needs separate handling */
		const result = parseModelString(AUTO_MODEL);
		expect(result).toBeUndefined();
	});

	test("當模型字串不包含斜線時，返回 undefined", () => {
		/** 缺少斜線無法區分 provider 和 model / Cannot distinguish provider and model without slash */
		const result = parseModelString("claude-sonnet-4");
		expect(result).toBeUndefined();
	});

	test("當模型字串只有斜線前段時，返回 undefined", () => {
		/** modelID 為空 / modelID is empty */
		const result = parseModelString("anthropic/");
		expect(result).toBeUndefined();
	});

	test("當模型字串只有斜線後段時，返回 undefined", () => {
		/** providerID 為空 / providerID is empty */
		const result = parseModelString("/claude-sonnet-4");
		expect(result).toBeUndefined();
	});

	test("當模型字串為空字串時，返回 undefined", () => {
		const result = parseModelString("");
		expect(result).toBeUndefined();
	});

	test("consecutive slashes return undefined (empty modelID)", () => {
		/** 連續斜線導致空段 / Consecutive slashes cause empty segment */
		const result = parseModelString("anthropic//claude");
		expect(result).toBeUndefined();
	});
});

/**
 * resolveModelContext 函數測試
 * resolveModelContext function tests
 *
 * 測試完整的模型解析流程
 * Tests the complete model resolution flow
 */
describe("resolveModelContext", () => {
	/**
	 * Mock shadow agents 用於測試
	 * Mock shadow agents for testing
	 *
	 * 模擬不同類型的 Shadow 代理配置
	 * Simulates different types of Shadow agent configurations
	 */
	const mockShadowAgents = {
		[EnumShadowSubAgentsName.Beru]: { name: EnumShadowSubAgentsName.Beru, model: "anthropic/claude-sonnet-4", steps: 1 },
		[EnumShadowSubAgentsName.Igris]: { name: EnumShadowSubAgentsName.Igris, model: "openai/gpt-4", steps: 1 },
		[EnumShadowSubAgentsName.Tank]: { name: EnumShadowSubAgentsName.Tank, model: AUTO_MODEL, steps: 1 },
		[EnumShadowSubAgentsName.Bellion]: { name: EnumShadowSubAgentsName.Bellion, model: undefined as unknown as string, steps: 1 },
		[EnumShadowSubAgentsName.Tusk]: { name: EnumShadowSubAgentsName.Tusk, model: "test/model", steps: 1 },
		[EnumShadowSubAgentsName.ShadowSovereign]: { name: EnumShadowSubAgentsName.ShadowSovereign, model: "test/model", steps: 1 },
	} as IShadowAgents;

	test("返回正確解析的模型上下文", () => {
		/** 使用 Shadow 預設模型 / Use Shadow's default model */
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
			mockShadowAgents,
		);
		expect(result).toEqual({
			providerID: "anthropic",
			modelID: "claude-sonnet-4",
		});
	});

	test("當 Shadow 模型為 <auto> 時，使用 parentModel", () => {
		/** Tank 使用 <auto>，會沿用父模型 / Tank uses <auto>, will inherit parent model */
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Tank,
			mockShadowAgents,
		);
		expect(result).toEqual({
			providerID: "anthropic",
			modelID: "claude-3",
		});
	});

	test("當 Shadow 模型為 <auto> 且無 parentModel 時，返回 undefined", () => {
		/** <auto> 無法解析時返回 undefined / Returns undefined when <auto> cannot resolve */
		const result = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Tank,
			mockShadowAgents,
		);
		expect(result).toBeUndefined();
	});

	test("當 Shadow 模型為 undefined 時，返回 undefined", () => {
		/** 模型未定義時返回 undefined / Returns undefined when model is undefined */
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Bellion,
			mockShadowAgents,
		);
		expect(result).toBeUndefined();
	});

	test("使用預設 SHADOW_AGENTS 時正常工作", () => {
		/** 驗證與預設 SHADOW_AGENTS 的整合 / Verifies integration with default SHADOW_AGENTS */
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
		);
		/** Beru 預設應該有模型設定 / Beru should have default model setting */
		expect(result).toBeDefined();
		expect(result?.providerID).toBeTruthy();
		expect(result?.modelID).toBeTruthy();
	});

	test("preserves multi-segment model IDs", () => {
		/** 多段模型 ID 的解析 / Parsing multi-segment model IDs */
		const agents = {
			...mockShadowAgents,
			[EnumShadowSubAgentsName.Igris]: { name: EnumShadowSubAgentsName.Igris, model: "azure/openai/gpt-4", steps: 1 },
		} as IShadowAgents;
		const result = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Igris,
			agents,
		);
		/** Model ID 保留 provider 後的所有段 / Model ID preserves all segments after provider */
		expect(result).toEqual({
			providerID: "azure",
			modelID: "openai/gpt-4",
		});
	});
});
