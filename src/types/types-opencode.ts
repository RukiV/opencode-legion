/**
 * Shadow Agent 相關型別定義
 * Shadow Agent type definitions
 *
 * 定義 Shadow Agent 的工具相關類型
 * Defines Shadow Agent tool-related types
 *
 * 關於 Enum 放置：
 * - OpenCode 概念相關的 Enum（模式、權限）定義於 enum-opencode.ts
 * - ARISE 工具專用的 Enum 定義於 enums.ts
 */

import { ToolContext, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { z } from 'zod';
import { EnumAriseTools } from './enums';
import { ARISE_TOOLS } from '../agents/shadows';
import type { IAriseTools } from './types';
import { $ZodType, $ZodTypeInternals } from 'zod/v4/core';
import { type Hooks, type PluginInput, tool, Plugin } from '@opencode-ai/plugin';
import type { ITSOverwrite } from 'ts-type';

/**
 * Zod 原始結構類型
 * Zod raw shape type
 *
 * 支援標準 Zod 和自訂 Zod 類型
 * Supports both standard Zod and custom Zod types
 */
export type IZodRawShape = z.ZodRawShape | Readonly<{
	[k: string]: $ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>;
}>

/**
 * 插件工具返回類型
 * Plugin tool return type
 *
 * 定義插件工具的結構
 * Defines the structure of a plugin tool
 *
 * @typeParam Args - Zod schema 類型參數
 */
export type IReturnTypeOfPluginTool<Args extends IZodRawShape> = {
	/** 工具描述 / Tool description */
	description: string;
	/** 工具參數 schema / Tool arguments schema */
	args: Args;
	/** 工具執行函式 / Tool execute function */
	execute(args: z.infer<z.ZodObject<Args>>, context: ToolContext): Promise<string>;
}

/**
 * Arise 插件工具返回類型
 * Arise plugin tool return type
 *
 * @typeParam T - Arise 工具枚舉值
 */
export type IReturnTypeOfPluginToolArise<T extends EnumAriseTools> = IReturnTypeOfPluginTool<IPluginToolAriseArgs<T>>

/**
 * Arise 工具參數類型
 * Arise tool arguments type
 *
 * 從 ARISE_TOOLS 取得對應工具的參數類型
 * Gets the arguments type for the corresponding tool from ARISE_TOOLS
 *
 * @typeParam T - Arise 工具枚舉值
 */
export type IPluginToolAriseArgs<T extends EnumAriseTools> = typeof ARISE_TOOLS[T]["args"]

/**
 * 工具建立函式（避免 TypeScript 推導錯誤）
 * Tool creation function (avoids TypeScript inference errors)
 *
 * 問題：ARISE_TOOLS 的推導類型需要直接引用 zod 模組，導致發布時不相容
 * Solution: Function overloads explicitly specify return types for better portability
 *
 * > error TS2742: The inferred type of 'ARISE_TOOLS' cannot be named without a reference to '.pnpm/zod@4.1.8/node_modules/zod'. This is likely not portable. A type annotation is necessary.
 */
export function tool2<T extends IZodRawShape>(input: IReturnTypeOfPluginTool<T>): IReturnTypeOfPluginTool<T>
export function tool2<T extends EnumAriseTools>(input: IReturnTypeOfPluginToolArise<NoInfer<T>>): IReturnTypeOfPluginToolArise<T>
export function tool2<T extends EnumAriseTools>(input: IReturnTypeOfPluginToolArise<NoInfer<T>>): IReturnTypeOfPluginToolArise<T>
{
	return tool(input as any) as any
}

/**
 * Arise Hooks 類型
 * Arise Hooks type
 *
 * 覆寫預設 Hooks 中的 tool 為 IAriseTools
 * Overrides the tool in default Hooks with IAriseTools
 */
export type IHooks = ITSOverwrite<Hooks, {
	tool: IAriseTools
}>

/**
 * 插件函式類型
 * Plugin function type
 *
 * OpenCode 插件的主入口點類型
 * The main entry point type for OpenCode plugins
 *
 * @see {@link import("@opencode-ai/plugin").Plugin}
 */
export type IPlugin = (input: PluginInput) => Promise<IHooks>;

