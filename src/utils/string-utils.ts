/**
 * 字串工具函式
 * String utility functions
 */

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
