/**
 * Zod 預設值提取 - 統一測試
 * Zod defaults extraction - Unified test
 *
 * 使用固定測試資料集測試 extractDefaultsFromJSONSchema 和 extractDefaultsFromSchema
 * Use fixed test dataset to test extractDefaultsFromJSONSchema and extractDefaultsFromSchema
 *
 * 測試資料集定義於 test/fixtures/zod-defaults-test-cases.ts
 * Test dataset defined in test/fixtures/zod-defaults-test-cases.ts
 */

/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { extractDefaultsFromJSONSchema, extractDefaultsFromSchema } from "../../src/config/zod-defaults";
import { testGroups } from "../fixtures/zod-defaults-test-cases";

/**
 * 執行單一測試用例
 * Run single test case
 *
 * @param testCase - 測試用例
 * @param extractFn - 提取默認值的函式
 */
function runTestCase(testCase: { schema: z.ZodTypeAny; expected: any }, extractFn: (schema: z.ZodTypeAny) => any)
{
	const actual = extractFn(testCase.schema);

	if (testCase.expected === undefined)
	{
		/** 如果預期是 undefined，應返回 undefined */
		expect(actual).toBeUndefined();
	}
	else
	{
		expect(actual).toEqual(testCase.expected);
	}
}

/**
 * 自動產生所有測試群組
 * Automatically generate all test groups
 */
for (const group of testGroups)
{
	describe(group.name, () =>
	{
		/** 方法一：從 JSON Schema 提取默認值 */
		describe("extractDefaultsFromJSONSchema", () =>
		{
			for (const testCase of group.testCases)
			{
				it(testCase.name, () =>
				{
					runTestCase(testCase, extractDefaultsFromJSONSchema);
				});
			}
		});

		/** 方法二：從 Zod Schema 直接提取默認值 */
		describe("extractDefaultsFromSchema", () =>
		{
			for (const testCase of group.testCases)
			{
				it(testCase.name, () =>
				{
					runTestCase(testCase, extractDefaultsFromSchema);
				});
			}
		});
	});
}
