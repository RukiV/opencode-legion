/**
 * Fallback 鏈測試資料
 * Fallback chain test data
 *
 * 用於測試 getEffectiveModelWithFallback 函數的各種輸入組合
 * Used to test various input combinations of getEffectiveModelWithFallback function
 */

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
}

/** Fallback 鏈測試案例列表 / Fallback chain test cases list */
export const fallbackChainCases: IFallbackCase[] =
[
	// userModel 優先
	{ name: "userModel 優先", parentModel: "parent/model", defaultModel: "default/model", configModel: "config/model", userModel: "user/model" },

	// userModel = AUTO
	{ name: "userModel AUTO → parentModel", parentModel: "parent/model", defaultModel: "default/model", configModel: "config/model", userModel: "AUTO" },
	{ name: "userModel AUTO → defaultModel (無 parent)", parentModel: undefined, defaultModel: "default/model", configModel: "config/model", userModel: "AUTO" },
	{ name: "userModel AUTO → DEFAULT_MODEL (全無)", parentModel: undefined, defaultModel: undefined, configModel: undefined, userModel: "AUTO" },

	// configModel 優先
	{ name: "configModel 優先 (無 userModel)", parentModel: "parent/model", defaultModel: "default/model", configModel: "config/model", userModel: undefined },

	// configModel = AUTO
	{ name: "configModel AUTO → parentModel", parentModel: "parent/model", defaultModel: "default/model", configModel: "AUTO", userModel: undefined },
	{ name: "configModel AUTO → defaultModel (無 parent)", parentModel: undefined, defaultModel: "default/model", configModel: "AUTO", userModel: undefined },
	{ name: "configModel AUTO → DEFAULT_MODEL (全無)", parentModel: undefined, defaultModel: undefined, configModel: "AUTO", userModel: undefined },

	// defaultModel 優先
	{ name: "defaultModel 優先 (無 userModel/config)", parentModel: "parent/model", defaultModel: "default/model", configModel: undefined, userModel: undefined },

	// defaultModel = AUTO
	{ name: "defaultModel AUTO → parentModel", parentModel: "parent/model", defaultModel: "AUTO", configModel: undefined, userModel: undefined },
	{ name: "defaultModel AUTO → DEFAULT_MODEL (無 parent)", parentModel: undefined, defaultModel: "AUTO", configModel: undefined, userModel: undefined },

	// 最終 fallback
	{ name: "全部 undefined → DEFAULT_MODEL", parentModel: undefined, defaultModel: undefined, configModel: undefined, userModel: undefined },
];
