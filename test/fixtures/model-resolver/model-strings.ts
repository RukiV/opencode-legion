/**
 * 模型字串測試資料
 * Model string test data
 *
 * 用於測試 parseModelString 函數的各種輸入
 * Used to test various inputs of parseModelString function
 */

/**
 * 模型字串測試案例
 * Model string test case
 */
export interface IModelStringCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 輸入模型字串 / Input model string */
	input: string | undefined;
	/** 是否應拋出錯誤 / Whether should throw error */
	shouldThrow?: boolean;
}

/** 模型字串測試案例列表 / Model string test cases list */
export const modelStringCases: IModelStringCase[] =
[
	// 正常模型
	{ name: "標準格式", input: "openai/gpt-4o" },
	{ name: "含版本號", input: "openai/gpt-4-0613" },
	{ name: "多段 modelID", input: "azure/gpt-4/deployment-name" },

	// 無效輸入
	{ name: "undefined", input: undefined },
	{ name: "空字串", input: "" },
	{ name: "缺少斜線", input: "claude-sonnet-4" },
	{ name: "只有 provider", input: "anthropic/" },
	{ name: "只有 modelID", input: "/claude-sonnet-4" },
	{ name: "連續斜線（拋錯）", input: "anthropic//claude", shouldThrow: true },

	// AUTO 變體
	{ name: "AUTO 標準", input: "AUTO" },
	{ name: "AUTO 小寫", input: "auto" },
	{ name: "AUTO 含空白", input: " AUTO " },
	{ name: "AUTO/.", input: "AUTO/." },
	{ name: "/AUTO", input: "/AUTO" },
	{ name: "./AUTO/.", input: "./AUTO/." },

	// 部分 AUTO
	{ name: "AUTO/gpt-4", input: "AUTO/gpt-4" },
	{ name: "openai/AUTO", input: "openai/AUTO" },

	// 正常模型帶尾隨分隔符
	{ name: "openai/gpt-4/.", input: "openai/gpt-4/." },
];
