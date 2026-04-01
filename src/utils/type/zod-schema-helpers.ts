/**
 * Zod Schema 輔助工具
 * Zod Schema helper utilities
 *
 * 提供常見的 Zod Schema 模式和預處理邏輯
 * Provides common Zod Schema patterns and preprocessing logic
 */

import { z } from "zod";

/** ==================== Zod Schema 工廠函數 ==================== */

/**
 * 創建 Zod 任意類型或該類型陣列的聯合 Schema
 * Create Zod schema for value or array of values
 *
 * T | T[] 概念的泛型 Zod Schema 版本
 * Generic Zod Schema version of T | T[] concept
 *
 * @param schema - 任意 Zod Schema
 * @returns 該類型或該類型陣列的聯合 Zod Schema
 */
export function zodSchemaOrSchemaArray<T extends z.ZodTypeAny>(schema: T): z.ZodUnion<[T, z.ZodArray<T>]>
{
	return schema.or(z.array(schema));
}

/** ==================== 強制陣列預處理工廠函數 ==================== */

/**
 * 創建強制陣列預處理 Schema（泛型版本）
 * Create force array preprocessing schema (generic version)
 *
 * @param itemSchema - 陣列元素的 Zod Schema
 * @returns 預處理後的陣列 Schema（ZodPipe 類型）
 */
export function createForceZodArraySchema<T extends z.ZodTypeAny>(itemSchema: T): z.ZodPipe<z.ZodTransform<any[], unknown>, z.ZodArray<T>>
{
	return z.preprocess(
		(val) => (val === undefined ? [] : Array.isArray(val) ? val : [val]),
		z.array(itemSchema)
	);
}

/** ==================== 提取原始定義 ==================== */

/**
 * 從 ZodDefault 提取原始內部類型
 * Extract inner type from ZodDefault
 *
 * @param schema - 帶有 .default() 的 Zod Schema
 * @returns 原始的內部類型定義
 */
export function unwrapZodDefault<T extends z.ZodTypeAny>(schema: z.ZodDefault<T>): T
{
	return schema.def.innerType as T;
}

/**
 * 從 ZodOptional 提取原始內部類型
 * Extract inner type from ZodOptional
 *
 * @param schema - 帶有 .optional() 的 Zod Schema
 * @returns 原始的內部類型定義
 */
export function unwrapZodOptional<T extends z.ZodTypeAny>(schema: z.ZodOptional<T>): T
{
	return schema.def.innerType as T;
}

/**
 * 從 ZodNullable 提取原始內部類型
 * Extract inner type from ZodNullable
 *
 * @param schema - 帶有 .nullable() 的 Zod Schema
 * @returns 原始的內部類型定義
 */
export function unwrapZodNullable<T extends z.ZodTypeAny>(schema: z.ZodNullable<T>): T
{
	return schema.def.innerType as T;
}

/**
 * 遞迴解除所有包裝層，直到取得原始內部類型的類型定義
 * Recursively unwrap all wrapper layers to get the innermost type definition
 *
 * 用於從 default/optional/nullable 組合中提取最原始的類型
 * Used to extract the innermost type from combined wrappers
 *
 * @example
 *   const schema = z.string().optional().default("test");
 *   const inner = unwrapAll(schema); // z.ZodString
 */
export type IZodUnwrapAll<T> =
	T extends z.ZodDefault<infer Inner> ? IZodUnwrapAll<Inner> :
	T extends z.ZodOptional<infer Inner> ? IZodUnwrapAll<Inner> :
	T extends z.ZodNullable<infer Inner> ? IZodUnwrapAll<Inner> :
	T;

/**
 * 類型守衛：檢查是否為包裝類型（有 innerType 的類型）
 * Type guard: Check if it's a wrapper type (type with innerType)
 */
function _isWrapperType(def: z.core.$ZodTypeDef): def is z.core.$ZodTypeDef & { innerType: z.ZodTypeAny }
{
	return def && typeof def === "object" && "innerType" in def && def.innerType !== undefined;
}
export function unwrapZodAll<T extends z.ZodTypeAny>(schema: T): IZodUnwrapAll<T>
{
	const def = schema.def;

	/**
	 * 檢查是否為包裝類型（有 innerType 的類型）
	 * Check if it's a wrapper type (type with innerType)
	 */
	if (_isWrapperType(def))
	{
		return unwrapZodAll(def.innerType) as IZodUnwrapAll<T>;
	}

	return schema as IZodUnwrapAll<T>;
}

export function unwrapZodAllShape<T extends z.ZodObject>(schema: T): IZodUnwrapAll<T>
{
	const entries = Object.entries(schema.shape)
		.map(([key, value]) => {
			return [key, unwrapZodAll(value)];
		})
		;

	return Object.fromEntries(entries) as IZodUnwrapAll<T>;
}
