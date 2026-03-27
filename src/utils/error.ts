/**
 * 錯誤處理工具函式集合
 * Error handling utility functions
 *
 * 提供錯誤訊息提取、錯誤類型判斷等共用工具
 * Provides shared utilities for error message extraction, error type detection, etc.
 */

/**
 * 安全地取得錯誤訊息
 * Safely extract error message
 *
 * @param error - 錯誤物件（可以是任何類型）
 * @returns 錯誤訊息字串
 */
export function getErrorMessage(error: unknown): string
{
	return error instanceof Error ? error.message : String(error);
}
