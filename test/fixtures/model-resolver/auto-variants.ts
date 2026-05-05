/**
 * AUTO 變體測試資料
 * AUTO variant test data
 *
 * 用於測試 _isAutoModel 函數的各種輸入變體
 * Used to test various input variants of _isAutoModel function
 */

/**
 * AUTO 變體測試案例
 * AUTO variant test case
 */
export interface IAutoVariantCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 輸入值 / Input value */
	input: string | undefined;
}

/** AUTO 變體測試案例列表 / AUTO variant test cases list */
export const autoVariantCases: IAutoVariantCase[] =
	[
		{ name: "標準 AUTO", input: "AUTO" },
		{ name: "小寫 auto", input: "auto" },
		{ name: "混合大小寫 Auto", input: "Auto" },
		{ name: "首尾空白", input: " AUTO " },
		{ name: "含換行符", input: "AUTO\n" },
		{ name: "含 Tab", input: "\tAUTO\t" },
		{ name: "undefined", input: undefined },
		{ name: "空字串", input: "" },
		{ name: "純空白", input: "   " },
		{ name: "正常模型", input: "openai/gpt-4o" },
		{ name: "AUTO_MODEL 字串", input: "AUTO_MODEL" },
		{ name: "AUTO-1", input: "AUTO-1" },
	];
