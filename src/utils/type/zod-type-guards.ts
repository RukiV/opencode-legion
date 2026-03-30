/**
 * Zod 類型守衛工具
 * Zod type guard utilities
 *
 * 用於檢查 Zod Schema 內部定義類型的工具函數
 * Utility functions for checking Zod Schema internal definition types
 */

import { z } from "zod";
import { $ZodDefaultDef, $ZodOptionalDef, $ZodType } from "zod/v4/core";

/**
 * 類型守衛：檢查是否為 ZodObject
 * Type guard: Check if it's a ZodObject
 *
 * ZodObject 是用 z.object() 定義的物件類型
 * ZodObject is an object type defined with z.object()
 *
 * @param def - Zod schema definition
 * @returns 是否為 ZodObject / Whether it's a ZodObject
 */
export function _isZodObject(def: z.core.$ZodTypeDef): def is z.ZodObject
{
	return def.type === "object";
}

/**
 * 類型守衛：檢查是否為 $ZodDefaultDef
 * Type guard: Check if it's $ZodDefaultDef
 *
 * $ZodDefaultDef 是使用 .default() 方法定義的帶有默認值的類型
 * $ZodDefaultDef is a type with default value defined using .default() method
 *
 * @param def - Zod schema definition
 * @returns 是否為 $ZodDefaultDef / Whether it's a $ZodDefaultDef
 */
export function _isZodDefaultDef(def: z.core.$ZodTypeDef): def is $ZodDefaultDef
{
	return def.type === "default";
}

/**
 * 類型守衛：檢查是否為 $ZodOptionalDef
 * Type guard: Check if it's $ZodOptionalDef
 *
 * $ZodOptionalDef 是使用 .optional() 方法定義的可選類型
 * $ZodOptionalDef is an optional type defined using .optional() method
 *
 * @param def - Zod schema definition
 * @returns 是否為 $ZodOptionalDef / Whether it's a $ZodOptionalDef
 */
export function _isZodOptionalDef(def: z.core.$ZodTypeDef): def is $ZodOptionalDef
{
	return def.type === "optional";
}
