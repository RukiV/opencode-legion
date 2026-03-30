/**
 * Arise 訊息格式化工具
 * Arise message formatting utilities
 *
 * 提供統一的訊息格式化函數，確保所有 Arise 相關訊息有一致的格式
 * Provides unified message formatting functions to ensure consistent format for all Arise-related messages
 */
import type { ITSValueOrArrayMaybeReadonly } from "ts-type";

/**
 * Arise 訊息前綴常數
 * Arise message prefix constant
 */
// export const ARISE_PREFIX = "[arise]" as const;
export const ARISE_PREFIX = "[opencode-arise]" as const;

/**
 * 底層格式化函數
 * Core format function
 *
 * @param prefix - 前綴（如 "[arise]" 或 "[arise:task-123 retry]"）
 * @param message - 訊息內容
 * @returns 格式化後的訊息
 */
function formatWithPrefix(prefix: string, message: ITSValueOrArrayMaybeReadonly<string>): string
{
	if (Array.isArray(message))
	{
		message = message.join(", ");
	}
	return `${prefix} ${message}`;
}

/**
 * 標準 Arise 訊息格式化
 * Standard Arise message format
 *
 * @param message - 訊息內容
 * @returns "[arise] ${message}"
 */
export function formatAriseMsg(message: ITSValueOrArrayMaybeReadonly<string>): string
{
	return formatWithPrefix(ARISE_PREFIX, message);
}

/**
 * 自訂前綴格式化
 * Custom prefix format
 *
 * @param customPrefix - 自訂前綴（如 "[arise:task-123 retry]"）
 * @param message - 訊息內容
 * @returns "${customPrefix} ${message}"
 */
export function formatAriseMsgCustom(customPrefix: string, message: ITSValueOrArrayMaybeReadonly<string>): string
{
	return formatWithPrefix(customPrefix, message);
}

/**
 * 錯誤訊息
 * Error message
 *
 * @param message - 錯誤訊息內容
 * @returns "[arise] ${message}"
 */
export function formatAriseMsgError(message: ITSValueOrArrayMaybeReadonly<string>): string
{
	return formatAriseMsg(message);
}

/**
 * 成功訊息
 * Success message
 *
 * @param message - 成功訊息內容
 * @returns "[arise] ${message}"
 */
export function formatAriseMsgSuccess(message: ITSValueOrArrayMaybeReadonly<string>): string
{
	return formatAriseMsg(message);
}

/**
 * 資訊訊息
 * Info message
 *
 * @param message - 資訊訊息內容
 * @returns "[arise] ${message}"
 */
export function formatAriseMsgInfo(message: ITSValueOrArrayMaybeReadonly<string>): string
{
	return formatAriseMsg(message);
}

/**
 * Session 標題
 * Session title
 *
 * @param title - 標題內容
 * @returns "[arise] ${title}"
 */
export function formatAriseMsgTitle(title: ITSValueOrArrayMaybeReadonly<string>): string
{
	return formatAriseMsg(title);
}

/**
 * Session 標題（自訂前綴）
 * Session title with custom prefix
 *
 * @param title - 標題內容
 * @param customPrefix - 自訂前綴（如 "arise:task-123 retry" → "[arise:task-123 retry]"）
 * @returns 格式化後的標題
 */
export function formatAriseMsgTitleCustom(title: ITSValueOrArrayMaybeReadonly<string>, customPrefix: string): string
{
	return formatAriseMsgCustom(`[${customPrefix}]`, title);
}

/**
 * 多行訊息格式化
 * Multi-line message format
 *
 * @param lines - 訊息行陣列
 * @returns 格式化後的多行訊息
 */
export function formatAriseMsgMulti(...lines: string[]): string
{
	return formatAriseMsg(lines);
}

/**
 * 成功多行訊息
 * Success multi-line message
 *
 * @param message - 主要訊息
 * @param details - 詳細資訊（可多行）
 * @returns 格式化後的訊息
 */
export function formatAriseMsgSuccessMultiLine(message: string, details: string): string
{
	return formatAriseMsg(`${message}\n\n${details}`);
}

/**
 * 建立帶 ID 的前綴字串（不含方括號，供 formatAriseMsgTitleCustom 使用）
 * Create prefix string with ID (without brackets, for formatAriseMsgTitleCustom)
 *
 * @param id - 識別 ID
 * @param suffix - 可選後綴
 * @returns "arise:${id}" 或 "arise:${id} ${suffix}"
 */
export function formatAriseMsgPrefixId(id: string, suffix?: string): string
{
	return suffix ? `arise:${id} ${suffix}` : `arise:${id}`;
}
