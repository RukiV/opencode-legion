/**
 * Shadow Agent 相關型別定義
 * Shadow Agent type definitions
 *
 * 定義 Shadow Agent 的模式、權限和工具相關類型
 * Defines Shadow Agent modes, permissions, and tool-related types
 *
 * 關於 Enum 放置：
 * - OpenCode 概念相關的 Enum（模式、權限）定義於此檔案
 * - ARISE 工具專用的 Enum 定義於 enums.ts
 */

import { ToolContext, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { z } from 'zod';
import { EnumAriseTools } from '../types/enums';
import { ARISE_TOOLS } from '../agents/shadows';
import type { IAriseTools } from '../types/types';
import { $ZodType, $ZodTypeInternals } from 'zod/v4/core';
import { type Hooks, type PluginInput, tool } from '@opencode-ai/plugin';
import type { ITSOverwrite } from 'ts-type';
import { BackgroundManager } from '../tools/background-manager';

/**
 * Shadow Agent 模式
 * Shadow Agent mode
 *
 * - PRIMARY: 主代理（Monarch 使用）
 * - SUBAGENT: 子代理（其他 Shadow 使用）
 * - ALL: 所有模式
 */
export enum EnumOpencodeAgentMode {
	/** 主代理模式 - 唯一的主要協調者 / Primary mode - the only main coordinator */
	PRIMARY = "primary",
	/** 子代理模式 - 被 Monarch 召喚的 Shadow / Subagent mode - Shadows summoned by Monarch */
	SUBAGENT = "subagent",
	/** 所有模式 - 可同時作為主代理和子代理 / All modes - can be both primary and subagent */
	ALL = "all",
}

/**
 * Shadow Agent 權限等級
 * Shadow Agent permission level
 *
 * 控制 Shadow 代理對特定操作的權限
 * Controls Shadow agent permissions for specific operations
 *
 * - ALLOW: 允許執行
 * - DENY: 拒絕執行
 * - ASK: 詢問使用者
 */
export enum EnumOpencodeAgentPermission {
	/** 允許執行 / Allow execution */
	ALLOW = "allow",
	/** 拒絕執行 / Deny execution */
	DENY = "deny",
	/** 詢問使用者 / Ask user */
	ASK = "ask",
}

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
 */
export type IPlugin = (input: PluginInput) => Promise<IHooks>;

