/**
 * _resolveAutoModelCore 測試資料
 * _resolveAutoModelCore test data
 */

import { AUTO_MODEL } from "../../../src/types/const-default";

/**
 * _resolveAutoModelCore 測試案例
 * _resolveAutoModelCore test case
 */
export interface IResolveAutoModelCoreCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 模型 / Model */
	model: string | undefined;
	/** 父會話模型 / Parent session model */
	parentModel: string | undefined;
	/** 預設模型 / Default model */
	defaultModel: string | undefined;
}

/** _resolveAutoModelCore 測試案例列表 / _resolveAutoModelCore test cases list */
export const resolveAutoModelCoreCases: IResolveAutoModelCoreCase[] =
[
	{ name: "model 有效", model: "gpt-4", parentModel: "parent", defaultModel: "default" },
	{ name: "model AUTO, 有 parent", model: AUTO_MODEL, parentModel: "parent", defaultModel: "default" },
	{ name: "model AUTO, 無 parent 有 default", model: AUTO_MODEL, parentModel: undefined, defaultModel: "default" },
	{ name: "model AUTO, 全無", model: AUTO_MODEL, parentModel: undefined, defaultModel: undefined },
	{ name: "model undefined", model: undefined, parentModel: "parent", defaultModel: "default" },
	{ name: "model 空字串", model: "", parentModel: "parent", defaultModel: "default" },
	{ name: "model 純空白", model: "   ", parentModel: "parent", defaultModel: "default" },
];
