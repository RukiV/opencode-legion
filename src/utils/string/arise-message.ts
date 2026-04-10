/**
 * Arise 訊息格式化工具
 * Arise message formatting utilities
 *
 * 提供統一的訊息格式化函數，確保所有 Arise 相關訊息有一致的格式
 * Provides unified message formatting functions to ensure consistent format for all Arise-related messages
 */
import type { ITSTypeAndStringLiteral, ITSValueOrArrayMaybeReadonly } from "ts-type";
import { ARISE_PREFIX } from "../../types/const-default";
import { EnumLogLevel } from "../../types/enum-opencode";
import { EnumOpenCodeMessageTag } from "../../types/opencode/enum-message";

type IAllowedMessageInput = ITSValueOrArrayMaybeReadonly<string | undefined>;

/**
 * 底層格式化函數
 * Core format function
 *
 * @param prefix - 前綴（如 "[arise]" 或 "[arise:task-123 retry]"）
 * @param message - 訊息內容
 * @returns 格式化後的訊息
 */
function formatWithPrefix(prefix: string, message: IAllowedMessageInput): string
{
	if (Array.isArray(message))
	{
		message = message
			.filter(v => typeof v !== 'undefined')
			.join(', ')
		;
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
export function formatAriseMsg(message: IAllowedMessageInput): string
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
export function formatAriseMsgCustom(customPrefix: string, message: IAllowedMessageInput): string
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
export function formatAriseMsgError(message: IAllowedMessageInput): string
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
export function formatAriseMsgSuccess(message: IAllowedMessageInput): string
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
export function formatAriseMsgInfo(message: IAllowedMessageInput): string
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
export function formatAriseMsgTitle(title: IAllowedMessageInput): string
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
export function formatAriseMsgTitleCustom(title: IAllowedMessageInput, customPrefix: string): string
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
export function formatAriseMsgMulti(...lines: Extract<IAllowedMessageInput, any[]>): string
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

/**
 * Session 標題格式化
 * Session title format
 *
 * @param taskId - 任務 ID
 * @param description - 任務描述
 * @param retrySuffix - 可選重試後綴（如 "retry 3"）
 * @returns 格式化後的標題 "[arise:${taskId}${retrySuffix}] ${description}"
 */
export function formatAriseMsgSessionTitle(taskId: string, description: string, retrySuffix?: string): string
{
	const prefix = formatAriseMsgPrefixId(taskId, retrySuffix);
	return formatAriseMsgTitleCustom(description, prefix);
}

/**
 * Arise 訊息日誌選項
 * Arise message log options
 */
interface IAriseMsgLogOptions
{
	/** 訊息內容 */
	message: string;
	/** 日誌級別 */
	level?: EnumLogLevel;
	/** 標籤（可選） */
	label?: string;
}

/**
 * 格式化日誌 body
 * Format log body
 *
 * @param options - 日誌選項
 * @returns 格式化後的日誌 body
 */
export function formatAriseMsgLogBody(options: IAriseMsgLogOptions): {
	service: string;
	level: EnumLogLevel;
	message: string;
}
{
	const { message, level = EnumLogLevel.Info, label } = options;

	return {
		service: "arise",
		level,
		message: formatAriseMsg([
			label?.length ? `[${label}]` : void 0,
			message,
		]),
	};
}

/**
 * 任務輸出格式化（再現 task.ts 格式）
 * Task output format (reproduce task.ts format)
 *
 * 使用與原始 task.ts 相同的輸出格式：
 * - task_id: ses_xxx (for resuming to continue this task if needed)
 * - <task_result> 標籤包裝結果
 * - </task_result> 關閉標籤
 *
 * Uses the same output format as original task.ts:
 * - task_id: ses_xxx (for resuming to continue this task if needed)
 * - <task_result> wrapper for result
 * - </task_result> closing tag
 *
 * @param taskId - Task ID 或 Session ID
 * @param result - 任務執行結果
 * @returns 格式化後的輸出
 */
export function formatAriseMsgTaskOutput(taskId: string, result: string): string
{
	return `${_createTaskIdResume(taskId)}\n${_createTag(EnumOpenCodeMessageTag.TASK_RESULT, result)}`;
}

export function _createTag(tag: EnumOpenCodeMessageTag, result: string, opts?: {
	lineBreak?: boolean;
}): string
{
	const c = opts?.lineBreak ? '\n' : '';
	return `<${tag}>${c}${result}${c}</${tag}>`;
}

export function _createTaskIdResume(taskId: string): string
{
	return `task_id: ${taskId} (for resuming to continue this task if needed)`;
}
