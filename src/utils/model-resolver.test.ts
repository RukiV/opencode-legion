/**
 * 模型解析工具測試
 * Model resolver utility tests
 *
 * 測試 getEffectiveModel、parseModelString、resolveModelContext、getModelFromConfig 函數的行為
 * Tests for getEffectiveModel, parseModelString, resolveModelContext, and getModelFromConfig functions
 *
 * 測試重點：
 * 1. AUTO 模型的特殊處理邏輯
 * 2. 模型字串解析（provider/modelID 格式）
 * 3. 無效輸入的錯誤處理
 * 4. 多段模型 ID 的支援
 * 5. Config 模型優先順序
 * 6. DEFAULT_MODEL fallback
 *
 * Test focus areas:
 * 1. Special handling logic for AUTO model
 * 2. Model string parsing (provider/modelID format)
 * 3. Error handling for invalid inputs
 * 4. Support for multi-segment model IDs
 * 5. Config model priority
 * 6. DEFAULT_MODEL fallback
 */

import { describe, expect, test } from "bun:test";
import { AUTO_MODEL } from "../types/const-default";
import type { IAriseConfig } from "../config/schema";
import {
	getEffectiveModel,
	getEffectiveModelWithFallback,
	getModelFromConfig,
	parseModelString,
	resolveModelContext,
	DEFAULT_MODEL,
} from "./model-resolver";
import { EnumShadowSubAgentsName, EnumShadowAgentsName } from "../types/enums";

/**
 * DEFAULT_MODEL 常量測試
 * DEFAULT_MODEL constant tests
 */
describe("DEFAULT_MODEL", () => {
	test("應該有預設模型值", () => {
		expect(DEFAULT_MODEL).toBe("opencode/big-pickle");
	});
});

/**
 * getModelFromConfig 函數測試
 * getModelFromConfig function tests
 */
describe("getModelFromConfig", () => {
	test("當 config 為 undefined 時，返回 undefined", () => {
		const result = getModelFromConfig(undefined, EnumShadowSubAgentsName.Beru);
		expect(result).toBeUndefined();
	});

	test("當 config.agents 不存在時，返回 undefined", () => {
		const config = {} as IAriseConfig;
		const result = getModelFromConfig(config, EnumShadowSubAgentsName.Beru);
		expect(result).toBeUndefined();
	});

	test("當指定的代理沒有模型設定時，返回 undefined", () => {
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: "test/model" },
			},
		} as IAriseConfig;
		const result = getModelFromConfig(config, EnumShadowSubAgentsName.Igris);
		expect(result).toBeUndefined();
	});

	test("當指定的代理有模型設定時，返回該模型", () => {
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: "custom/model" },
			},
		} as IAriseConfig;
		const result = getModelFromConfig(config, EnumShadowSubAgentsName.Beru);
		expect(result).toBe("custom/model");
	});
});

/**
 * getEffectiveModel 函數測試
 * getEffectiveModel function tests
 *
 * 測試 AUTO 模型的特殊處理邏輯
 * Tests special handling logic for AUTO model
 */
describe("getEffectiveModel", () => {
	test("當 defaultModel 是 AUTO 且有 parentModel 時，返回 parentModel", () => {
		/** AUTO 模式會使用父模型的模型 / AUTO mode uses parent's model */
		const result = getEffectiveModel("anthropic/claude-sonnet-4", AUTO_MODEL);
		expect(result).toBe("anthropic/claude-sonnet-4");
	});

	test("當 defaultModel 是 AUTO 且無 parentModel 時，返回 AUTO", () => {
		/** 無父模型時，AUTO 無法解析 / AUTO cannot resolve without parent model */
		const result = getEffectiveModel(undefined, AUTO_MODEL);
		expect(result).toBe(AUTO_MODEL);
	});

	test("當 defaultModel 不是 AUTO 時，直接返回 defaultModel", () => {
		/** 非 AUTO 模型直接使用 / Non-AUTO models are used directly */
		const result = getEffectiveModel(
			"anthropic/claude-sonnet-4",
			"openai/gpt-4",
		);
		expect(result).toBe("openai/gpt-4");
	});

	test("當 parentModel 為 undefined 且 defaultModel 不是 AUTO 時，返回 defaultModel", () => {
		/** 即使無父模型，非 AUTO 模型仍直接使用 / Non-AUTO models used directly even without parent */
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
 * getEffectiveModelWithFallback 函數測試
 * getEffectiveModelWithFallback function tests
 *
 * 測試包含 configModel 和 DEFAULT_MODEL fallback 的完整邏輯
 * Tests complete logic with configModel and DEFAULT_MODEL fallback
 */
describe("getEffectiveModelWithFallback", () => {
	test("用戶指定模型優先於其他", () => {
		/** 用戶指定的模型擁有最高優先級 / User-specified model has highest priority */
		const result = getEffectiveModelWithFallback(
			"parent/model",
			"default/model",
			"config/model",
			"user/model",
		);
		expect(result).toBe("user/model");
	});

	test("用戶指定 AUTO 時，回退到 parentModel", () => {
		/** AUTO 會使用 parentModel 回退 / AUTO uses parentModel fallback */
		const result = getEffectiveModelWithFallback(
			"parent/model",
			"default/model",
			"config/model",
			AUTO_MODEL,
		);
		expect(result).toBe("parent/model");
	});

	test("Config 模型次於用戶指定但優先於 Shadow 預設", () => {
		const result = getEffectiveModelWithFallback(
			"parent/model",
			"default/model",
			"config/model",
			undefined,
		);
		expect(result).toBe("config/model");
	});

	test("Config 模型為 AUTO 時使用父模型", () => {
		const result = getEffectiveModelWithFallback(
			"parent/model",
			"default/model",
			AUTO_MODEL,
			undefined,
		);
		expect(result).toBe("parent/model");
	});

	test("當無 Config 模型時，使用 Shadow 預設", () => {
		const result = getEffectiveModelWithFallback(
			"parent/model",
			"default/model",
			undefined,
			undefined,
		);
		expect(result).toBe("default/model");
	});

	test("Shadow 預設為 AUTO 且有父模型時使用父模型", () => {
		const result = getEffectiveModelWithFallback(
			"parent/model",
			AUTO_MODEL,
			undefined,
			undefined,
		);
		expect(result).toBe("parent/model");
	});

	test("無父模型且預設為 AUTO 時，返回 DEFAULT_MODEL", () => {
		/** 當 defaultModel 為 AUTO 且無 parentModel 時，回退到 DEFAULT_MODEL */
		const result = getEffectiveModelWithFallback(
			undefined,
			AUTO_MODEL,
			undefined,
			undefined,
		);
		/** 回退到 DEFAULT_MODEL */
		expect(result).toBe("opencode/big-pickle");
	});

	test("無任何模型時使用 DEFAULT_MODEL", () => {
		const result = getEffectiveModelWithFallback(
			undefined,
			undefined,
			undefined,
			undefined,
		);
		expect(result).toBe(DEFAULT_MODEL);
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

	test("當模型字串為 AUTO 時，返回 undefined", () => {
		/** AUTO 是特殊值，需要單獨處理 / AUTO is a special value that needs separate handling */
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
 * 測試完整的模型解析流程（含 config 支援）
 * Tests the complete model resolution flow (with config support)
 */
describe("resolveModelContext", () => {
	test("返回正確解析的模型上下文", () => {
		/** 使用 Shadow 預設模型 / Use Shadow's default model */
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
		);
		expect(result).toBeDefined();
		expect(result.providerID).toBeTruthy();
		expect(result.modelID).toBeTruthy();
	});

	test("當有 config 模型時，優先使用 config 模型", () => {
		/** Config 模型擁有較高優先級 / Config model has higher priority */
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: "config/model" },
			},
		} as IAriseConfig;
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
			config,
		);
		expect(result).toEqual({
			providerID: "config",
			modelID: "model",
		});
	});

	test("當 config 模型為 AUTO 時，使用父模型", () => {
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: AUTO_MODEL },
			},
		} as IAriseConfig;
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
			config,
		);
		expect(result).toEqual({
			providerID: "anthropic",
			modelID: "claude-3",
		});
	});

	test("當 config 模型為 AUTO 且無父模型時，使用 Shadow 預設模型", () => {
		/** AUTO 遞延到 Shadow 預設模型 / AUTO defers to Shadow default model */
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: AUTO_MODEL },
			},
		} as IAriseConfig;
		const result = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Beru,
			config,
		);
		/** Beru 有預設模型，會使用該模型 / Beru has default model, uses it */
		expect(result).toBeDefined();
		expect(result.providerID).toBe("anthropic");
	});

	test("當呼叫時指定模型時，優先於 config", () => {
		/** 用戶指定的模型擁有最高優先級 / User-specified model has highest priority */
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: "config/model" },
			},
		} as IAriseConfig;
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
			config,
			"user/model",
		);
		expect(result).toEqual({
			providerID: "user",
			modelID: "model",
		});
	});

	test("當呼叫時指定 AUTO 時，回退到 parentModel", () => {
		/** AUTO 會回退到 parentModel / AUTO falls back to parentModel */
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: "config/model" },
			},
		} as IAriseConfig;
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
			config,
			AUTO_MODEL,
		);
		expect(result).toEqual({
			providerID: "anthropic",
			modelID: "claude-3",
		});
	});

	test("當無 config 且呼叫未指定模型時，使用 Shadow 預設", () => {
		const result = resolveModelContext(
			"anthropic/claude-3",
			EnumShadowSubAgentsName.Beru,
			undefined,
			undefined,
		);
		expect(result).toBeDefined();
		/** 應該使用 Shadow 預設模型 / Should use Shadow's default model */
		expect(result.providerID).toBeTruthy();
	});

	test("當無任何模型時，使用 DEFAULT_MODEL", () => {
		/** 沒有任何模型時 fallback 到 DEFAULT_MODEL */
		const result = resolveModelContext(
			undefined,
			'Fake-Shadow' as any,
			undefined,
			undefined,
		);
		/** Tank 沒有預設模型，會使用 DEFAULT_MODEL */
		expect(result).toEqual({
			providerID: "opencode",
			modelID: "big-pickle",
		});
	});

	test("preserves multi-segment model IDs", () => {
		/** 多段模型 ID 的解析 / Parsing multi-segment model IDs */
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: "azure/openai/gpt-4" },
			},
		} as IAriseConfig;
		const result = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Beru,
			config,
		);
		expect(result).toEqual({
			providerID: "azure",
			modelID: "openai/gpt-4",
		});
	});
});
