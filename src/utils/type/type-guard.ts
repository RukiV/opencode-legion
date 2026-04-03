/**
 * 類型守衛工具函式
 * Type guard utility functions
 */

import type { IAnyRecord } from 'deepmerge-plus';
import type { ITSNullable } from 'ts-type';

/**
 * 判斷值是否為非空物件（不是 null、不是陣列）
 * Check if value is a non-nullable object (not null, not array)
 *
 * @param value - 待檢查的值 / Value to check
 * @returns 若為非空物件則回傳 true / Returns true if value is a non-nullable object
 */
export function _isNonNullableObject(value: unknown): value is Exclude<IAnyRecord, any[]>
{
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 判斷值是否為 undefined
 * Check if value is undefined
 *
 * @param value - 待檢查的值 / Value to check
 * @returns 若為 undefined 則回傳 true / Returns true if value is undefined
 */
export function _isUndefined<T>(value: unknown | undefined): value is undefined
{
	return typeof value === 'undefined';
}

/**
 * 判斷值是否為 null
 * Check if value is null
 *
 * @param value - 待檢查的值 / Value to check
 * @returns 若為 null 則回傳 true / Returns true if value is null
 */
export function _isNull<T>(value: unknown | null): value is null
{
	return value === null;
}

/**
 * 判斷值是否為 null 或 undefined
 * Check if value is null or undefined
 *
 * @param value - 待檢查的值 / Value to check
 * @returns 若為 null 或 undefined 則回傳 true / Returns true if value is null or undefined
 */
export function _isNullable<T>(value: unknown | null | undefined): value is null | undefined
{
	return value === null || typeof value === 'undefined';
}

/**
 * 判斷值是否不為 null 且不為 undefined
 * Check if value is not null and not undefined
 *
 * @param value - 待檢查的值 / Value to check
 * @returns 若不為 null 且不為 undefined 則回傳 true / Returns true if value is neither null nor undefined
 */
export function _isNonNullable<T>(value: unknown | NonNullable<T>): value is T extends NonNullable<infer U> ? U : T
{
	return !_isNullable(value);
}