/**
 * 字串工具函式
 * String utility functions
 */

import { ITSNullable } from "ts-type";

/**
 * 判斷字串是否為非空字串（不含空白）
 * Check if string is non-empty (no whitespace only)
 *
 * @param value - 待檢查的字串
 * @returns 若非空则回傳 true
 */
export function _isNotEmpty<T extends string>(value?: T): value is Exclude<NonNullable<T>, ''>
{
	return value?.trim().length! > 0;
}

export function _isEmpty(value?: string | unknown): value is ITSNullable<''>
{
	return !_isNotEmpty(value as string);
}

export function _trimLazy<T extends string>(value?: T | string): T
{
	return value?.replace(/^[\s　\r\n]+|[\s　\r\n]+$/, '') as T;
}

/**
 * 名稱標準化：去除模型字串開頭或結尾的多餘分隔符
 * Normalize model string: remove leading/trailing separators from model string
 *
 * 去除以下模式：
 * Removes the following patterns:
 * - 開頭或結尾的 `/`（如 `/model`、`model/`）
 * - Leading or trailing `/` (e.g., `/model`, `model/`)
 * - 開頭或結尾的 `/.`（如 `/.model`、`model/.`）
 * - Leading or trailing `/.` (e.g., `/.model`, `model/.`)
 * - 開頭或結尾的 `./`（如 `./model`、`model./`）
 * - Leading or trailing `./` (e.g., `./model`, `model./`)
 *
 * @param inputModel - 原始模型字串 / Original model string
 * @returns 標準化後的模型字串 / Normalized model string
 *
 * @example
 * normalizeModelString("AUTO/.")     // "AUTO"
 * normalizeModelString("/AUTO")      // "AUTO"
 * normalizeModelString("AUTO/")      // "AUTO"
 * normalizeModelString("./AUTO/.")   // "AUTO"
 * normalizeModelString("openai/gpt-4/.")  // "openai/gpt-4"
 */
export function normalizeModelString(inputModel: string): string
{
	let result = _trimLazy(inputModel);

	// // 重複去除直到穩定（處理多重疊加如 `//./`）
	// // Repeat until stable (handles stacked patterns like `//./`)
	// let prev: string;
	// do
	// {
	// 	prev = result;
	// 	result = result
	// 		// 去除開頭的 /. 或 ./ 或 /
	// 		// Remove leading /. or ./ or /
	// 		.replace(/^[\\\/\.\s]+/g, '')
	// 		// 去除結尾的 /. 或 ./ 或 /
	// 		// Remove trailing /. or ./ or /
	// 		.replace(/[\\\/\.\s]+$/g, '');
	// }
	// while (result !== prev);

	return result?.replace(/^[\\\/\.\s]+|[\\\/\.\s]+$/g, '');
}
