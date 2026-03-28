
import { deepmergeAll, IAnyRecord } from 'deepmerge-plus';
import { ITSPartialRecord, ITSDeepPartial } from 'ts-type';
import { _isNonNullableObject } from './type-guard';

type JsonObject = Record<string, unknown>;

/**
 * 深度合併兩個物件
 * Deep merge two objects
 *
 * 遞迴地合併巢狀物件，陣列會被直接替換而非合併
 * Recursively merges nested objects; arrays are replaced instead of merged
 *
 * @param base - 基礎物件（被合併的物件）
 * @param override - 覆蓋物件（優先使用的值）
 * @returns 合併後的物件
 */
export function deepMerge(base: JsonObject, override: JsonObject): JsonObject
{
	/** 複製基礎物件以避免修改原始資料 / Copy base object to avoid mutating original */
	const result: JsonObject = { ...base };

	/** 遍歷覆蓋物件的所有鍵值 / Iterate through all key-value pairs in override */
	for (const [key, value] of Object.entries(override))
	{
		/**
		 * 檢查是否需要遞迴合併
		 * Check if recursive merge is needed
		 *
		 * 條件：
		 * 1. value 是物件（不是 null，不是陣列）
		 * 2. result[key] 也是物件（不是 null，不是陣列）
		 */
		if (
			typeof value === "object" &&
			value !== null &&
			!Array.isArray(value) &&
			typeof result[key] === "object" &&
			result[key] !== null &&
			!Array.isArray(result[key])
		)
		{
			/**
			 * 遞迴合併巢狀物件
			 * Recursively merge nested objects
			 */
			result[key] = deepMerge(result[key] as JsonObject, value as JsonObject);
		}
		else
		{
			/**
			 * 直接覆蓋值（包含陣列）
			 * Direct override (including arrays)
			 *
			 * 陣列會被整個替換，不進行元素級別的合併
			 * Arrays are replaced entirely, no element-level merging
			 */
			result[key] = value;
		}
	}
	return result;
}

/**
 * 深度合併兩個物件（我實作的版本）
 * Deep merge two objects (my implementation)
*
 * 將 source 物件合併到 target 物件中，回傳新的合併後物件
 * Merges source object into target object, returns new merged object
 *
 * 合併邏輯：
 * - 兩者都是物件：遞迴合併
 * - source 不是 undefined：使用 source 的值
 * - 否則使用 target 的值
 *
 * @param target - 目標物件（預設值）
 * @param source - 來源物件（覆寫值）
 * @returns 合併後的新物件
 */
export function deepMerge3<T extends IAnyRecord, U extends IAnyRecord = T>(target: ITSDeepPartial<T>, source: ITSDeepPartial<U> | undefined): NonNullable<T & U>
{
	// 如果 source 為 undefined 或 null，直接回傳 target
	if (source === undefined || source === null)
	{
		return target as any;
	}

	const result: T & U = { ...target } as any;

	for (const key of Object.keys(source) as (keyof typeof result)[])
	{
		const sourceValue = source[key];
		const targetValue = target[key];

		// 兩者都是物件且不是陣列或 null，進行遞迴合併
		if (
			_isNonNullableObject(sourceValue) &&
			_isNonNullableObject(targetValue)
		)
		{
			// 遞迴合併巢狀物件
			result[key] = deepMerge3(targetValue, sourceValue) as any;
		}
		else if (sourceValue !== undefined)
		{
			// source 有值，使用 source 的值
			result[key] = sourceValue;
		}
	}

	return result;
}

export function configMergeDeep<T extends IAnyRecord>(inputList: [base: T, ...override: T[]]): T
export function configMergeDeep<T extends IAnyRecord>(inputList: T[]): T
export function configMergeDeep<T extends IAnyRecord>(inputList: T[]): T
{
  return deepmergeAll(inputList, {
    // keyValueUpsertMode: true,
    arrayMerge: _arrayMergeRightSourceWins,
  });
}

/**
 * 左邊為主：完全保留目標陣列
 * Left primary: Keep target array completely
 */
export function _arrayMergeLeftTargetWins(target: any[], source: any[]): any[]
{
	return target;
}

/**
 * 右邊為主：完全使用來源陣列
 * Right primary: Use source array completely
 */
export function _arrayMergeRightSourceWins(target: any[], source: any[]): any[]
{
	return source.slice();
}

