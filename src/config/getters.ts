import type { IAllShadowAgentsName } from "../types/enums";
import type { IValueNotPartial } from "../types/types";
import { createDefaultConfig } from "../types/config-defaults";
import { deepMerge3 } from "../utils/config-merge";
import type { IAriseConfig } from "./schema";
import { DEFAULT_POLL_INTERVAL, DEFAULT_RETRY_DELAY_INCREMENT, DEFAULT_RETRY_DELAY_MAX } from "./schema";

/**
 * 配置獲取值型別
 * Config getter value type
 *
 * 邏輯意圖：
 * 1. 支援從 background 全域設定或 agent 特定設定中讀取值
 * 2. 巢狀 IValueNotPartial 確保：
 *    - 外層：最終結果不為 null/undefined
 *    - 內層：OR 運算前的兩個來源都已排除空值
 * 3. 使用 keyof 限制只能存取有效的背景設定鍵
 * 4. 支援深層合併 for 巢狀物件（如 auto_resume）
 *
 * 型別推導過程：
 * - T 限制為 IAriseConfig["background"] 的鍵（不含 undefined）
 * - A 為代理名稱，預設為所有代理
 * - 回傳值 = background[T] | agents[A][T]，兩者皆已排除空值
 */
export type ILazyConfigGetterValue<T extends keyof IValueNotPartial<IAriseConfig["background"]>, A extends IAllShadowAgentsName = IAllShadowAgentsName> = IValueNotPartial<IValueNotPartial<IAriseConfig["background"]>[T] | IValueNotPartial<IAriseConfig["agents"]>[IValueNotPartial<A>][T]>;

/**
 * _createConfigGetter 函式選項
 * Options for _createConfigGetter function
 *
 * @property deepMerge3 - 是否啟用深層合併（預設 false）
 *                       啟用後，巢狀物件會遞迴合併
 *                       For nested objects, will recursively merge
 */
export interface ICreateConfigGetterOptions
{
	/** 是否啟用深層合併 / Enable deep merge */
	enableDeepMerge?: boolean;
}

/**
 * 建立配置 getter 函式的工廠函式
 * Factory function to create config getter functions
 *
 * 用於建立讀取配置屬性的標準化 getter
 * Used to create standardized getters for reading config properties
 *
 * 優先順序：agent 特定設定 -> background 全域設定 -> 預設值
 * Priority: agent-specific setting -> background global setting -> default value
 *
 * 合併行為：
 * - deepMerge3: false（預設）- 簡單覆寫，後面的值直接覆寫前面的
 * - enableDeepMerge: true - 巢狀物件會遞迴合併，非物件值則直接覆寫
 *
 * @param configKey - 配置鍵名稱（snake_case）
 * @param defaultValue - 預設值
 * @param options - 選項物件（可選）
 * @returns 讀取配置的 getter 函式
 */
export function _createConfigGetter<T extends keyof Exclude<IAriseConfig["background"], undefined>>(
	configKey: T,
	defaultValue: ILazyConfigGetterValue<NoInfer<T>, IAllShadowAgentsName>,
	options: ICreateConfigGetterOptions = {}
)
{
	const { enableDeepMerge = false } = options;

	return <A extends IAllShadowAgentsName = IAllShadowAgentsName>(config: IAriseConfig, agentName?: A): ILazyConfigGetterValue<NoInfer<T>, NoInfer<A>> =>
	{
		// 以預設值為基礎
		// Start with default value as base
		let result: any = defaultValue;

		/**
		 * 檢查全域 background 設定
		 * Check for global background setting
		 *
		 * 作為次優先級的全域設定
		 * As secondary priority global setting
		 */
		const backgroundValue = (config.background as any)?.[configKey];
		if (backgroundValue !== undefined)
		{
			// 根據選項決定合併方式
			// Decide merge method based on options
			if (enableDeepMerge)
			{
				result = deepMerge3(result, backgroundValue);
			}
			else
			{
				// 簡單覆寫 / Simple override
				result = backgroundValue;
			}
		}

		/**
		 * 優先檢查 agent 特定的設定
		 * First check for agent-specific setting
		 *
		 * 允許個別代理覆寫全域設定
		 * Allows individual agents to override global settings
		 * 最高優先級 / Highest priority
		 */
		if (agentName)
		{
			const agentValue = (config.agents as any)?.[agentName]?.[configKey];
			if (agentValue !== undefined)
			{
				// 根據選項決定合併方式
				// Decide merge method based on options
				if (enableDeepMerge)
				{
					result = deepMerge3(result, agentValue);
				}
				else
				{
					// 簡單覆寫 / Simple override
					result = agentValue;
				}
			}
		}

		return result;
	};
}

/**
 * 取得輪詢間隔的輔助函式
 * Helper function to get polling interval
 *
 * 優先順序：agent.poll_interval -> background.poll_interval -> 預設值
 * Priority: agent.poll_interval -> background.poll_interval -> default
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 輪詢間隔（毫秒）
 */
export const getPollInterval = _createConfigGetter("poll_interval", DEFAULT_POLL_INTERVAL);

/**
 * 取得重試延遲遞增量的輔助函式
 * Helper function to get retry delay increment
 *
 * 優先順序：agent.retry_delay_increment -> background.retry_delay_increment -> 預設值
 * Priority: agent.retry_delay_increment -> background.retry_delay_increment -> default
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 重試延遲遞增量（毫秒）
 */
export const getRetryDelayIncrement = _createConfigGetter("retry_delay_increment", DEFAULT_RETRY_DELAY_INCREMENT);

/**
 * 取得重試延遲最大值的輔助函式
 * Helper function to get max retry delay
 *
 * 優先順序：agent.retry_delay_max -> background.retry_delay_max -> 預設值
 * Priority: agent.retry_delay_max -> background.retry_delay_max -> default
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 重試延遲最大值（毫秒）
 */
export const getRetryDelayMax = _createConfigGetter("retry_delay_max", DEFAULT_RETRY_DELAY_MAX);

/**
 * 取得 auto_resume 完整設定的輔助函式
 * Helper function to get auto_resume full config
 *
 * 優先順序：agent.auto_resume -> background.auto_resume -> 預設值
 * Priority: agent.auto_resume -> background.auto_resume -> default
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns auto_resume 完整設定物件
 */
export const getAutoResumeConfig = _createConfigGetter("auto_resume", createDefaultConfig().background!.auto_resume!, { enableDeepMerge: true });

/**
 * 取得 auto_resume enabled 設定的輔助函式
 * Helper function to get auto_resume enabled setting
 *
 * 優先順序：agent.auto_resume.enabled -> background.auto_resume.enabled -> 預設值 false
 * Priority: agent.auto_resume.enabled -> background.auto_resume.enabled -> default false
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 是否啟用 auto_resume
 */
export function getAutoResumeEnabled(
	config: IAriseConfig,
	agentName?: IAllShadowAgentsName
): boolean
{
	const autoResume = getAutoResumeConfig(config, agentName);
	return autoResume.enabled;
}
