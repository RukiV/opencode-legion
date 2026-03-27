/**
 * 訊息處理工具函式集合
 * Message handling utility functions
 *
 * 提供訊息提取、錯誤處理等共用工具
 * Provides shared utilities for message extraction, error handling, etc.
 */

/* ============ 訊息提取 / Message Extraction ============ */

/**
 * 從訊息 parts 中提取文字內容
 * Extract text content from message parts
 *
 * 支援多個 text parts，使用換行連接
 * Supports multiple text parts, joined with newlines
 *
 * @param parts - 訊息 parts 陣列
 * @returns 提取的文字內容，如果沒有則返回空字串
 */
export function extractTextFromMessageParts(parts?: Array<{ type: string; text?: string }>): string
{
	return parts
		?.filter((p) => p.type === "text")
		.map((p) => (p as { type: "text"; text: string }).text ?? "")
		.join("\n") ?? "";
}

/* ============ 錯誤處理 / Error Handling ============ */

/**
 * 從 error.ts 重新匯出 getErrorMessage
 * Re-export getErrorMessage from error.ts
 *
 * @deprecated 請直接從 utils/error 匯入 / Import directly from utils/error
 */
export { getErrorMessage } from "./error";

/* ============ 時間格式化 / Time Formatting ============ */

/**
 * 格式化任務執行時長
 * Format task execution duration
 *
 * @param startedAt - 任務開始時間戳（毫秒）
 * @param completedAt - 任務完成時間戳（毫秒，可選）
 * @returns 格式化後的時長字串（如 "5s", "1m30s"）
 */
export function formatDuration(startedAt: number, completedAt?: number): string
{
	const durationMs = completedAt
		? completedAt - startedAt
		: Date.now() - startedAt;
	const seconds = Math.round(durationMs / 1000);

	if (seconds < 60)
	{
		return `${seconds}s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m${remainingSeconds}s`;
}
