/**
 * _isNotEmpty 測試資料
 * _isNotEmpty test data
 */

/**
 * _isNotEmpty 測試案例
 * _isNotEmpty test case
 */
export interface IIsNotEmptyCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 輸入值 / Input value */
	input: string | undefined;
}

/** _isNotEmpty 測試案例列表 / _isNotEmpty test cases list */
export const isNotEmptyCases: IIsNotEmptyCase[] =
	[
		{ name: "正常字串", input: "gpt-4" },
		{ name: "abc", input: "abc" },
		{ name: "含首尾空白", input: "  abc  " },
		{ name: "空字串", input: "" },
		{ name: "純空白", input: "   " },
		{ name: "undefined", input: undefined },
	];
