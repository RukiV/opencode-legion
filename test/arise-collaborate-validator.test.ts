/**
 * arise_collaborate 參數驗證測試
 * arise_collaborate parameter validation tests
 *
 * 測試參數驗證策略的正確性
 */

/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import {
	collaborateValidationTestGroups,
	SYSTEM_DEFAULTS,
} from "./fixtures/arise-collaborate-validator-test-cases";
import {
	isValidNumber,
	validateConfigValue,
	getMaxConcurrent,
	getRoundTimeoutMs,
	getTotalRounds,
} from "../src/tools/lib/arise-collaborate-validator";
import type { IAriseConfig } from "../src/config/schema";

describe("arise_collaborate 參數驗證函式", () =>
{
	describe("isValidNumber", () =>
	{
		it("應正確識別合法數值", () =>
		{
			expect(isValidNumber(1)).toBe(true);
			expect(isValidNumber(100)).toBe(true);
			expect(isValidNumber(3600000)).toBe(true);
		});

		it("應正確識別不合法數值", () =>
		{
			expect(isValidNumber(undefined)).toBe(false);
			expect(isValidNumber(0)).toBe(false);
			expect(isValidNumber(-1)).toBe(false);
			expect(isValidNumber(NaN)).toBe(false);
			expect(isValidNumber(Infinity)).toBe(false);
			expect(isValidNumber(3600001)).toBe(false); // > 1 hour
			expect(isValidNumber("1")).toBe(false);
			expect(isValidNumber(null)).toBe(false);
		});
	});

	describe("validateConfigValue", () =>
	{
		it("合法值應直接返回", () =>
		{
			expect(validateConfigValue(100, 8)).toBe(100);
			expect(validateConfigValue(1, 2)).toBe(1);
		});

		it("不合法值應返回系統預設值", () =>
		{
			expect(validateConfigValue(undefined, 8)).toBe(8);
			expect(validateConfigValue(0, 8)).toBe(8);
			expect(validateConfigValue(-1, 8)).toBe(8);
			expect(validateConfigValue(NaN, 8)).toBe(8);
			expect(validateConfigValue(Infinity, 8)).toBe(8);
		});
	});
});

describe("arise_collaborate 參數驗證策略", () =>
{
	for (const group of collaborateValidationTestGroups)
	{
		describe(group.name, () =>
		{
			for (const testCase of group.testCases)
			{
				it(testCase.name, () =>
				{
					let result: number;

					switch (group.type)
					{
						case "max_concurrent":
							result = getMaxConcurrent(testCase.callValue, testCase.config as IAriseConfig);
							break;
						case "round_timeout_ms":
							result = getRoundTimeoutMs(testCase.callValue, testCase.config as IAriseConfig);
							break;
						case "total_rounds":
							result = getTotalRounds(testCase.callValue, testCase.config as IAriseConfig);
							break;
						default:
							throw new Error(`Unknown group type: ${group.type satisfies never}`);
					}

					expect(result).toBe(testCase.expected);
				});
			}
		});
	}
});

describe("系統預設值常數", () =>
{
	it("應匯出正確的系統預設值", () =>
	{
		expect(SYSTEM_DEFAULTS.total_rounds).toBe(8);
		expect(SYSTEM_DEFAULTS.total_rounds_max).toBe(15);
		expect(SYSTEM_DEFAULTS.max_concurrent).toBe(2);
		expect(SYSTEM_DEFAULTS.round_timeout_ms).toBe(180000);
		expect(SYSTEM_DEFAULTS.round_timeout_ms_max).toBe(600000);
	});
});
