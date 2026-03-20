/**
 * 模型解析工具測試
 * Model resolver utility tests
 *
 * 測試 getEffectiveModel, parseModelString, resolveModelContext 函數的行為
 * Tests for getEffectiveModel, parseModelString, and resolveModelContext functions
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

describe("getEffectiveModel", () => {
	test("當 defaultModel 是 <auto> 且有 parentModel 時，返回 parentModel", () => {
		const result = getEffectiveModel("anthropic/claude-sonnet-4", AUTO_MODEL);
		expect(result).toBe("anthropic/claude-sonnet-4");
	});

	test("當 defaultModel 是 <auto> 且無 parentModel 時，返回 <auto>", () => {
		const result = getEffectiveModel(undefined, AUTO_MODEL);
		expect(result).toBe(AUTO_MODEL);
	});

	test("當 defaultModel 不是 <auto> 時，直接返回 defaultModel", () => {
		const result = getEffectiveModel(
			"anthropic/claude-sonnet-4",
			"openai/gpt-4",
		);
		expect(result).toBe("openai/gpt-4");
	});

	test("當 parentModel 為 undefined 且 defaultModel 不是 <auto> 時，返回 defaultModel", () => {
		const result = getEffectiveModel(undefined, "openai/gpt-4");
		expect(result).toBe("openai/gpt-4");
	});

	test("當兩者都為 undefined 時，返回 undefined", () => {
		const result = getEffectiveModel(undefined, undefined);
		expect(result).toBe(undefined);
	});

	test("當 defaultModel 為空字串時，返回空字串", () => {
		const result = getEffectiveModel("anthropic/claude", "");
		expect(result).toBe("");
	});
});

describe("parseModelString", () => {
	test("正確解析標準格式的模型字串", () => {
		const result = parseModelString("anthropic/claude-sonnet-4");
		expect(result).toEqual({
			providerID: "anthropic",
			modelID: "claude-sonnet-4",
		});
	});

	test("解析包含版本號的模型字串", () => {
		const result = parseModelString("openai/gpt-4-0613");
		expect(result).toEqual({
			providerID: "openai",
			modelID: "gpt-4-0613",
		});
	});

	test("preserves all path segments after provider", () => {
		// Model ID can contain additional slashes (e.g., azure/deployment/model)
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
		const result = parseModelString(AUTO_MODEL);
		expect(result).toBeUndefined();
	});

	test("當模型字串不包含斜線時，返回 undefined", () => {
		const result = parseModelString("claude-sonnet-4");
		expect(result).toBeUndefined();
	});

	test("當模型字串只有斜線前段時，返回 undefined", () => {
		const result = parseModelString("anthropic/");
		expect(result).toBeUndefined();
	});

	test("當模型字串只有斜線後段時，返回 undefined", () => {
		const result = parseModelString("/claude-sonnet-4");
		expect(result).toBeUndefined();
	});

	test("當模型字串為空字串時，返回 undefined", () => {
		const result = parseModelString("");
		expect(result).toBeUndefined();
	});

	test("consecutive slashes return undefined (empty modelID)", () => {
		// "a//b" splits to ["a", "", "b"], modelID becomes "", returns undefined
		const result = parseModelString("anthropic//claude");
		expect(result).toBeUndefined();
	});
});

describe("resolveModelContext", () => {
	// Mock shadow agents for testing (使用類型断言來繞過完整類型檢查)
	// Mock shadow agents for testing (use type assertion to bypass full type checking)
	const mockShadowAgents = {
		[EnumShadowSubAgentsName.Beru]: { name: EnumShadowSubAgentsName.Beru, model: "anthropic/claude-sonnet-4", steps: 1 },
		[EnumShadowSubAgentsName.Igris]: { name: EnumShadowSubAgentsName.Igris, model: "openai/gpt-4", steps: 1 },
		[EnumShadowSubAgentsName.Tank]: { name: EnumShadowSubAgentsName.Tank, model: AUTO_MODEL, steps: 1 },
		[EnumShadowSubAgentsName.Bellion]: { name: EnumShadowSubAgentsName.Bellion, model: undefined as unknown as string, steps: 1 },
		[EnumShadowSubAgentsName.Tusk]: { name: EnumShadowSubAgentsName.Tusk, model: "test/model", steps: 1 },
		[EnumShadowSubAgentsName.ShadowSovereign]: { name: EnumShadowSubAgentsName.ShadowSovereign, model: "test/model", steps: 1 },
	} as IShadowAgents;

	test("返回正確解析的模型上下文", () => {
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
		const result = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Tank,
			mockShadowAgents,
		);
		expect(result).toBeUndefined();
	});

	test("當 Shadow 模型為 undefined 時，返回 undefined", () => {
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Bellion,
			mockShadowAgents,
		);
		expect(result).toBeUndefined();
	});

	test("使用預設 SHADOW_AGENTS 時正常工作", () => {
		// 這個測試驗證與預設 SHADOW_AGENTS 的整合
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
		);
		// beru 預設應該有模型設定
		expect(result).toBeDefined();
		expect(result?.providerID).toBeTruthy();
		expect(result?.modelID).toBeTruthy();
	});

	test("preserves multi-segment model IDs", () => {
		// Model ID can contain additional slashes
		const agents = {
			...mockShadowAgents,
			[EnumShadowSubAgentsName.Igris]: { name: EnumShadowSubAgentsName.Igris, model: "azure/openai/gpt-4", steps: 1 },
		} as IShadowAgents;
		const result = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Igris,
			agents,
		);
		// Model ID preserves all path segments after provider
		expect(result).toEqual({
			providerID: "azure",
			modelID: "openai/gpt-4",
		});
	});
});
