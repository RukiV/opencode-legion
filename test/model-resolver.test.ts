/// <reference types="bun" />
/// <reference types="node" />
import { describe, expect, it } from "bun:test";
import { AUTO_MODEL, DEFAULT_MODEL } from "../src/types/const-default";
import {
	_isAutoModel,
	_isDefinedAndNotAutoModel,
	_resolveAutoModelBase,
	_resolveAutoModelCore,
	getEffectiveModelWithFallback,
} from "../src/utils/model-resolver";
import { _isNotEmpty } from "../src/utils/string/string-utils";

describe("_isAutoModel", () =>
{
	it("should return true for AUTO_MODEL", () =>
	{
		expect(_isAutoModel(AUTO_MODEL)).toBe(true);
	});

	it("should return false for non-AUTO values", () =>
	{
		expect(_isAutoModel("gpt-4")).toBe(false);
		expect(_isAutoModel("")).toBe(false);
	});

	it("should return false for undefined", () =>
	{
		expect(_isAutoModel(undefined)).toBe(false);
	});
});

describe("_isNotEmpty", () =>
{
	it("should return true for non-empty strings", () =>
	{
		expect(_isNotEmpty("gpt-4")).toBe(true);
		expect(_isNotEmpty("abc")).toBe(true);
		expect(_isNotEmpty("  abc  ")).toBe(true);
	});

	it("should return false for empty strings", () =>
	{
		expect(_isNotEmpty("")).toBe(false);
		expect(_isNotEmpty("   ")).toBe(false);
	});

	it("should return false for undefined", () =>
	{
		expect(_isNotEmpty(undefined)).toBe(false);
	});
});

describe("_isDefinedAndNotAutoModel", () =>
{
	it("should return true for valid models", () =>
	{
		expect(_isDefinedAndNotAutoModel("gpt-4")).toBe(true);
		expect(_isDefinedAndNotAutoModel("claude-3")).toBe(true);
	});

	it("should return false for AUTO_MODEL", () =>
	{
		expect(_isDefinedAndNotAutoModel(AUTO_MODEL)).toBe(false);
	});

	it("should return false for empty strings", () =>
	{
		expect(_isDefinedAndNotAutoModel("")).toBe(false);
		expect(_isDefinedAndNotAutoModel("   ")).toBe(false);
	});

	it("should return false for undefined", () =>
	{
		expect(_isDefinedAndNotAutoModel(undefined)).toBe(false);
	});
});

describe("_resolveAutoModelBase", () =>
{
	it("should return parentModel when it is valid", () =>
	{
		expect(_resolveAutoModelBase("parent-model", "default-model")).toBe("parent-model");
	});

	it("should return defaultModel when parentModel is invalid", () =>
	{
		expect(_resolveAutoModelBase(undefined, "default-model")).toBe("default-model");
		expect(_resolveAutoModelBase(AUTO_MODEL, "default-model")).toBe("default-model");
		expect(_resolveAutoModelBase("", "default-model")).toBe("default-model");
	});

	it("should return DEFAULT_MODEL when both are invalid", () =>
	{
		expect(_resolveAutoModelBase(undefined, undefined)).toBe(DEFAULT_MODEL);
		expect(_resolveAutoModelBase(AUTO_MODEL, AUTO_MODEL)).toBe(DEFAULT_MODEL);
		expect(_resolveAutoModelBase("", "")).toBe(DEFAULT_MODEL);
	});
});

describe("_resolveAutoModelCore", () =>
{
	it("should return model when it is valid", () =>
	{
		expect(_resolveAutoModelCore("gpt-4", "parent", "default")).toBe("gpt-4");
	});

	it("should return fallback when model is AUTO_MODEL", () =>
	{
		expect(_resolveAutoModelCore(AUTO_MODEL, "parent", "default")).toBe("parent");
		expect(_resolveAutoModelCore(AUTO_MODEL, undefined, "default")).toBe("default");
		expect(_resolveAutoModelCore(AUTO_MODEL, undefined, undefined)).toBe(DEFAULT_MODEL);
	});

	it("should return undefined for empty values", () =>
	{
		expect(_resolveAutoModelCore(undefined, "parent", "default")).toBeUndefined();
		expect(_resolveAutoModelCore("", "parent", "default")).toBeUndefined();
		expect(_resolveAutoModelCore("   ", "parent", "default")).toBeUndefined();
	});
});

describe("getEffectiveModelWithFallback", () =>
{
	describe("userModel 優先級", () =>
	{
		it("should return userModel when specified", () =>
		{
			expect(getEffectiveModelWithFallback("parent", "default", undefined, "user-model")).toBe("user-model");
		});

		it("should fallback to parentModel when userModel is AUTO_MODEL", () =>
		{
			expect(getEffectiveModelWithFallback("parent", "default", "config", AUTO_MODEL)).toBe("parent");
			expect(getEffectiveModelWithFallback("parent", "default", undefined, AUTO_MODEL)).toBe("parent");
			expect(getEffectiveModelWithFallback(undefined, "default", undefined, AUTO_MODEL)).toBe("default");
			expect(getEffectiveModelWithFallback(undefined, undefined, undefined, AUTO_MODEL)).toBe(DEFAULT_MODEL);
		});

		it("should skip userModel when undefined", () =>
		{
			expect(getEffectiveModelWithFallback("parent", "default", undefined, undefined)).toBe("default");
		});

		it("should return configModel when userModel is undefined/invalid", () =>
		{
			expect(getEffectiveModelWithFallback("parent", "default", "config-model", undefined)).toBe("config-model");
			expect(getEffectiveModelWithFallback("parent", "default", "config-model", "")).toBe("config-model");
		});
	});

	describe("configModel 優先級", () =>
	{
		it("should return configModel when specified", () =>
		{
			expect(getEffectiveModelWithFallback("parent", "default", "config-model", undefined)).toBe("config-model");
		});

		it("should fallback to parentModel when configModel is AUTO_MODEL", () =>
		{
			expect(getEffectiveModelWithFallback("parent", "default", AUTO_MODEL, undefined)).toBe("parent");
			expect(getEffectiveModelWithFallback(undefined, "default", AUTO_MODEL, undefined)).toBe("default");
			expect(getEffectiveModelWithFallback(undefined, undefined, AUTO_MODEL, undefined)).toBe(DEFAULT_MODEL);
		});
	});

	describe("defaultModel 優先級", () =>
	{
		it("should return defaultModel when specified", () =>
		{
			expect(getEffectiveModelWithFallback("parent", "default", undefined, undefined)).toBe("default");
		});

		it("should fallback when defaultModel is AUTO_MODEL", () =>
		{
			expect(getEffectiveModelWithFallback("parent", AUTO_MODEL, undefined, undefined)).toBe("parent");
			expect(getEffectiveModelWithFallback(undefined, AUTO_MODEL, undefined, undefined)).toBe(DEFAULT_MODEL);
		});
	});

	describe("最終 fallback", () =>
	{
		it("should return DEFAULT_MODEL when all are undefined", () =>
		{
			expect(getEffectiveModelWithFallback(undefined, undefined, undefined, undefined)).toBe(DEFAULT_MODEL);
		});
	});
});
