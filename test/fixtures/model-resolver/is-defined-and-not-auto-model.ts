/**
 * _isDefinedAndNotAutoModel 測試資料
 * _isDefinedAndNotAutoModel test data
 */

import { AUTO_MODEL } from "../../../src/types/const-default";

/**
 * _isDefinedAndNotAutoModel 測試案例
 * _isDefinedAndNotAutoModel test case
 */
export interface IIsDefinedAndNotAutoModelCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 輸入值 / Input value */
	input: string | undefined;
}

/** _isDefinedAndNotAutoModel 測試案例列表 / _isDefinedAndNotAutoModel test cases list */
export const isDefinedAndNotAutoModelCases: IIsDefinedAndNotAutoModelCase[] =
	[
		{ name: "gpt-4", input: "gpt-4" },
		{ name: "claude-3", input: "claude-3" },
		{ name: "AUTO", input: AUTO_MODEL },
		{ name: "空字串", input: "" },
		{ name: "純空白", input: "   " },
		{ name: "undefined", input: undefined },
	];
