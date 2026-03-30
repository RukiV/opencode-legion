/**
 * 類型守衛工具函式
 * Type guard utility functions
 */

import type { IAnyRecord } from 'deepmerge-plus';

/**
 * 判斷值是否為非空物件（不是 null、不是陣列）
 * Check if value is a non-nullable object (not null, not array)
 *
 * @param value - 待檢查的值
 * @returns 若為非空物件則回傳 true
 */
export function _isNonNullableObject(value: unknown): value is Exclude<IAnyRecord, any[]>
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
