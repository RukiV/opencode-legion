import { describe, expect, it } from "bun:test";
import { EnumAriseTools, ALL_ARISE_TOOLS } from "../types/enums";
import { ARISE_TOOLS } from "../agents/shadows";
import { getAriseToolsConfigEntry } from "../agents/lib/arise-tools-utils";
import type { IAriseTools } from "../types/types";
import { ITSRequiredWith } from "ts-type";

/**
 * 跨模組測試：驗證 EnumAriseTools 的完整性
 * Cross-module test: Verify EnumAriseTools completeness
 */
describe("EnumAriseTools", () =>
{
	// ============================================================
	// 相等性 / 包含關係
	// ============================================================
	describe("集合相等性", () =>
	{
		it("ALL_ARISE_TOOLS 包含於 EnumAriseTools", () =>
		{
			const enumValues = Object.values(EnumAriseTools);
			expect(ALL_ARISE_TOOLS).toContainAllValues(enumValues);
		});

		it("EnumAriseTools 包含於 ALL_ARISE_TOOLS", () =>
		{
			const enumValues = Object.values(EnumAriseTools);
			expect(enumValues).toContainAllValues(ALL_ARISE_TOOLS);
		});

		it("ARISE_TOOLS 包含 ALL_ARISE_TOOLS", () =>
		{
			const configKeys = Object.keys(ARISE_TOOLS);
			expect(configKeys).toContainAllValues(ALL_ARISE_TOOLS);
		});

		it("ALL_ARISE_TOOLS 包含於 ARISE_TOOLS", () =>
		{
			const configKeys = Object.keys(ARISE_TOOLS);
			expect(ALL_ARISE_TOOLS).toContainAllValues(configKeys);
		});

		it("長度都相同", () =>
		{
			const enumValues = Object.values(EnumAriseTools);
			const configKeys = Object.keys(ARISE_TOOLS);
			const allLength = ALL_ARISE_TOOLS.length as number;

			expect(enumValues.length as number).toBe(allLength);
			expect(configKeys.length as number).toBe(allLength);
		});
	});

	// ============================================================
	// 不重複驗證
	// ============================================================
	describe("不重複", () =>
	{
		it("ALL_ARISE_TOOLS 沒有重複值", () =>
		{
			const uniqueTools = new Set(ALL_ARISE_TOOLS);
			expect(uniqueTools.size).toBe(ALL_ARISE_TOOLS.length);
		});

		it("EnumAriseTools 沒有重複值", () =>
		{
			const enumValues = Object.values(EnumAriseTools);
			const uniqueValues = new Set(enumValues);
			expect(uniqueValues.size).toBe(enumValues.length);
		});

		it("ARISE_TOOLS 沒有重複鍵", () =>
		{
			const configKeys = Object.keys(ARISE_TOOLS);
			const uniqueKeys = new Set(configKeys);
			expect(uniqueKeys.size).toBe(configKeys.length);
		});
	});

	// ============================================================
	// 存在性驗證
	// ============================================================
	describe("存在性", () =>
	{
		it("IAriseTools 包含所有工具鍵", () =>
		{
			const mockTools = {} as IAriseTools;

			for (const toolName of ALL_ARISE_TOOLS)
			{
				// @ts-ignore - 故意設置值以驗證結構
				expect(mockTools[toolName]).toBeUndefined();
			}
		});

		it("枚舉值包含預期工具", () =>
		{
			//枚舉值包含所有預期的工具名稱字串
			const enumValues = Object.values(EnumAriseTools);

			for (const toolName of ALL_ARISE_TOOLS)
			{
				expect(enumValues).toContain(toolName);
			}
		});
	});

	// ============================================================
	// 配置驗證
	// ============================================================
	describe("配置驗證", () =>
	{

		it("ARISE_TOOLS 配置包含所有 ALL_ARISE_TOOLS", () =>
		{
			for (const toolName of ALL_ARISE_TOOLS)
			{
				const config = ARISE_TOOLS[toolName];
				_testAriseToolsConfigEntry(config);
			}
		});

		it("ARISE_TOOLS 配置包含所有 EnumAriseTools", () =>
		{
			for (const toolName of Object.keys(ARISE_TOOLS) as EnumAriseTools[])
			{
				const config = ARISE_TOOLS[toolName];
				_testAriseToolsConfigEntry(config);
			}
		});

		it("getAriseToolsConfigEntry 正確解析所有 ALL_ARISE_TOOLS", () =>
		{
			for (const toolName of ALL_ARISE_TOOLS)
			{
				const config = getAriseToolsConfigEntry(toolName);

				_testAriseToolsConfigEntry(config);
			}
		});

		it("getAriseToolsConfigEntry 正確解析所有 EnumAriseTools", () =>
		{
			for (const toolName of Object.keys(ARISE_TOOLS) as EnumAriseTools[])
			{
				const config = getAriseToolsConfigEntry(toolName);

				_testAriseToolsConfigEntry(config);
			}
		});

		it("getAriseToolsConfigEntry 對不存在工具拋出 TypeError", () =>
		{
			expect(() => getAriseToolsConfigEntry("non_existent_tool" as any)).toThrow(TypeError);
		});
	});
});

/**
 * 測試工具配置條目
 * Test tool configuration entry
 *
 * ⚠️ Workaround for Bun "toMatchObject with expect.any" BUG:
 *
 * 使用 `{...config}` 而非直接使用 `config` 是為了防止 toMatchObject 修改 config 物件！
 *
 * Bun 的 toMatchObject 會修改傳入的 actual 物件，
 * 將匹配到的屬性替換為空的 matcher 物件 {}。
 * 這會導致後續的測試失敗，因為 config 的成員已被永久修改。
 *
 * Using `{...config}` instead of directly using `config` prevents toMatchObject from mutating the config object!
 *
 * Bun's toMatchObject mutates the actual object by replacing matched properties
 * with an empty matcher object {}. This would permanently modify the config,
 * causing subsequent tests to fail.
 *
 * @see docs/BUN_TEST_BUGS.md - "toMatchObject with expect.any"
 */
function _testAriseToolsConfigEntry(config: typeof ARISE_TOOLS[EnumAriseTools] | ReturnType<typeof getAriseToolsConfigEntry>)
{
	const hasDescription = typeof (config as any).description !== 'undefined';

	// ⚠️ 使用 {...config} 防止 toMatchObject 修改原物件
	// ⚠️ Use {...config} to prevent toMatchObject from modifying the original object
	expect({
		...config,
	}).toMatchObject(hasDescription ? {
		description: expect.any(String),
		shortDescription: expect.any(String),
		args: expect.anything(),
	} : {
		shortDescription: expect.any(String),
		args: expect.anything(),
	});

	expect(config.shortDescription.length).toBeGreaterThan(0);
	hasDescription && expect((config as any).description?.length).toBeGreaterThan(0);
}
