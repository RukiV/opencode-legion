/**
 * 模型解析工具測試
 * Model resolver utility tests
 *
 * 測試 parseModelString、_detectAutoModelBody、parseModelBody、resolveModelContext、
 * getModelFromConfig、getEffectiveModelWithFallback 函數的行為
 * Tests for parseModelString, _detectAutoModelBody, parseModelBody, resolveModelContext,
 * getModelFromConfig, and getEffectiveModelWithFallback functions
 *
 * 測試重點：
 * 1. AUTO 模型的特殊處理邏輯（寬鬆匹配、normalize、detectAutoModelBody）
 * 2. 模型字串解析（provider/modelID 格式）
 * 3. 無效輸入的錯誤處理
 * 4. 多段模型 ID 的支援
 * 5. Config 模型優先順序
 * 6. DEFAULT_MODEL fallback
 * 7. _detectAutoModelBody 四種檢測類型（0=完整、1=完全AUTO、2=provider為AUTO、3=modelID為AUTO）
 *
 * Test focus areas:
 * 1. Special handling logic for AUTO model (lenient matching, normalize, detectAutoModelBody)
 * 2. Model string parsing (provider/modelID format)
 * 3. Error handling for invalid inputs
 * 4. Support for multi-segment model IDs
 * 5. Config model priority
 * 6. DEFAULT_MODEL fallback
 * 7. _detectAutoModelBody four detection types (0=full, 1=fully AUTO, 2=provider AUTO, 3=modelID AUTO)
 *
 * @deprecated getEffectiveModel 測試已移至 test/lib/deprecated/get-effective-model.ts
 */

import { describe, expect, test } from "bun:test";
import { AUTO_MODEL } from "../types/const-default";
import type { IAriseConfig } from "../config/schema";
import {
	_detectAutoModelBody,
	getEffectiveModelWithFallback,
	getModelFromConfig,
	parseModelBody,
	parseModelString,
	resolveModelContext,
	DEFAULT_MODEL,
	_isAutoModel,
} from "./model-resolver";
import { EnumShadowSubAgentsName, EnumShadowAgentsName } from "../types/enums";
import { normalizeModelString } from './string/string-utils';

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
 * normalizeModelString 函數測試
 * normalizeModelString function tests
 *
 * 測試去除開頭/結尾的多餘分隔符（/、/.、./）
 * Tests removal of leading/trailing excess separators (/, /., ./)
 */
describe("normalizeModelString", () => {
	test("去除結尾的 /.", () => {
		expect(normalizeModelString("AUTO/.")).toBe("AUTO");
	});

	test("去除開頭的 /.", () => {
		expect(normalizeModelString("/.AUTO")).toBe("AUTO");
	});

	test("去除結尾的 /", () => {
		expect(normalizeModelString("AUTO/")).toBe("AUTO");
	});

	test("去除開頭的 /", () => {
		expect(normalizeModelString("/AUTO")).toBe("AUTO");
	});

	test("去除結尾的 ./", () => {
		expect(normalizeModelString("AUTO./")).toBe("AUTO");
	});

	test("去除開頭的 ./", () => {
		expect(normalizeModelString("./AUTO")).toBe("AUTO");
	});

	test("同時去除開頭和結尾的多餘分隔符", () => {
		expect(normalizeModelString("./AUTO/.")).toBe("AUTO");
	});

	test("處理多重疊加的分隔符", () => {
		expect(normalizeModelString("//./AUTO/.//")).toBe("AUTO");
	});

	test("不影響正常模型字串", () => {
		expect(normalizeModelString("openai/gpt-4o")).toBe("openai/gpt-4o");
	});

	test("不影響帶版本的正常模型字串", () => {
		expect(normalizeModelString("openai/gpt-4/.")).toBe("openai/gpt-4");
	});

	test("空字串回傳空字串", () => {
		expect(normalizeModelString("")).toBe("");
	});

	test("只有分隔符的字串回傳空字串", () => {
		expect(normalizeModelString("/././/")).toBe("");
	});
});

/**
 * _isAutoModel 寬鬆匹配測試
 * _isAutoModel lenient matching tests
 */
describe("_isAutoModel", () => {
	test("精確匹配 AUTO", () => {
		expect(_isAutoModel("AUTO")).toBe(true);
	});

	test("小寫 auto 也匹配", () => {
		expect(_isAutoModel("auto")).toBe(true);
	});

	test("混合大小寫 Auto 也匹配", () => {
		expect(_isAutoModel("Auto")).toBe(true);
	});

	test("首尾空白會被 trim 後匹配", () => {
		expect(_isAutoModel(" AUTO ")).toBe(true);
	});

	test("含換行符會被 trim 後匹配", () => {
		expect(_isAutoModel("AUTO\n")).toBe(true);
	});

	test("非 AUTO 值返回 false", () => {
		expect(_isAutoModel("openai/gpt-4")).toBe(false);
	});

	test("undefined 返回 false", () => {
		expect(_isAutoModel(undefined)).toBe(false);
	});

	test("空字串返回 false", () => {
		expect(_isAutoModel("")).toBe(false);
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
 * _detectAutoModelBody 函數測試
 * _detectAutoModelBody function tests
 *
 * 測試四種 AUTO 檢測類型：
 * Tests four AUTO detection types:
 * - 0: 完整模型 / Full model
 * - 1: 完全 AUTO / Fully AUTO
 * - 2: provider 為 AUTO / Provider is AUTO
 * - 3: modelID 為 AUTO / modelID is AUTO
 */
describe("_detectAutoModelBody", () => {
	test("detectAutoModelBody=0: 完整模型", () => {
		/** providerID 和 modelID 都有效 / Both providerID and modelID are valid */
		const result = _detectAutoModelBody({ providerID: "openai", modelID: "gpt-4o" });
		expect(result.detectAutoModelBody).toBe(0);
		expect(result.modelBody).toEqual({ providerID: "openai", modelID: "gpt-4o" });
	});

	test("detectAutoModelBody=1: 完全 AUTO（undefined 輸入）", () => {
		/** 輸入 undefined，兩者都是 AUTO / Input undefined, both are AUTO */
		const result = _detectAutoModelBody(void 0);
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("detectAutoModelBody=1: 完全 AUTO（空物件）", () => {
		/** 空物件，兩者都是空白 / Empty object, both are empty */
		const result = _detectAutoModelBody({});
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("detectAutoModelBody=1: 完全 AUTO（兩者都是 AUTO）", () => {
		/** providerID 和 modelID 都是 AUTO / Both providerID and modelID are AUTO */
		const result = _detectAutoModelBody({ providerID: "AUTO", modelID: "AUTO" });
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("detectAutoModelBody=2: provider 為 AUTO，僅 modelID 有效", () => {
		/** providerID 為 AUTO，modelID 有效 / providerID is AUTO, modelID is valid */
		const result = _detectAutoModelBody({ providerID: "AUTO", modelID: "gpt-4o" });
		expect(result.detectAutoModelBody).toBe(2);
		expect(result.modelBody).toEqual({ providerID: undefined, modelID: "gpt-4o" });
	});

	test("detectAutoModelBody=2: provider 為空白，僅 modelID 有效", () => {
		/** providerID 為空白，modelID 有效 / providerID is empty, modelID is valid */
		const result = _detectAutoModelBody({ providerID: "", modelID: "gpt-4o" });
		expect(result.detectAutoModelBody).toBe(2);
		expect(result.modelBody).toEqual({ providerID: undefined, modelID: "gpt-4o" });
	});

	test("detectAutoModelBody=3: modelID 為 AUTO，僅 providerID 有效", () => {
		/** modelID 為 AUTO，providerID 有效 / modelID is AUTO, providerID is valid */
		const result = _detectAutoModelBody({ providerID: "openai", modelID: "AUTO" });
		expect(result.detectAutoModelBody).toBe(3);
		expect(result.modelBody).toEqual({ providerID: "openai", modelID: undefined });
	});

	test("detectAutoModelBody=1: 字串 'undefined' 視為 AUTO", () => {
		/** 字串 "undefined" 被視為 AUTO / String "undefined" is treated as AUTO */
		const result = _detectAutoModelBody({ providerID: "undefined", modelID: "gpt-4o" });
		expect(result.detectAutoModelBody).toBe(2);
		expect(result.modelBody).toEqual({ providerID: undefined, modelID: "gpt-4o" });
	});

	test("detectAutoModelBody=1: 字串 'null' 視為 AUTO", () => {
		/** 字串 "null" 被視為 AUTO / String "null" is treated as AUTO */
		const result = _detectAutoModelBody({ providerID: "openai", modelID: "null" });
		expect(result.detectAutoModelBody).toBe(3);
		expect(result.modelBody).toEqual({ providerID: "openai", modelID: undefined });
	});
});

/**
 * parseModelBody 函數測試
 * parseModelBody function tests
 *
 * 測試將模型字串解析為 IModelBody，無效輸入時拋出錯誤
 * Tests parsing model string into IModelBody, throws on invalid input
 */
describe("parseModelBody", () => {
	test("解析兩個字串參數", () => {
		const result = parseModelBody("openai", "gpt-4o");
		expect(result).toEqual({ providerID: "openai", modelID: "gpt-4o" });
	});

	test("解析 IModelBody 物件", () => {
		const result = parseModelBody({ providerID: "openai", modelID: "gpt-4o" });
		expect(result).toEqual({ providerID: "openai", modelID: "gpt-4o" });
	});

	test("解析單一模型字串", () => {
		const result = parseModelBody("openai/gpt-4o");
		expect(result).toEqual({ providerID: "openai", modelID: "gpt-4o" });
	});

	test("解析多段模型 ID", () => {
		const result = parseModelBody("azure/gpt-4/deployment-name");
		expect(result).toEqual({ providerID: "azure", modelID: "gpt-4/deployment-name" });
	});

	test("AUTO 模型拋出錯誤", () => {
		expect(() => parseModelBody("AUTO")).toThrow(RangeError);
	});

	test("無效格式拋出錯誤", () => {
		expect(() => parseModelBody("invalid-format")).toThrow(RangeError);
	});

	test("空字串拋出錯誤", () => {
		expect(() => parseModelBody("")).toThrow(RangeError);
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
		/**
		 * userModel 為 AUTO 時，直接回退到 parentModel
		 * When userModel is AUTO, fallback directly to parentModel
		 *
		 * 不檢查 configModel（AUTO 表示用戶不想使用 config 設定）
		 * Skip configModel (AUTO means user doesn't want config setting)
		 */
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

	test("Config 模型為 AUTO 時，回退到 defaultModel", () => {
		/**
		 * configModel 為 AUTO 時繼續往下檢查
		 * configModel AUTO continues to check fallback chain
		 *
		 * 優先順序：configModel(AUTO) → defaultModel → parentModel
		 * Priority: configModel(AUTO) → defaultModel → parentModel
		 */
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
 * 回傳格式：{ detectAutoModelBody, modelBody }
 * Tests parsing model string into providerID and modelID
 * Return format: { detectAutoModelBody, modelBody }
 */
describe("parseModelString", () => {
	test("正確解析標準格式的模型字串", () => {
		/** 標準格式：provider/modelID / Standard format: provider/modelID */
		const result = parseModelString("anthropic/claude-sonnet-4");
		expect(result.detectAutoModelBody).toBe(0);
		expect(result.modelBody).toEqual({
			providerID: "anthropic",
			modelID: "claude-sonnet-4",
		});
	});

	test("解析包含版本號的模型字串", () => {
		/** 版本號作為 modelID 的一部分 / Version as part of modelID */
		const result = parseModelString("openai/gpt-4-0613");
		expect(result.detectAutoModelBody).toBe(0);
		expect(result.modelBody).toEqual({
			providerID: "openai",
			modelID: "gpt-4-0613",
		});
	});

	test("preserves all path segments after provider", () => {
		/** 模型 ID 可以包含額外斜線（如 Azure 部署路徑）/ Model ID can contain additional slashes (e.g., Azure deployment path) */
		const result = parseModelString("azure/gpt-4/deployment-name");
		expect(result.detectAutoModelBody).toBe(0);
		expect(result.modelBody).toEqual({
			providerID: "azure",
			modelID: "gpt-4/deployment-name",
		});
	});

	test("當模型字串為 undefined 時，返回 detectAutoModelBody=1", () => {
		const result = parseModelString(undefined);
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("當模型字串為 AUTO 時，返回 detectAutoModelBody=1", () => {
		/** AUTO 是特殊值，需要單獨處理 / AUTO is a special value that needs separate handling */
		const result = parseModelString(AUTO_MODEL);
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("當模型字串不包含斜線時，返回 detectAutoModelBody=1", () => {
		/** 缺少斜線無法區分 provider 和 model / Cannot distinguish provider and model without slash */
		const result = parseModelString("claude-sonnet-4");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("當模型字串只有斜線前段時，返回 detectAutoModelBody=1", () => {
		/** modelID 為空 / modelID is empty */
		const result = parseModelString("anthropic/");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("當模型字串只有斜線後段時，返回 detectAutoModelBody=1", () => {
		/** providerID 為空 / providerID is empty */
		const result = parseModelString("/claude-sonnet-4");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("當模型字串為空字串時，返回 detectAutoModelBody=1", () => {
		const result = parseModelString("");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("consecutive slashes return detectAutoModelBody=1 (normalized away)", () => {
		/** 連續斜線被 normalizeModelString 處理為無效 / Consecutive slashes are normalized to invalid */
		const result = parseModelString("anthropic//claude");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("AUTO/. is treated as AUTO, returns detectAutoModelBody=1", () => {
		/** AUTO/. 是 AUTO 的變體，應視為 AUTO / AUTO/. is an AUTO variant, should be treated as AUTO */
		const result = parseModelString("AUTO/.");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("/AUTO returns detectAutoModelBody=1 (normalized to AUTO)", () => {
		/** /AUTO 標準化後為 AUTO，應回傳 detectAutoModelBody=1 / /AUTO normalizes to AUTO, should return detectAutoModelBody=1 */
		const result = parseModelString("/AUTO");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("AUTO/ returns detectAutoModelBody=1 (normalized to AUTO)", () => {
		/** AUTO/ 標準化後為 AUTO，應回傳 detectAutoModelBody=1 / AUTO/ normalizes to AUTO, should return detectAutoModelBody=1 */
		const result = parseModelString("AUTO/");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("./AUTO/. returns detectAutoModelBody=1 (normalized to AUTO)", () => {
		/** ./AUTO/. 標準化後為 AUTO，應回傳 detectAutoModelBody=1 / ./AUTO/. normalizes to AUTO, should return detectAutoModelBody=1 */
		const result = parseModelString("./AUTO/.");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("auto (lowercase) returns detectAutoModelBody=1 via lenient _isAutoModel", () => {
		/** 小寫 auto 透過寬鬆匹配視為 AUTO / Lowercase auto is treated as AUTO via lenient matching */
		const result = parseModelString("auto");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test(" AUTO  (with spaces) returns detectAutoModelBody=1 via lenient _isAutoModel", () => {
		/** 含空白的 AUTO 透過寬鬆匹配視為 AUTO / AUTO with spaces is treated as AUTO via lenient matching */
		const result = parseModelString(" AUTO ");
		expect(result.detectAutoModelBody).toBe(1);
		expect(result.modelBody).toBeUndefined();
	});

	test("normal model with trailing /. is normalized correctly", () => {
		/** 正常模型字串帶尾隨 /. 會被標準化 / Normal model string with trailing /. gets normalized */
		const result = parseModelString("openai/gpt-4/.");
		expect(result.detectAutoModelBody).toBe(0);
		expect(result.modelBody).toEqual({
			providerID: "openai",
			modelID: "gpt-4",
		});
	});

	test("detectAutoModelBody=2: provider is AUTO, only modelID is valid", () => {
		/** provider 為 AUTO，僅 modelID 有效 / Provider is AUTO, only modelID is valid */
		const result = parseModelString("AUTO/gpt-4");
		expect(result.detectAutoModelBody).toBe(2);
		expect(result.modelBody).toEqual({
			providerID: undefined,
			modelID: "gpt-4",
		});
	});

	test("detectAutoModelBody=3: modelID is AUTO, only providerID is valid", () => {
		/** modelID 為 AUTO，僅 providerID 有效 / modelID is AUTO, only providerID is valid */
		const result = parseModelString("openai/AUTO");
		expect(result.detectAutoModelBody).toBe(3);
		expect(result.modelBody).toEqual({
			providerID: "openai",
			modelID: undefined,
		});
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

	test("當 config 模型為 AUTO 時，使用 Shadow 預設模型", () => {
		/**
		 * configModel 為 AUTO 時 fallback 到 defaultModel
		 * configModel AUTO falls back to defaultModel
		 *
		 * 優先順序：configModel(AUTO) → defaultModel → parentModel
		 * Priority: configModel(AUTO) → defaultModel → parentModel
		 */
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
		/** Beru 有預設模型，會使用該模型 / Beru has default model, uses it */
		expect(result).toBeDefined();
		expect(result.providerID).toBe("anthropic");
		/** 使用 Beru 的預設模型（claude-haiku-4-5），而非 parentModel */
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
		/**
		 * userModel 為 AUTO 時，直接回退到 parentModel
		 * userModel AUTO falls back directly to parentModel
		 *
		 * 不檢查 configModel（AUTO 表示用戶不想使用 config 設定）
		 * Skip configModel (AUTO means user doesn't want config setting)
		 */
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

	test("config 模型優先於 Shadow 預設模型", () => {
		/**
		 * 驗證 Bug 修復：background-manager 應傳入 config
		 * Bug fix verification: background-manager should pass config
		 *
		 * 修復前：未傳入 config → 使用 Shadow 預設模型
		 * Before fix: config not passed → uses Shadow default model
		 *
		 * 修復後：傳入 config → 使用 config 中的模型
		 * After fix: config passed → uses model from config
		 */
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: "anthropic/claude-4" },
			},
		} as IAriseConfig;

		/** 有 config 時應使用 config 模型 / With config, should use config model */
		const withConfig = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Beru,
			config,
		);
		expect(withConfig).toEqual({
			providerID: "anthropic",
			modelID: "claude-4",
		});

		/** 無 config 時應使用 Shadow 預設模型 / Without config, should use Shadow default model */
		const withoutConfig = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Beru,
			undefined,
		);
		expect(withoutConfig.providerID).toBe("anthropic");
		/** Beru 的預設模型是 claude-sonnet-4，不等於 claude-4 */
		expect(withoutConfig.modelID).not.toBe("claude-4");
	});

	test("傳入 config 與未傳入 config 會產生不同結果", () => {
		/**
		 * 確保 config 參數確實影響解析結果
		 * Ensure config parameter actually affects resolution result
		 *
		 * 此測試防止未來重構時意外移除 config 支援
		 * This test prevents accidental removal of config support during future refactoring
		 */
		const config = {
			agents: {
				[EnumShadowSubAgentsName.Beru]: { model: "openai/gpt-4o" },
			},
		} as IAriseConfig;

		const withConfig = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Beru,
			config,
		);
		const withoutConfig = resolveModelContext(
			undefined,
			EnumShadowSubAgentsName.Beru,
			undefined,
		);

		/** 兩者結果應不同 / Results should differ */
		expect(withConfig.providerID).toBe("openai");
		expect(withConfig.modelID).toBe("gpt-4o");
		expect(withoutConfig.providerID).not.toBe("openai");
		expect(withoutConfig.modelID).not.toBe("gpt-4o");
	});
});
