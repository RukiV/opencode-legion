/**
 * Fallback 鏈測試資料
 * Fallback chain test data
 *
 * 用於測試 getEffectiveModelWithFallback 函數的各種輸入組合
 * Used to test various input combinations of getEffectiveModelWithFallback function
 */

import { DEFAULT_MODEL } from "../../../src/types/const-default";

/**
 * Fallback 鏈測試案例
 * Fallback chain test case
 */
export interface IFallbackCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 父會話模型 / Parent session model */
	parentModel: string | undefined;
	/** 預設模型 / Default model */
	defaultModel: string | undefined;
	/** Config 模型 / Config model */
	configModel: string | undefined;
	/** 用戶指定模型 / User-specified model */
	userModel: string | undefined;
	/** 預期結果 / Expected result */
	expected: string;
}

/** Fallback 鏈測試案例列表 / Fallback chain test cases list */
export const fallbackChainCases: IFallbackCase[] =
[
	// userModel 優先
	{ name: "userModel 優先", parentModel: "parent/model", defaultModel: "default/model", configModel: "config/model", userModel: "user/model", expected: "user/model" },

	// userModel = AUTO
	{ name: "userModel AUTO → parentModel", parentModel: "parent/model", defaultModel: "default/model", configModel: "config/model", userModel: "AUTO", expected: "parent/model" },
	{ name: "userModel AUTO → defaultModel (無 parent)", parentModel: undefined, defaultModel: "default/model", configModel: "config/model", userModel: "AUTO", expected: "default/model" },
	{ name: "userModel AUTO → DEFAULT_MODEL (全無)", parentModel: undefined, defaultModel: undefined, configModel: undefined, userModel: "AUTO", expected: DEFAULT_MODEL },

	// configModel 優先
	{ name: "configModel 優先 (無 userModel)", parentModel: "parent/model", defaultModel: "default/model", configModel: "config/model", userModel: undefined, expected: "config/model" },

	// configModel = AUTO
	{ name: "configModel AUTO → parentModel", parentModel: "parent/model", defaultModel: "default/model", configModel: "AUTO", userModel: undefined, expected: "parent/model" },
	{ name: "configModel AUTO → defaultModel (無 parent)", parentModel: undefined, defaultModel: "default/model", configModel: "AUTO", userModel: undefined, expected: "default/model" },
	{ name: "configModel AUTO → DEFAULT_MODEL (全無)", parentModel: undefined, defaultModel: undefined, configModel: "AUTO", userModel: undefined, expected: DEFAULT_MODEL },

	// defaultModel 優先
	{ name: "defaultModel 優先 (無 userModel/config)", parentModel: "parent/model", defaultModel: "default/model", configModel: undefined, userModel: undefined, expected: "default/model" },

	// defaultModel = AUTO
	{ name: "defaultModel AUTO → parentModel", parentModel: "parent/model", defaultModel: "AUTO", configModel: undefined, userModel: undefined, expected: "parent/model" },
	{ name: "defaultModel AUTO → DEFAULT_MODEL (無 parent)", parentModel: undefined, defaultModel: "AUTO", configModel: undefined, userModel: undefined, expected: DEFAULT_MODEL },

	// 最終 fallback
	{ name: "全部 undefined → DEFAULT_MODEL", parentModel: undefined, defaultModel: undefined, configModel: undefined, userModel: undefined, expected: DEFAULT_MODEL },
];
