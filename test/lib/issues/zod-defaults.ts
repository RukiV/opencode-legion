/**
 * Zod Schema 提取默認值工具
 * Zod Schema extract defaults utility
 *
 * 兩種方法：
 * 1. 從 JSON Schema 提取默認值
 * 2. 從 Zod Schema 直接提取默認值
 *
 * 兩種方法都適用於巢狀結構，會遞迴提取所有 .default() 定義的值
 * Both methods work with nested structures and recursively extract all values defined by .default()
 */

import { z } from "zod";
import { $ZodDefaultDef, $ZodOptionalDef, $ZodType, ZodStandardJSONSchemaPayload } from "zod/v4/core";
import { tsObjectEntries } from "ts-type-object-entries";

// ==================== 方法一：從 JSON Schema 提取默認值 ====================

/**
 * 方法一：從 JSON Schema 提取默認值
 * Method 1: Extract defaults from JSON Schema
 *
 * 流程：
 * 1. 使用 z.toJSONSchema() 將 Zod Schema 轉換為 JSON Schema
 * 2. 遞迴遍歷 JSON Schema，提取所有包含 "default" 屬性的值
 * 3. 返回包含所有默認值的物件
 *
 * @param schema - Zod Schema 對象
 * @returns 包含所有默認值的物件
 */
export function extractDefaultsFromJSONSchema<T extends z.ZodTypeAny>(schema: T): NonNullable<z.infer<T>>
{
	const jsonSchema = z.toJSONSchema(schema);

	return extractDefaultsFromJSONSchemaObject(jsonSchema);
}

/**
 * 從 JSON Schema 對象提取默認值
 * Extract defaults from JSON Schema object
 *
 * 遞迴處理邏輯：
 * 1. 如果是 null/undefined → 返回 undefined
 * 2. 如果有 "default" 屬性 → 直接返回該值
 * 3. 如果是 object 且有 "properties" → 遞迴處理每個屬性
 * 4. 其他情況 → 返回 undefined
 *
 * @param obj - JSON Schema 對象或值
 * @returns 提取的默認值或包含默認值的物件
 */
function extractDefaultsFromJSONSchemaObject<T extends z.ZodTypeAny | z.ZodType>(obj: ZodStandardJSONSchemaPayload<T> | z.core.JSONSchema._JSONSchema): NonNullable<z.infer<T>>
{
	/**
	 * 如果是 null 或 undefined，返回 undefined
	 * If null or undefined, return undefined
	 */
	if (obj === null || obj === undefined)
	{
		return undefined as any;
	}

	/**
	 * 如果是基本類型且有 default，返回 default
	 * If primitive type with default, return default
	 */
	if ((obj as any).default !== undefined)
	{
		return (obj as any).default as any;
	}

	/**
	 * 如果是 object，遞迴處理
	 * If object, process recursively
	 */
	if (typeof obj === "object" && !Array.isArray(obj))
	{
		/**
		 * 如果有 properties，處理每個屬性
		 * If has properties, process each property
		 */
		if (obj.properties && typeof obj.properties === "object")
		{
			const result: Record<string, any> = {};

			for (const [key, value] of tsObjectEntries(obj.properties))
			{
				if (value === null || value === undefined) continue;

				const defaultValue = extractDefaultsFromJSONSchemaObject(value);

				/**
				 * 如果有 default 值或是物件（需要保留巢狀結構）
				 * If has default value or is object (need to keep nested structure)
				 */
				if (defaultValue !== undefined)
				{
					result[key] = defaultValue;
				}
				else if (typeof value === "object" && value.properties)
				{
					/**
					 * 巢狀物件，遞迴處理
					 * Nested object, process recursively
					 */
					const nested = extractDefaultsFromJSONSchemaObject(value);
					if (nested !== undefined && Object.keys(nested).length > 0)
					{
						result[key] = nested;
					}
				}
			}

			return Object.keys(result).length > 0 ? result as any : undefined as any;
		}
	}

	return undefined as any;
}

// ==================== 方法二：從 Zod Schema 直接提取默認值 ====================

/**
 * 類型守衛：檢查是否為 ZodObject
 * Type guard: Check if it's a ZodObject
 *
 * ZodObject 是用 z.object() 定義的物件類型
 * ZodObject is an object type defined with z.object()
 */
function _isZodObject(def: z.core.$ZodTypeDef): def is z.ZodObject
{
	return def.type === 'object';
}

/**
 * 類型守衛：檢查是否為 $ZodDefaultDef
 * Type guard: Check if it's $ZodDefaultDef
 *
 * $ZodDefaultDef 是使用 .default() 方法定義的帶有默認值的類型
 * $ZodDefaultDef is a type with default value defined using .default() method
 */
function _is$ZodDefaultDef(def: z.core.$ZodTypeDef): def is $ZodDefaultDef
{
	return def.type === 'default';
}

/**
 * 類型守衛：檢查是否為 $ZodOptionalDef
 * Type guard: Check if it's $ZodOptionalDef
 *
 * $ZodOptionalDef 是使用 .optional() 方法定義的可選類型
 * $ZodOptionalDef is an optional type defined using .optional() method
 */
function _is$ZodOptionalDef(def: z.core.$ZodTypeDef): def is $ZodOptionalDef
{
	return def.type === 'optional';
}

/**
 * 方法二：從 Zod Schema 直接提取默認值（不通過 JSON Schema）
 * Method 2: Extract defaults directly from Zod Schema (without JSON Schema)
 *
 * 流程：
 * 1. 使用 schema.def 獲取公開 API 定義（不使用已棄用的 _def）
 * 2. 通過類型守衛判斷 schema 類型：
 *    - $ZodDefaultDef → 直接返回 defaultValue
 *    - $ZodOptionalDef → 遞迴處理內部類型
 *    - ZodObject → 遞迴處理每個屬性
 * 3. 其他類型 → 返回 undefined
 *
 * 與方法一的區別：
 * - 方法一：先轉換為 JSON Schema，再從中提取 default 值
 * - 方法二：直接從 Zod Schema 的內部定義提取默認值
 *
 * @param schema - Zod Schema 對象
 * @returns 包含所有默認值的物件
 */
export function extractDefaultsFromSchema<T extends z.ZodTypeAny | z.ZodType | $ZodType>(schema: T): NonNullable<z.infer<T>>
{
	/**
	 * 使用公開 API 獲取 schema 定義（不使用已棄用的 _def）
	 * Use public API to get schema definition (not using deprecated _def)
	 */
	const def = (schema as z.ZodType).def;

	/**
	 * 如果 schema 有 .default() 定義，直接返回默認值
	 * If schema has .default() defined, return the default value directly
	 */
	if (_is$ZodDefaultDef(def))
	{
		return def.defaultValue as any;
	}

	/**
	 * 如果是 optional 類型，遞迴處理其內部類型
	 * If it's an optional type, recursively process its inner type
	 */
	if (_is$ZodOptionalDef(def))
	{
		return extractDefaultsFromSchema(def.innerType) as any;
	}

	/**
	 * 如果是物件類型，遍歷其所有屬性
	 * If it's an object type, iterate over all its properties
	 */
	if (_isZodObject(def))
	{
		const shape = def.shape;
		const result: Record<string, any> = {};

		/**
		 * 使用 tsObjectEntries 類型安全地遍歷物件屬性
		 * Use tsObjectEntries for type-safe iteration over object properties
		 */
		for (const [key, fieldSchema] of tsObjectEntries<z.ZodTypeAny>(shape))
		{
			const defaultValue = extractDefaultsFromSchema(fieldSchema);

			/**
			 * 如果字段有默認值（不是 undefined），則添加到結果中
			 * If field has default value (not undefined), add to result
			 */
			if (defaultValue !== undefined)
			{
				result[key] = defaultValue;
			}
		}

		return result as any;
	}

	/**
	 * 其他類型（string, number, boolean 等基本類型且無默認值）
	 * Other types (string, number, boolean, etc. without default value)
	 */
	return undefined as any;
}

/**
 * 從 Schema 導出預設配置（包裝函式）
 * Export default config from Schema (wrapper function)
 *
 * 使用 Zod 的 transform 機制包裝 extractDefaultsFromSchema
 * 使用時呼叫 .parse(undefined) 或 .safeParse(undefined)
 *
 * @param schema - Zod Schema 對象
 * @returns 包裝後的 Zod Schema，解析時返回默認值
 */
export function createDefaultsFromSchema<T extends z.ZodTypeAny>(schema: T): NonNullable<z.infer<T>>
{
	return z
		.any()
		.transform(() => extractDefaultsFromSchema(schema)) as any;
}
