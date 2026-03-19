/**
 * Shadow Agent 相關型別定義
 * Shadow Agent type definitions
 */

import { ToolContext, type ToolDefinition } from '@opencode-ai/plugin/tool';
import { z, ZodType } from 'zod';
import { ARISE_TOOLS, EnumAriseTools, IAriseTools } from '../tools/tool-names';
import { $ZodType, $ZodTypeInternals } from 'zod/v4/core';
import { type Hooks, PluginInput, tool } from '@opencode-ai/plugin';
import { ITSOverwrite } from 'ts-type';

/**
 * Shadow Agent 模式
 * - PRIMARY: 主代理（ Monarch 使用）
 * - SUBAGENT: 子代理（其他 Shadow 使用）
 * - ALL: 所有模式
 */
export enum EnumOpencodeAgentMode {
  PRIMARY = "primary",
  SUBAGENT = "subagent",
  ALL = "all",
}

/**
 * Shadow Agent 權限等級
 * - ALLOW: 允許執行
 * - DENY: 拒絕執行
 * - ASK: 詢問使用者
 */
export enum EnumOpencodeAgentPermission {
  ALLOW = "allow",
  DENY = "deny",
  ASK = "ask",
}

export type IZodRawShape = z.ZodRawShape | Readonly<{
  [k: string]: $ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>;
}>

export type IReturnTypeOfPluginTool<Args extends IZodRawShape> = {
  description: string;
  args: Args;
  execute(args: z.infer<z.ZodObject<Args>>, context: ToolContext): Promise<string>;
}

export type IReturnTypeOfPluginToolArise<T extends EnumAriseTools> = IReturnTypeOfPluginTool<IPluginToolAriseArgs<T>>

export type IPluginToolAriseArgs<T extends EnumAriseTools> = typeof ARISE_TOOLS[T]["args"]

/**
 * for avoid TypeScript error
 *
 * > error TS2742: The inferred type of 'ARISE_TOOLS' cannot be named without a reference to '.pnpm/zod@4.1.8/node_modules/zod'. This is likely not portable. A type annotation is necessary.
 */
export function tool2<T extends IZodRawShape>(input: IReturnTypeOfPluginTool<T>): IReturnTypeOfPluginTool<T>
export function tool2<T extends EnumAriseTools>(input: IReturnTypeOfPluginToolArise<NoInfer<T>>): IReturnTypeOfPluginToolArise<T>
export function tool2<T extends EnumAriseTools>(input: IReturnTypeOfPluginToolArise<NoInfer<T>>): IReturnTypeOfPluginToolArise<T>
{
  return tool(input as any) as any
}

export type IHooks = ITSOverwrite<Hooks, {
  tool: IAriseTools
}>

export type IPlugin = (input: PluginInput) => Promise<IHooks>;

