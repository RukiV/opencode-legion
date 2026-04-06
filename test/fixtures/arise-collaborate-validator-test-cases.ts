/**
 * arise_collaborate 參數驗證測試資料集
 * arise_collaborate parameter validation test dataset
 *
 * 定義參數驗證策略的測試用例
 */

import type { IAriseConfig } from "../../src/config/schema";

/**
 * 測試用例結構
 * Test case structure
 */
export interface ICollaborateValidationTestCase
{
	/** 測試用例名稱 / Test case name */
	name: string;
	/** 呼叫值 / Call value */
	callValue: number | undefined;
	/** Config 物件 / Config object */
	config: IAriseConfig;
	/** 預期最終值 / Expected final value */
	expected: number;
	/** 備註 / Note */
	note?: string;
}

/**
 * 測試群組結構
 * Test group structure
 */
export interface ICollaborateValidationTestGroup
{
	/** 測試群組名稱 / Test group name */
	name: string;
	/** 測試類型 / Test type */
	type: "max_concurrent" | "round_timeout_ms" | "total_rounds";
	/** 測試用例陣列 / Test cases array */
	testCases: ICollaborateValidationTestCase[];
}

/**
 * 系統預設值
 * System default values
 */
const SYSTEM_DEFAULTS = {
	total_rounds: 8,
	total_rounds_max: 15,
	max_concurrent: 2,
	round_timeout_ms: 180000,
	round_timeout_ms_max: 600000,
};

/**
 * 測試資料集
 * Test dataset
 */
export const collaborateValidationTestGroups: ICollaborateValidationTestGroup[] = [
	// ==================== max_concurrent 測試 ====================
	{
		name: "max_concurrent - 呼叫值合法",
		type: "max_concurrent",
		testCases: [
			{
				name: "呼叫值 1，小於安全預設值",
				callValue: 1,
				config: {},
				expected: 1,
			},
			{
				name: "呼叫值 2，等於安全預設值",
				callValue: 2,
				config: {},
				expected: 2,
			},
			{
				name: "呼叫值 3，大於安全預設值，應被限制",
				callValue: 3,
				config: {},
				expected: 2,
			},
		],
	},
	{
		name: "max_concurrent - 呼叫值不合法",
		type: "max_concurrent",
		testCases: [
			{
				name: "呼叫值 undefined，應使用安全預設值",
				callValue: undefined,
				config: {},
				expected: 2,
			},
			{
				name: "呼叫值 0，應使用安全預設值",
				callValue: 0,
				config: {},
				expected: 2,
			},
			{
				name: "呼叫值 -1，應使用安全預設值",
				callValue: -1,
				config: {},
				expected: 2,
			},
			{
				name: "呼叫值 NaN，應使用安全預設值",
				callValue: NaN,
				config: {},
				expected: 2,
			},
			{
				name: "呼叫值 Infinity，應使用安全預設值",
				callValue: Infinity,
				config: {},
				expected: 2,
			},
		],
	},
	{
		name: "max_concurrent - config 值影響",
		type: "max_concurrent",
		testCases: [
			{
				name: "config 值 1，安全預設值為 1",
				callValue: undefined,
				config: { collaborate: { max_concurrent: 1 } },
				expected: 1,
			},
			{
				name: "config 值 3，安全預設值為 min(3,2)=2",
				callValue: undefined,
				config: { collaborate: { max_concurrent: 3 } },
				expected: 2,
			},
			{
				name: "呼叫值 5，config 值 3，安全預設值為 2，最終值 min(5,2)=2",
				callValue: 5,
				config: { collaborate: { max_concurrent: 3 } },
				expected: 2,
			},
		],
	},

	// ==================== round_timeout_ms 測試 ====================
	{
		name: "round_timeout_ms - 呼叫值合法",
		type: "round_timeout_ms",
		testCases: [
			{
				name: "呼叫值 180000，等於預設值",
				callValue: 180000,
				config: {},
				expected: 180000,
			},
			{
				name: "呼叫值 300000，小於最大值",
				callValue: 300000,
				config: {},
				expected: 300000,
			},
			{
				name: "呼叫值 600000，等於最大值",
				callValue: 600000,
				config: {},
				expected: 600000,
			},
		],
	},
	{
		name: "round_timeout_ms - 呼叫值大於最大值",
		type: "round_timeout_ms",
		testCases: [
			{
				name: "呼叫值 900000，大於最大值 600000，應截斷",
				callValue: 900000,
				config: {},
				expected: 600000,
			},
		],
	},
	{
		name: "round_timeout_ms - 呼叫值不合法",
		type: "round_timeout_ms",
		testCases: [
			{
				name: "呼叫值 undefined，應使用預設值 180000",
				callValue: undefined,
				config: {},
				expected: 180000,
			},
			{
				name: "呼叫值 0，應使用預設值",
				callValue: 0,
				config: {},
				expected: 180000,
			},
			{
				name: "呼叫值 -1，應使用預設值",
				callValue: -1,
				config: {},
				expected: 180000,
			},
		],
	},
	{
		name: "round_timeout_ms - config 值影響",
		type: "round_timeout_ms",
		testCases: [
			{
				name: "config 值 120000，呼叫值 undefined，應使用 120000",
				callValue: undefined,
				config: { collaborate: { round_timeout_ms: 120000 } },
				expected: 120000,
			},
			{
				name: "config_max 值 300000，呼叫值 400000，應截斷到 300000",
				callValue: 400000,
				config: { collaborate: { round_timeout_ms_max: 300000 } },
				expected: 300000,
			},
		],
	},

	// ==================== total_rounds 測試 ====================
	{
		name: "total_rounds - 呼叫值合法",
		type: "total_rounds",
		testCases: [
			{
				name: "呼叫值 5，小於最大值",
				callValue: 5,
				config: {},
				expected: 5,
			},
			{
				name: "呼叫值 15，等於最大值",
				callValue: 15,
				config: {},
				expected: 15,
			},
		],
	},
	{
		name: "total_rounds - 呼叫值大於最大值",
		type: "total_rounds",
		testCases: [
			{
				name: "呼叫值 20，大於最大值 15，應截斷",
				callValue: 20,
				config: {},
				expected: 15,
			},
		],
	},
	{
		name: "total_rounds - 呼叫值不合法",
		type: "total_rounds",
		testCases: [
			{
				name: "呼叫值 undefined，應使用預設值 8",
				callValue: undefined,
				config: {},
				expected: 8,
			},
			{
				name: "呼叫值 0，應使用預設值",
				callValue: 0,
				config: {},
				expected: 8,
			},
		],
	},
	{
		name: "total_rounds - config 值影響",
		type: "total_rounds",
		testCases: [
			{
				name: "config 值 10，呼叫值 undefined，應使用 10",
				callValue: undefined,
				config: { collaborate: { total_rounds: 10 } },
				expected: 10,
			},
			{
				name: "config_max 值 20，呼叫值 25，應截斷到 20",
				callValue: 25,
				config: { collaborate: { total_rounds_max: 20 } },
				expected: 20,
			},
		],
	},
];

// 匯出系統預設值供測試使用
export { SYSTEM_DEFAULTS };