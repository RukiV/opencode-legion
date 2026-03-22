/**
 * Bun Test 環境變數驗證
 * Bun Test Environment Variables Validation
 *
 * @see docs/BUN_TEST_BUGS.md - Bug 1: `NO_COLOR` 環境變數不影響 snapshot 輸出
 */

import { describe, expect, it } from "bun:test";

/**
 * Bug 1: `NO_COLOR` 環境變數不影響 snapshot 輸出
 * Bug 1: `NO_COLOR` environment variable does not affect snapshot output
 *
 * @see https://github.com/oven-sh/bun/issues/21136
 * @see https://github.com/oven-sh/bun/issues/21393
 * @see https://github.com/oven-sh/bun/issues/20129
 */
describe(".env.test 環境變數驗證 / .env.test Environment Variables", () =>
{
	it("NO_COLOR 環境變數應為 '1' / should be '1'", () =>
	{
		const noColor = process.env.NO_COLOR;
		expect(noColor).toBe("1");
	});

	it("FORCE_COLOR 環境變數應為 '0' / should be '0'", () =>
	{
		const forceColor = process.env.FORCE_COLOR;
		expect(forceColor).toBe("0");
	});

	it("使用 bun --env-file=.env.test 才會載入 / Load with bun --env-file", () =>
	{
		// 使用 bun test 不帶 --env-file 參數時，不會載入 .env.test
		// Using bun test without --env-file won't load .env.test
		expect(true).toBe(true);
	});
});

/**
 * 顏色輸出驗證
 * Color Output Validation
 */
describe("顏色輸出驗證 / Color Output", () =>
{
	it("NO_COLOR=1 表示顏色應被禁用 / should disable color", () =>
	{
		const isColorDisabled = process.env.NO_COLOR === "1";
		expect(isColorDisabled).toBe(true);
	});

	it("ANSI 顏色代碼格式驗證 / ANSI color code format validation", () =>
	{
		// ANSI 顏色代碼格式: \x1b[...m
		const ansiColorRegex = /\x1b\[\d+m/g;
		const testString = "\x1b[31mError\x1b[0m";
		expect(testString).toMatch(/\x1b\[\d+m/);
	});
});
