/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { HIGH_LOAD_BONUS_DELAY_MS } from "../../types/const-default";
import { HIGH_LOAD_PATTERN } from "../../types/regexp";
import { isHighLoadError } from "../../utils/string/regexp";
import { shouldMatchGroups, shouldNotMatchGroups } from "../../../test/fixtures/high-load-error-test-cases";

/**
 * 高負載偵測測試
 * High load detection tests
 */
describe("isHighLoadError", () =>
{
	/** ==================== 應匹配的訊息 ==================== */
	/** ==================== Messages that should match ==================== */
	describe("should detect high load messages", () =>
	{
		for (const group of shouldMatchGroups)
		{
			describe(group.name, () =>
			{
				for (const testCase of group.testCases)
				{
					it(testCase.name, () =>
					{
						expect(isHighLoadError(testCase.input)).toBe(testCase.expected);
					});
				}
			});
		}
	});

	/** ==================== 不應匹配的訊息 ==================== */
	/** ==================== Messages that should NOT match ==================== */
	describe("should NOT match non-high-load errors", () =>
	{
		for (const group of shouldNotMatchGroups)
		{
			describe(group.name, () =>
			{
				for (const testCase of group.testCases)
				{
					it(testCase.name, () =>
					{
						expect(isHighLoadError(testCase.input)).toBe(testCase.expected);
					});
				}
			});
		}

		/** null 與 undefined 由 isHighLoadError 內部處理，需獨立測試 */
		/** null and undefined are handled internally by isHighLoadError, tested separately */
		describe("非字串輸入", () =>
		{
			it("does not match null", () =>
			{
				expect(isHighLoadError(null)).toBe(false);
			});

			it("does not match undefined", () =>
			{
				expect(isHighLoadError(undefined)).toBe(false);
			});
		});
	});

	/** ==================== 常數驗證 ==================== */
	/** ==================== Constant verification ==================== */
	describe("constants", () =>
	{
		it("HIGH_LOAD_BONUS_DELAY_MS is 10 seconds", () =>
		{
			expect(HIGH_LOAD_BONUS_DELAY_MS).toBe(10_000);
		});

		it("HIGH_LOAD_PATTERN is a RegExp", () =>
		{
			expect(HIGH_LOAD_PATTERN).toBeInstanceOf(RegExp);
			expect(HIGH_LOAD_PATTERN).toMatchSnapshot();
		});
	});
});
