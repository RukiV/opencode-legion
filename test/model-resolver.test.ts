/**
 * 模型解析工具測試
 * Model resolver utility tests
 *
 * 測試所有模型解析相關函數，使用 fixtures 資料驅動 + 快照驗證
 * Tests all model resolution related functions, using fixture-driven + snapshot validation
 *
 * 測試範圍 / Test coverage:
 * - _isAutoModel: AUTO 模型檢測 / AUTO model detection
 * - _isNotEmpty: 非空字串檢測 / Non-empty string detection
 * - _isDefinedAndNotAutoModel: 有效模型檢測 / Valid model detection
 * - _resolveAutoModelBase: AUTO 基礎回退 / AUTO base fallback
 * - _resolveAutoModelCore: AUTO 核心解析 / AUTO core resolution
 * - getEffectiveModelWithFallback: 有效模型解析 / Effective model resolution
 * - parseModelString: 模型字串解析 / Model string parsing
 * - _detectAutoModelBody: AUTO 模型主體檢測 / AUTO model body detection
 * - resolveModelContext: 完整模型上下文解析 / Full model context resolution
 */
/// <reference types="bun" />
/// <reference types="node" />

import { describe, expect, it } from "bun:test";
import { AUTO_MODEL, DEFAULT_MODEL } from "../src/types/const-default";
import { EnumDetectAutoModelBody, EnumShadowSubAgentsName } from "../src/types/enums";
import type { IAllShadowAgentsName } from "../src/types/enums";
import type { IModelBody } from "../src/types/types-opencode";
import {
	_detectAutoModelBody,
	_isAutoModel,
	_isDefinedAndNotAutoModel,
	_resolveAutoModelBase,
	_resolveAutoModelCore,
	getEffectiveModelWithFallback,
	parseModelString,
	resolveModelContext,
} from "../src/utils/model-resolver";
import { _isNotEmpty } from "../src/utils/string/string-utils";
import { autoVariantCases } from "./fixtures/model-resolver/auto-variants";
import { detectAutoBodyCases } from "./fixtures/model-resolver/detect-auto-body";
import { fallbackChainCases } from "./fixtures/model-resolver/fallback-chains";
import { isDefinedAndNotAutoModelCases } from "./fixtures/model-resolver/is-defined-and-not-auto-model";
import { isNotEmptyCases } from "./fixtures/model-resolver/is-not-empty";
import { modelStringCases } from "./fixtures/model-resolver/model-strings";
import { resolveAutoModelBaseCases } from "./fixtures/model-resolver/resolve-auto-model-base";
import { resolveAutoModelCoreCases } from "./fixtures/model-resolver/resolve-auto-model-core";
import { resolveContextCases } from "./fixtures/model-resolver/resolve-context";

// ============================================================
// _isAutoModel
// ============================================================

/**
 * _isAutoModel 函數測試
 * _isAutoModel function tests
 */
describe("_isAutoModel", () =>
{
	for (const { name, input } of autoVariantCases)
	{
		it(name, () =>
		{
			const result = _isAutoModel(input);
			expect({ name, input, result }).toMatchSnapshot();
		});
	}
});

// ============================================================
// _isNotEmpty
// ============================================================

/**
 * _isNotEmpty 函數測試
 * _isNotEmpty function tests
 */
describe("_isNotEmpty", () =>
{
	for (const { name, input } of isNotEmptyCases)
	{
		it(name, () =>
		{
			const result = _isNotEmpty(input);
			expect({ name, input, result }).toMatchSnapshot();
		});
	}
});

// ============================================================
// _isDefinedAndNotAutoModel
// ============================================================

/**
 * _isDefinedAndNotAutoModel 函數測試
 * _isDefinedAndNotAutoModel function tests
 */
describe("_isDefinedAndNotAutoModel", () =>
{
	for (const { name, input } of isDefinedAndNotAutoModelCases)
	{
		it(name, () =>
		{
			const result = _isDefinedAndNotAutoModel(input);
			expect({ name, input, result }).toMatchSnapshot();
		});
	}
});

// ============================================================
// _resolveAutoModelBase
// ============================================================

/**
 * _resolveAutoModelBase 函數測試
 * _resolveAutoModelBase function tests
 */
describe("_resolveAutoModelBase", () =>
{
	for (const { name, parentModel, defaultModel } of resolveAutoModelBaseCases)
	{
		it(name, () =>
		{
			const result = _resolveAutoModelBase(parentModel, defaultModel);
			expect({ name, parentModel, defaultModel, result }).toMatchSnapshot();
		});
	}
});

// ============================================================
// _resolveAutoModelCore
// ============================================================

/**
 * _resolveAutoModelCore 函數測試
 * _resolveAutoModelCore function tests
 */
describe("_resolveAutoModelCore", () =>
{
	for (const { name, model, parentModel, defaultModel } of resolveAutoModelCoreCases)
	{
		it(name, () =>
		{
			const result = _resolveAutoModelCore(model, parentModel, defaultModel);
			expect({ name, model, parentModel, defaultModel, result }).toMatchSnapshot();
		});
	}
});

// ============================================================
// getEffectiveModelWithFallback
// ============================================================

/**
 * getEffectiveModelWithFallback 函數測試
 * getEffectiveModelWithFallback function tests
 */
describe("getEffectiveModelWithFallback", () =>
{
	for (const { name, parentModel, defaultModel, configModel, userModel } of fallbackChainCases)
	{
		it(name, () =>
		{
			const result = getEffectiveModelWithFallback(parentModel, defaultModel, configModel, userModel);
			expect({ name, parentModel, defaultModel, configModel, userModel, result }).toMatchSnapshot();
		});
	}
});

// ============================================================
// parseModelString
// ============================================================

/**
 * parseModelString 函數測試
 * parseModelString function tests
 */
describe("parseModelString", () =>
{
	for (const { name, input, shouldThrow } of modelStringCases)
	{
		it(name, () =>
		{
			if (shouldThrow)
			{
				expect(() => parseModelString(input)).toThrow();
				return;
			}

			const result = parseModelString(input);
			/** 驗證非 void 欄位 / Validate non-void fields */
			expect(typeof result.detectAutoModelBody).toBe('number');
			expect({ name, input, result }).toMatchSnapshot();
		});
	}
});

// ============================================================
// _detectAutoModelBody
// ============================================================

/**
 * _detectAutoModelBody 函數測試
 * _detectAutoModelBody function tests
 */
describe("_detectAutoModelBody", () =>
{
	for (const { name, input } of detectAutoBodyCases)
	{
		it(name, () =>
		{
			const result = _detectAutoModelBody(input);
			/** 驗證非 void 欄位 / Validate non-void fields */
			expect(typeof result.detectAutoModelBody).toBe('number');
			expect({ name, input, result }).toMatchSnapshot();
		});
	}
});

// ============================================================
// resolveModelContext
// ============================================================

/**
 * resolveModelContext 函數測試
 * resolveModelContext function tests
 */
describe("resolveModelContext", () =>
{
	for (const { name, parentModel, shadow, config, userModel } of resolveContextCases)
	{
		it(name, () =>
		{
			const result = resolveModelContext(parentModel, shadow, config, userModel);
			/** 驗證非 void 欄位 / Validate non-void fields */
			expect(typeof result.providerID).toBe('string');
			expect(typeof result.modelID).toBe('string');
			expect({ name, parentModel, shadow, config, userModel, result }).toMatchSnapshot();
		});
	}
});
