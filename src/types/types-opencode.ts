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
import type { ITSOverwrite, ITSPartialRecord, ITSTypeAndStringLiteral } from 'ts-type';
import { EnumOpencodeAgentPermission } from './enum-opencode';

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

export interface IModelBody 
{
  providerID: string;
  modelID: string;
}

/**
 * Shadow Agent 權限鍵值列舉（不含 Bash）
 * Shadow Agent permission keys enum (excluding Bash)
 *
 * 對應 OpenCode 可用權限列表
 * Reference: https://opencode.ai/docs/permissions/#available-permissions
 *
 * | 分類 | Key | 說明 / Description |
 * |------|-----|----------------------|
 * | 檔案操作 | read | 讀取檔案 (matches file path) |
 * | 檔案操作 | edit | 檔案修改 (covers edit, write, patch, multiedit) |
 * | 檔案操作 | glob | 檔案 glob (matches glob pattern) |
 * | 檔案操作 | grep | 內容搜尋 (matches regex pattern) |
 * | 檔案操作 | list | 列出目錄 (matches directory path) |
 * | 執行操作 | task | 啟動子代理 (matches subagent type) |
 * | 執行操作 | skill | 載入 skill (matches skill name) |
 * | 執行操作 | lsp | LSP 查詢 (currently non-granular) |
 * | 執行操作 | question | 執行中提問 |
 * | 網路操作 | webfetch | 請求 URL (matches URL) |
 * | 網路操作 | websearch | 網路搜尋 (matches query) |
 * | 網路操作 | codesearch | 代碼搜尋 (matches query) |
 * | 安全防護 | external_directory | 存取工作目錄外的路徑 |
 * | 安全防護 | doom_loop | 相同工具呼叫重複 3 次 |
 *
 * @note Bash 使用 pattern matching，單獨定義於 {@see EnumShadowAgentPermissionKey2.bash}
 */
export const enum EnumShadowAgentPermissionKey
{
	/** 讀取檔案 (matches file path) / Read a file */
	Read = 'read',

	/** 檔案修改 (covers edit, write, patch, multiedit) / All file modifications */
	Edit = 'edit',

	/** 
	 * 檔案寫入 (covers write, patch, multiedit) / File writing
	 * 
	 * 向後相容性 / Backward compatibility
	 */
	Write = 'write',

	/** 檔案 glob (matches glob pattern) / File globbing */
	Glob = 'glob',

	/** 內容搜尋 (matches regex pattern) / Content search */
	Grep = 'grep',

	/** 列出目錄 (matches directory path) / List files in a directory */
	List = 'list',

	

	/** 載入 skill (matches skill name) / Load a skill */
	Skill = 'skill',

	/** LSP 查詢 (currently non-granular) / Run LSP queries */
	Lsp = 'lsp',

	/** 請求 URL (matches URL) / Fetch a URL */
	Webfetch = 'webfetch',

	/** 網路搜尋 (matches query) / Web search */
	Websearch = 'websearch',

	/** 代碼搜尋 (matches query) / Code search */
	Codesearch = 'codesearch',
}

/**
 * Shadow Agent 權限鍵值 可使用 pattern matching (如 "git *"、"npm *")
 * Shadow Agent permission key that supports pattern matching
 */
export const enum EnumShadowAgentPermissionKey2
{
	/** 執行指令 (matches parsed commands) / Run shell commands */
	Bash = 'bash',
}

/**
 * 會導致 設定崩潰 的權限設定
 */
export const enum EnumShadowAgentPermissionKeyInvalid
{
	/** 啟動子代理 (matches subagent type) / Launch subagents */
	Task = 'task',

	/** 存取工作目錄外的路徑 / Touch paths outside the working directory */
	ExternalDirectory = 'external_directory',

	/** 相同工具呼叫重複 3 次 / Same tool call repeats 3 times with identical input */
	DoomLoop = 'doom_loop',

	/** 執行中提問 / Ask the user questions during execution */
	Question = 'question',
}

export const SHADOW_AGENT_PERMISSION_KEY_INVALID = [
	EnumShadowAgentPermissionKeyInvalid.Task,
	EnumShadowAgentPermissionKeyInvalid.ExternalDirectory,
	EnumShadowAgentPermissionKeyInvalid.DoomLoop,
] as ITSTypeAndStringLiteral<EnumShadowAgentPermissionKeyInvalid>[];

export type IShadowAgentPermissionCore<P extends string> = Record<P, EnumOpencodeAgentPermission>;

/**
 * Shadow Agent 權限介面
 * Shadow Agent permission interface
 *
 * @example
 * {
 *   edit: EnumOpencodeAgentPermission.DENY,
 *   write: EnumOpencodeAgentPermission.DENY,  // 向後相容性 / Backward compatibility
 *   bash: { "git *": "allow", "npm *": "deny" }
 * }
 */
export type IShadowAgentPermission = ITSPartialRecord<ITSTypeAndStringLiteral<EnumShadowAgentPermissionKey>, EnumOpencodeAgentPermission> 

	/**
	 * Shadow Agent 權限鍵值 可使用 pattern matching (如 "git *"、"npm *")
	 * Shadow Agent permission key that supports pattern matching
	 */
	& ITSPartialRecord<ITSTypeAndStringLiteral<EnumShadowAgentPermissionKey2>, EnumOpencodeAgentPermission | ITSPartialRecord<string | "*",  EnumOpencodeAgentPermission>>
	/**
	 * 會導致 設定崩潰 的權限設定
	 */
	& ITSPartialRecord<EnumShadowAgentPermissionKeyInvalid, never>
	;
