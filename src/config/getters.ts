/**
 * 配置獲取器 (Getters)
 * Configuration Getters
 *
 * ===========================================
 * 檔案目的 / File Purpose
 * ===========================================
 * 提供標準化的配置讀取介面，統一處理以下邏輯：
 * Provides standardized config reading interface with unified logic:
 *  1. 優先順序繼承 (Priority inheritance)
 *  2. 深層合併支援 (Deep merge support)
 *  3. 型別安全 (Type safety)
 *
 * ===========================================
 * 核心概念 / Core Concepts
 * ===========================================
 * 1. 優先順序 (Priority):
 *    agents[agentName].key → background.key → defaultValue
 *
 * 2. 深層合併 (Deep Merge):
 *    - enableDeepMerge: true → 巢狀物件遞迴合併
 *    - enableDeepMerge: false → 簡單覆寫
 *
 * 3. 預防措施 (Prevention):
 *    若要存取 auto_resume 的巢狀欄位（如 safety_prompt），
 *    必須使用 getAutoResumeConfig(config, agentName) 而非直接存取，
 *    因為 getAutoResumeConfig 使用 enableDeepMerge: true，
 *    可確保巢狀欄位自動繼承相同的合併邏輯。
 *
 *    To access nested auto_resume fields (e.g., safety_prompt),
 *    MUST use getAutoResumeConfig(config, agentName) instead of direct access,
 *    because getAutoResumeConfig uses enableDeepMerge: true,
 *    ensuring nested fields automatically inherit the same merge logic.
 *
 * ===========================================
 * 使用範例 / Usage Examples
 * ===========================================
 * // 基本用法 / Basic usage
 * const pollInterval = getPollInterval(config);
 * const pollIntervalForBeru = getPollInterval(config, "beru");
 *
 * // 巢狀物件用法 / Nested object usage
 * // ✅ 正確 - 使用 getter 函式 / Correct - use getter function
 * const autoResume = getAutoResumeConfig(config, "beru");
 * const safetyPrompt = autoResume.safety_prompt;
 *
 * // ❌ 錯誤 - 直接存取會失去合併邏輯 / Wrong - direct access loses merge logic
 * const safetyPrompt = config.agents?.beru?.auto_resume?.safety_prompt;
 *
 * // ✅ 正確 - 使用專用 getter / Correct - use dedicated getter
 * const safetyPrompt = getAutoResumeSafetyPrompt(config, "beru");
 *
 * ===========================================
 * 新增欄位須知 / Adding New Fields
 * ===========================================
 * 當在 schema.ts 新增 background 的巢狀欄位時（如 auto_resume.safety_prompt）：
 * When adding nested background fields in schema.ts (e.g., auto_resume.safety_prompt):
 *
 * 1. 在 schema.ts 新增欄位定義 / Add field definition in schema.ts
 * 2. 在 types/config-defaults.ts 新增預設值 / Add default value in types/config-defaults.ts
 * 3. 在 getters.ts 建立對應的 getter 函式 / Create corresponding getter function in getters.ts
 *    - 若為簡單欄位：使用 _createConfigGetter("field", default)
 *    - 若為巢狀物件：使用 _createConfigGetter("field", default, { enableDeepMerge: true })
 * 4. 若要存取巢狀物件的子欄位，使用現有的父級 getter（如 getAutoResumeConfig）
 *    - To access nested object child fields, use existing parent getter (e.g., getAutoResumeConfig)
 *    - 範例 / Example: getAutoResumeConfig(config, agentName).safety_prompt
 *
 * @see src/config/schema.ts - 配置欄位定義
 * @see src/types/config-defaults.ts - 預設值定義
 */

import type { IAllShadowAgentsName } from "../types/enums";
import type { IValueNotPartial } from "../types/types";
import { createDefaultConfig } from "../types/config-defaults";
import { deepMerge3 } from "../utils/config/config-merge";
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
 * Priority: agent-specific setting -> background.global setting -> default value
 *
 * 合併行為：
 * - enableDeepMerge: false（預設）- 簡單覆寫，後面的值直接覆寫前面的
 * - enableDeepMerge: true - 巢狀物件會遞迴合併，非物件值則直接覆寫
 *
 * ===========================================
 * 使用範例 / Usage Examples
 * ===========================================
 * // 範例 1：簡單欄位（無深層合併）
 * // Example 1: Simple field (without deep merge)
 * const getPollInterval = _createConfigGetter("poll_interval", DEFAULT_POLL_INTERVAL);
 * const interval = getPollInterval(config);           // 使用 background.poll_interval
 * const beruInterval = getPollInterval(config, "beru"); // 優先使用 agents.beru.poll_interval
 *
 * // 範例 2：巢狀物件（啟用深層合併）
 * // Example 2: Nested object (with deep merge)
 * const getAutoResumeConfig = _createConfigGetter(
 *     "auto_resume",
 *     createDefaultConfig().background!.auto_resume!,
 *     { enableDeepMerge: true }
 * );
 * // 當 agents.beru.auto_resume 只設定 { enabled: true } 時，
 * // background.auto_resume 的其他欄位會被保留（非完全覆寫）
 *
 * // 範例 3：存取巢狀欄位
 * // Example 3: Access nested fields
 * const autoResume = getAutoResumeConfig(config, "beru");
 * const safetyPrompt = autoResume.safety_prompt;
 * // ⚠️ 注意：不要直接存取 config.agents.beru.auto_resume.safety_prompt
 * // 會失去深層合併的邏輯！
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
 * ===========================================
 * 為何使用 enableDeepMerge: true / Why use enableDeepMerge: true
 * ===========================================
 * auto_resume 是巢狀物件，包含 enabled, max_retries, safety_prompt 等子欄位。
 * 若不使用深層合併，當 agent 只想覆寫 enabled 時，會失去其他欄位（如 safety_prompt）。
 * 
 * auto_resume is a nested object containing fields like enabled, max_retries, safety_prompt.
 * Without deep merge, when an agent only wants to override 'enabled', 
 * other fields (like safety_prompt) would be lost.
 *
 * ===========================================
 * 使用範例 / Usage Examples
 * ===========================================
 * // 基本用法 / Basic usage
 * const autoResume = getAutoResumeConfig(config);
 * const autoResumeForBeru = getAutoResumeConfig(config, "beru");
 *
 * // 存取巢狀欄位 / Access nested fields
 * const enabled = autoResume.enabled;
 * const safetyPrompt = autoResume.safety_prompt;
 * const maxRetries = autoResume.max_retries;
 *
 * // ⚠️ 錯誤範例：直接存取會失去深層合併邏輯
 * // ⚠️ Wrong example: direct access loses deep merge logic
 * const wrong = config.agents?.beru?.auto_resume?.safety_prompt;
 * // 當 agents.beru.auto_resume 只有 { enabled: true } 時，
 * // 這種方式會得到 undefined，而非 background.auto_resume.safety_prompt
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns auto_resume 完整設定物件
 */
export const getAutoResumeConfig = _createConfigGetter("auto_resume", createDefaultConfig().background!.auto_resume!, { enableDeepMerge: true });

/**
 * 取得 auto_resume safety_prompt 設定的輔助函式
 * Helper function to get auto_resume safety_prompt setting
 *
 * 優先順序：agent.auto_resume.safety_prompt -> background.auto_resume.safety_prompt
 * Priority: agent.auto_resume.safety_prompt -> background.auto_resume.safety_prompt
 *
 * 設計原理 / Design rationale:
 * 使用 getAutoResumeConfig 而非直接存取 config 物件，因為：
 * - getAutoResumeConfig 支援 enableDeepMerge: true，可自動處理巢狀物件合併
 * - 優先順序：agents[agentName].auto_resume -> background.auto_resume -> 預設值
 * - 這樣可以確保新增的 auto_resume 欄位自動繼承相同的合併邏輯
 *
 * Use getAutoResumeConfig instead of direct config access because:
 * - getAutoResumeConfig supports enableDeepMerge: true, auto-merges nested objects
 * - Priority: agents[agentName].auto_resume -> background.auto_resume -> default
 * - New auto_resume fields will automatically inherit the same merge logic
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns safety_prompt 字串（如果未設定則回傳 undefined）
 */
export function getAutoResumeSafetyPrompt(
	config: IAriseConfig,
	agentName?: IAllShadowAgentsName
): string | undefined
{
	const autoResume = getAutoResumeConfig(config, agentName);
	return autoResume.safety_prompt;
}

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
