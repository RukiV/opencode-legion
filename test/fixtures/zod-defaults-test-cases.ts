/**
 * Zod 預設值測試資料集
 * Zod defaults test dataset
 *
 * 定義各種類型的測試用例，用於統一測試 extractDefaultsFromJSONSchema 和 extractDefaultsFromSchema
 * 定義格式：
 * - schema: Zod Schema 物件
 * - expected: 預期提取的默認值
 * - note: 備註（可選）
 */

import { z } from "zod";
import type { ZodTypeAny } from "zod";

/**
 * 測試用例結構
 * Test case structure
 */
export interface ITestCase
{
	/** 測試用例名稱 / Test case name */
	name: string;
	/** Zod Schema 物件 / Zod Schema object */
	schema: ZodTypeAny;
	/** 預期提取的默認值 / Expected default value */
	expected: any;
	/** 備註（可選）/ Note (optional) */
	note?: string;
}

/**
 * 測試群組結構
 * Test group structure
 */
export interface ITestGroup
{
	/** 測試群組名稱 / Test group name */
	name: string;
	/** 測試用例陣列 / Test cases array */
	testCases: ITestCase[];
}

/**
 * 完整測試資料集
 * Complete test dataset
 *
 * 所有測試群組的集合
 */
export const testGroups: ITestGroup[] = [
	{
		name: "基本類型",
		testCases: [
			{
				name: "stringWithDefault",
				schema: z.string().default("hello"),
				expected: "hello",
			},
			{
				name: "numberWithDefault",
				schema: z.number().default(42),
				expected: 42,
			},
			{
				name: "booleanWithDefault",
				schema: z.boolean().default(true),
				expected: true,
			},
			{
				name: "emptyStringDefault",
				schema: z.string().default(""),
				expected: "",
				note: "空字串預設值 / Empty string default",
			},
			{
				name: "zeroDefault",
				schema: z.number().default(0),
				expected: 0,
				note: "零值預設值 / Zero value default",
			},
			{
				name: "falseDefault",
				schema: z.boolean().default(false),
				expected: false,
				note: "false 預設值 / False default",
			},
		],
	},
	{
		name: "可選類型",
		testCases: [
			{
				name: "optionalString",
				schema: z.string().optional(),
				expected: undefined,
				note: "可選字串無預設值 / Optional string without default",
			},
			{
				name: "optionalNumber",
				schema: z.number().optional(),
				expected: undefined,
			},
			{
				name: "optionalBoolean",
				schema: z.boolean().optional(),
				expected: undefined,
			},
		],
	},
	{
		name: "陣列類型",
		testCases: [
			{
				name: "stringArray",
				schema: z.array(z.string()).default(["a", "b"]),
				expected: ["a", "b"],
			},
			{
				name: "emptyArray",
				schema: z.array(z.string()).default([]),
				expected: [],
				note: "空陣列預設值 / Empty array default",
			},
			{
				name: "objectArray",
				schema: z.array(z.object({
					id: z.number(),
					name: z.string(),
				})).default([{ id: 1, name: "default" }]),
				expected: [{ id: 1, name: "default" }],
			},
			{
				name: "nestedArray",
				schema: z.array(z.array(z.string())).default([["a", "b"], ["c", "d"]]),
				expected: [["a", "b"], ["c", "d"]],
				note: "多維陣列預設值 / Nested array with default",
			},
		],
	},
	{
		name: "巢狀物件",
		testCases: [
			{
				name: "simpleNested",
				schema: z.object({
					foo: z.string().default("bar"),
					count: z.number().default(10),
				}),
				expected: { foo: "bar", count: 10 },
			},
			{
				name: "deepNested",
				schema: z.object({
					level1: z.object({
						level2: z.object({
							value: z.string().default("deep"),
						}),
					}),
				}),
				expected: {
					level1: {
						level2: {
							value: "deep",
						},
					},
				},
				note: "深層巢狀物件 / Deeply nested object",
			},
			{
				name: "nestedWithOptional",
				schema: z.object({
					required: z.string().default("required"),
					optional: z.string().optional(),
				}),
				expected: { required: "required" },
				note: "巢狀物件有可選屬性（optional 應被忽略）/ Nested with optional (should be omitted)",
			},
		],
	},
	{
		name: "混合結構",
		testCases: [
			{
				name: "mixedBasicAndNested",
				schema: z.object({
					name: z.string().default("test"),
					tags: z.array(z.string()).default(["tag1"]),
					config: z.object({
						enabled: z.boolean().default(true),
						count: z.number().default(5),
					}),
				}),
				expected: {
					name: "test",
					tags: ["tag1"],
					config: {
						enabled: true,
						count: 5,
					},
				},
			},
			{
				name: "mixedOptionalAndRequired",
				schema: z.object({
					required: z.string().default("value"),
					optional: z.string().optional(),
					withDefault: z.string().default("default"),
				}),
				expected: {
					required: "value",
					withDefault: "default",
				},
				note: "混合可選和必填 / Mixed optional and required",
			},
			{
				name: "mixedArrayAndObject",
				schema: z.object({
					items: z.array(z.string()).default(["item1"]),
					settings: z.object({
						debug: z.boolean().default(false),
					}),
				}),
				expected: {
					items: ["item1"],
					settings: {
						debug: false,
					},
				},
			},
		],
	},
	{
		name: "枚舉類型",
		testCases: [
			{
				name: "enumDefault",
				schema: z.enum(["a", "b", "c"]).default("b"),
				expected: "b",
			},
		],
	},
	{
		name: "nullable 類型",
		testCases: [
			{
				name: "nullableDefault",
				schema: z.string().nullable().default(null),
				expected: null,
			},
			{
				name: "nullishDefault",
				schema: z.string().nullish().default(null),
				expected: null,
			},
		],
	},
];
