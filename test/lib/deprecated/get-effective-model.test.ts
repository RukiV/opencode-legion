/**
 * 已棄用的函數
 * Deprecated functions
 *
 * 此模組包含已棄用的函數，僅用於向後相容性
 * This module contains deprecated functions for backward compatibility only
 *
 * @deprecated 請使用 src/utils/model-resolver 中的 getEffectiveModelWithFallback
 */

import { describe, expect, it } from "bun:test";
import { AUTO_MODEL } from "../../../src/types/const-default";

/**
 * @deprecated 請使用 getEffectiveModelWithFallback
 * Determines the effective model based on parent model and default model.
 * 根據父模型和預設模型決定有效模型
 *
 * @param parentModel - The parent session's model / 父會話模型
 * @param defaultModel - The shadow's default model / Shadow 預設模型
 * @param userModel - User-specified model override (takes highest priority) / 用戶指定的模型覆寫（最高優先級）
 * @returns The effective model to use / 要使用的有效模型
 */
export function getEffectiveModel(
  parentModel: string | undefined,
  defaultModel: string | undefined,
  userModel?: string,
): string | undefined
{
  const _isAutoModel = (model?: string): boolean => model === AUTO_MODEL;
  const _isDefinedAndNotAutoModel = (model?: string): boolean => !!model && model.trim().length > 0 && !_isAutoModel(model);

  if (_isDefinedAndNotAutoModel(userModel))
  {
    return userModel;
  }

  if (_isAutoModel(defaultModel))
  {
    return parentModel ?? defaultModel;
  }
  return defaultModel;
}

/**
 * getEffectiveModel 已棄用，僅保留測試以確保向後相容性
 * getEffectiveModel deprecated, tests kept for backward compatibility
 *
 * @deprecated 請使用 getEffectiveModelWithFallback 的測試
 */
describe("getEffectiveModel (deprecated)", () =>
{
	it("當 defaultModel 是 AUTO 且有 parentModel 時，返回 parentModel", () =>
	{
		const result = getEffectiveModel("anthropic/claude-sonnet-4", AUTO_MODEL);
		expect(result).toBe("anthropic/claude-sonnet-4");
	});

	it("當 defaultModel 是 AUTO 且無 parentModel 時，返回 AUTO", () =>
	{
		const result = getEffectiveModel(undefined, AUTO_MODEL);
		expect(result).toBe(AUTO_MODEL);
	});

	it("當 defaultModel 不是 AUTO 時，直接返回 defaultModel", () =>
	{
		const result = getEffectiveModel(
			"anthropic/claude-sonnet-4",
			"openai/gpt-4",
		);
		expect(result).toBe("openai/gpt-4");
	});

	it("當 parentModel 為 undefined 且 defaultModel 不是 AUTO 時，返回 defaultModel", () =>
	{
		const result = getEffectiveModel(undefined, "openai/gpt-4");
		expect(result).toBe("openai/gpt-4");
	});

	it("當所有參數為 undefined 時，返回 undefined", () =>
	{
		const result = getEffectiveModel(undefined, undefined);
		expect(result).toBeUndefined();
	});

	it("當 defaultModel 為空字串時，返回空字串", () =>
	{
		/** 空字串是有效值（不同於 undefined）/ Empty string is a valid value (different from undefined) */
		const result = getEffectiveModel("anthropic/claude", "");
		expect(result).toBe("");
	});
});
