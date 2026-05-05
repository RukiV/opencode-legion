/**
 * _resolveAutoModelBase 測試資料
 * _resolveAutoModelBase test data
 */

import { AUTO_MODEL, DEFAULT_MODEL } from "../../../src/types/const-default";

/**
 * _resolveAutoModelBase 測試案例
 * _resolveAutoModelBase test case
 */
export interface IResolveAutoModelBaseCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 父會話模型 / Parent session model */
	parentModel: string | undefined;
	/** 預設模型 / Default model */
	defaultModel: string | undefined;
	/** 預期結果 / Expected result */
	expected: string;
}

/** _resolveAutoModelBase 測試案例列表 / _resolveAutoModelBase test cases list */
export const resolveAutoModelBaseCases: IResolveAutoModelBaseCase[] =
	[
		{ name: "parentModel 有效", parentModel: "parent-model", defaultModel: "default-model", expected: "parent-model" },
		{ name: "parentModel undefined", parentModel: undefined, defaultModel: "default-model", expected: "default-model" },
		{ name: "parentModel AUTO", parentModel: AUTO_MODEL, defaultModel: "default-model", expected: "default-model" },
		{ name: "parentModel 空字串", parentModel: "", defaultModel: "default-model", expected: "default-model" },
		{ name: "兩者都 undefined", parentModel: undefined, defaultModel: undefined, expected: DEFAULT_MODEL },
		{ name: "兩者都 AUTO", parentModel: AUTO_MODEL, defaultModel: AUTO_MODEL, expected: DEFAULT_MODEL },
		{ name: "兩者都空字串", parentModel: "", defaultModel: "", expected: DEFAULT_MODEL },
	];
