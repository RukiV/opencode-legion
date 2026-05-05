/**
 * detectAutoModelBody 測試資料
 * detectAutoModelBody test data
 *
 * 用於測試 _detectAutoModelBody 函數的各種輸入
 * Used to test various inputs of _detectAutoModelBody function
 */

import { EnumDetectAutoModelBody } from "../../../src/types/enums";
import type { IModelBody } from "../../../src/types/types-opencode";

/**
 * detectAutoModelBody 測試案例
 * detectAutoModelBody test case
 */
export interface IDetectAutoBodyCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 輸入模型主體（可為 undefined 或部分欄位）/ Input model body (can be undefined or partial) */
	input: Partial<IModelBody> | undefined;
	/** 預期 detectAutoModelBody / Expected detectAutoModelBody */
	expectedDetectType: EnumDetectAutoModelBody;
	/** 預期 modelBody 部分匹配 / Expected modelBody partial match */
	expectedModelBody?: Partial<IModelBody>;
}

/** detectAutoModelBody 測試案例列表 / detectAutoModelBody test cases list */
export const detectAutoBodyCases: IDetectAutoBodyCase[] =
	[
		// 完整模型
		{
			name: "完整模型",
			input: { providerID: "openai", modelID: "gpt-4o" },
			expectedDetectType: EnumDetectAutoModelBody.Normal,
			expectedModelBody: { providerID: "openai", modelID: "gpt-4o" },
		},

		// 完全 AUTO
		{ name: "undefined 輸入", input: undefined, expectedDetectType: EnumDetectAutoModelBody.Auto },
		{ name: "空物件", input: {}, expectedDetectType: EnumDetectAutoModelBody.Auto },
		{
			name: "兩者都是 AUTO",
			input: { providerID: "AUTO", modelID: "AUTO" },
			expectedDetectType: EnumDetectAutoModelBody.Auto,
		},

		// provider 為 AUTO
		{
			name: "provider=AUTO",
			input: { providerID: "AUTO", modelID: "gpt-4o" },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithModel,
			expectedModelBody: { modelID: "gpt-4o" },
		},
		{
			name: "provider=空字串",
			input: { providerID: "", modelID: "gpt-4o" },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithModel,
			expectedModelBody: { modelID: "gpt-4o" },
		},
		{
			name: "provider=undefined 字串",
			input: { providerID: "undefined", modelID: "gpt-4o" },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithModel,
			expectedModelBody: { modelID: "gpt-4o" },
		},
		{
			name: "provider=null 字串",
			input: { providerID: "null", modelID: "gpt-4o" },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithModel,
			expectedModelBody: { modelID: "gpt-4o" },
		},

		// modelID 為 AUTO
		{
			name: "modelID=AUTO",
			input: { providerID: "openai", modelID: "AUTO" },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithProvider,
			expectedModelBody: { providerID: "openai" },
		},
		{
			name: "modelID=空字串",
			input: { providerID: "openai", modelID: "" },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithProvider,
			expectedModelBody: { providerID: "openai" },
		},
		{
			name: "modelID=undefined 字串",
			input: { providerID: "openai", modelID: "undefined" },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithProvider,
			expectedModelBody: { providerID: "openai" },
		},
		{
			name: "modelID=null 字串",
			input: { providerID: "openai", modelID: "null" },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithProvider,
			expectedModelBody: { providerID: "openai" },
		},
		{
			name: "modelID=.",
			input: { providerID: "openai", modelID: "." },
			expectedDetectType: EnumDetectAutoModelBody.AutoWithProvider,
			expectedModelBody: { providerID: "openai" },
		},
	];
