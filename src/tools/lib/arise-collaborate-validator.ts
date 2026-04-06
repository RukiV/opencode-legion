/**
 * 參數驗證工具函式
 * Parameter validation utility functions
 *
 * 提供通用的參數驗證功能，主要用於 arise_collaborate 工具
 * Provides common parameter validation functions, mainly for arise_collaborate tool
 */

import type { IAriseConfig } from "../../config/schema";
import {
	DEFAULT_COLLABORATE_TOTAL_ROUNDS,
	MAX_COLLABORATE_TOTAL_ROUNDS,
	DEFAULT_COLLABORATE_MAX_CONCURRENT,
	DEFAULT_COLLABORATE_ROUND_TIMEOUT_MS,
	COLLABORATE_ROUND_TIMEOUT_MS_MAX,
} from "../../types/const-default";

// ==================== 驗證函式 / Validation Functions ====================

/**
 * 驗證數值是否合法
 * Validate if number is valid
 *
 * 不合法條件：<= 0, 非數值, 無限, 大於一小時(3600000ms)
 */
export function isValidNumber(value: unknown): value is number
{
	return typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value) && value > 0 && value <= 3600000;
}

/**
 * 驗證 config 數值，不合法時返回系統預設值
 * Validate config number, returns system default if invalid
 */
export function validateConfigValue(value: unknown, systemDefault: number): number
{
	if (!isValidNumber(value))
	{
		return systemDefault;
	}
	return value;
}

// ==================== 參數策略函式 / Parameter Strategy Functions ====================

/**
 * 取得 max_concurrent 最終值
 * Get final max_concurrent value
 *
 * 策略：
 * - 安全預設值 = min(configValue, systemDefault 2)
 * - 最終呼叫值 = min(callValue, safetyDefault)
 */
export function getMaxConcurrent(callValue: number | undefined, config: IAriseConfig): number
{
	const configValue = validateConfigValue(config.collaborate?.max_concurrent, DEFAULT_COLLABORATE_MAX_CONCURRENT);
	const safetyDefault = Math.min(configValue, DEFAULT_COLLABORATE_MAX_CONCURRENT);

	if (!isValidNumber(callValue))
	{
		return safetyDefault;
	}

	return Math.min(callValue, safetyDefault);
}

/**
 * 取得 round_timeout_ms 最終值
 * Get final round_timeout_ms value
 *
 * 策略：
 * - defaultValue = configValue ?? systemDefault 180000
 * - maxValue = configMaxValue ?? defaultMax 600000
 * - callValue invalid -> defaultValue
 * - callValue > maxValue -> maxValue
 * - otherwise -> callValue
 */
export function getRoundTimeoutMs(callValue: number | undefined, config: IAriseConfig): number
{
	const defaultValue = validateConfigValue(config.collaborate?.round_timeout_ms, DEFAULT_COLLABORATE_ROUND_TIMEOUT_MS);
	const maxValue = validateConfigValue(config.collaborate?.round_timeout_ms_max, COLLABORATE_ROUND_TIMEOUT_MS_MAX);

	if (!isValidNumber(callValue))
	{
		return defaultValue;
	}

	if (callValue > maxValue)
	{
		return maxValue;
	}

	return callValue;
}

/**
 * 取得 total_rounds 最終值
 * Get final total_rounds value
 *
 * 策略：
 * - defaultValue = configValue ?? systemDefault 8
 * - maxValue = configMaxValue ?? defaultMax 15
 * - callValue invalid -> defaultValue
 * - callValue > maxValue -> maxValue
 * - otherwise -> callValue
 */
export function getTotalRounds(callValue: number | undefined, config: IAriseConfig): number
{
	const defaultValue = validateConfigValue(config.collaborate?.total_rounds, DEFAULT_COLLABORATE_TOTAL_ROUNDS);
	const maxValue = validateConfigValue(config.collaborate?.total_rounds_max, MAX_COLLABORATE_TOTAL_ROUNDS);

	if (!isValidNumber(callValue))
	{
		return defaultValue;
	}

	if (callValue > maxValue)
	{
		return maxValue;
	}

	return callValue;
}