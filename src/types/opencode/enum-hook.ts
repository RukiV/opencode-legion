/**
 * OpenCode Plugin Hook 名稱列舉
 * OpenCode Plugin Hook names enumeration
 *
 * 定義所有 OpenCode SDK 支援的 Plugin Hook 名稱
 * Defines all plugin hook names supported by OpenCode SDK
 *
 * 分為兩大類：
 * - 穩定 Hooks（非 experimental）
 * - 實驗性 Hooks（experimental.*）
 *
 * @see https://opencode.ai/docs/plugins/
 * @see node_modules/@opencode-ai/plugin/dist/index.d.ts (Hooks 介面)
 */

import { ITSTypeAndStringLiteral } from 'ts-type';
import * as OpenCodePlugin from '@opencode-ai/plugin';

/**
 * =============================================================================
 * 穩定 Hooks (Non-Experimental)
 * =============================================================================
 */

/**
 * 穩定 Plugin Hook 名稱列舉
 * Stable Plugin Hook names enumeration
 *
 * 這些 Hooks 在官方文檔中有完整說明
 * These hooks are fully documented in official documentation
 */
export const enum EnumOpenCodeHookNameStable
{
	/** 聊天訊息接收鉤子 / Chat message received hook */
	ChatMessage = "chat.message",

	/** 聊天參數鉤子 / Chat parameters hook - 修改 LLM 參數 */
	ChatParams = "chat.params",

	/** 聊天 HTTP Headers 鉤子 / Chat HTTP headers hook */
	ChatHeaders = "chat.headers",

	/** 權限請求鉤子 / Permission ask hook */
	PermissionAsk = "permission.ask",

	/** 命令執行前鉤子 / Command execute before hook */
	CommandExecuteBefore = "command.execute.before",

	/** 工具定義鉤子 / Tool definition hook - 修改工具描述 */
	ToolDefinition = "tool.definition",

	/** 工具執行前鉤子 / Tool execute before hook */
	ToolExecuteBefore = "tool.execute.before",

	/** 工具執行後鉤子 / Tool execute after hook */
	ToolExecuteAfter = "tool.execute.after",

	/** Shell 環境變數鉤子 / Shell environment hook */
	ShellEnv = "shell.env",
}

/**
 * =============================================================================
 * 實驗性 Hooks (Experimental)
 * =============================================================================
 */

/**
 * 實驗性 Plugin Hook 名稱列舉
 * Experimental Plugin Hook names enumeration
 *
 * ⚠️ 警告：這些 Hooks 可能在未來版本中變更或移除
 * ⚠️ Warning: These hooks may change or be removed in future versions
 *
 * 已知問題：
 * - experimental.chat.messages.transform: compaction 期間不觸發、變更會被丟棄
 * - experimental.chat.system.transform: 變更會被丟棄、無法與 messages.transform 協調
 */
export const enum EnumOpenCodeHookNameExperimental
{
	/** 聊天訊息轉換鉤子 / Chat messages transform hook */
	ExperimentalChatMessagesTransform = "experimental.chat.messages.transform",

	/** 聊天系統提示轉換鉤子 / Chat system transform hook */
	ExperimentalChatSystemTransform = "experimental.chat.system.transform",

	/** 會話壓縮鉤子 / Session compacting hook - 自訂上下文保留 */
	ExperimentalSessionCompacting = "experimental.session.compacting",

	/** 文字補全完成鉤子 / Text complete hook */
	ExperimentalTextComplete = "experimental.text.complete",
}

/**
 * 完整 Plugin Hook 名稱列舉
 * Complete Plugin Hook names enumeration
 *
 * 包含所有穩定和實驗性 Hooks
 */
export const enum EnumOpenCodeHookName
{
	// 穩定 Hooks
	/** 聊天訊息接收鉤子 / Chat message received hook */
	ChatMessage = "chat.message",

	/** 聊天參數鉤子 / Chat parameters hook - 修改 LLM 參數 */
	ChatParams = "chat.params",

	/** 聊天 HTTP Headers 鉤子 / Chat HTTP headers hook */
	ChatHeaders = "chat.headers",

	/** 權限請求鉤子 / Permission ask hook */
	PermissionAsk = "permission.ask",

	/** 命令執行前鉤子 / Command execute before hook */
	CommandExecuteBefore = "command.execute.before",

	/** 工具定義鉤子 / Tool definition hook - 修改工具描述 */
	ToolDefinition = "tool.definition",

	/** 工具執行前鉤子 / Tool execute before hook */
	ToolExecuteBefore = "tool.execute.before",

	/** 工具執行後鉤子 / Tool execute after hook */
	ToolExecuteAfter = "tool.execute.after",

	/** Shell 環境變數鉤子 / Shell environment hook */
	ShellEnv = "shell.env",

	// 實驗性 Hooks
	/** 聊天訊息轉換鉤子 / Chat messages transform hook */
	ExperimentalChatMessagesTransform = "experimental.chat.messages.transform",

	/** 聊天系統提示轉換鉤子 / Chat system transform hook */
	ExperimentalChatSystemTransform = "experimental.chat.system.transform",

	/** 會話壓縮鉤子 / Session compacting hook - 自訂上下文保留 */
	ExperimentalSessionCompacting = "experimental.session.compacting",

	/** 文字補全完成鉤子 / Text complete hook */
	ExperimentalTextComplete = "experimental.text.complete",
}

/**
 * 所有穩定 Hook 名稱陣列
 * All stable hook names array
 *
 * 用於建立 Zod schema 或驗證
 * Used for Zod schema creation or validation
 */
export const ALL_STABLE_HOOK_NAMES = [
	EnumOpenCodeHookNameStable.ChatMessage,
	EnumOpenCodeHookNameStable.ChatParams,
	EnumOpenCodeHookNameStable.ChatHeaders,
	EnumOpenCodeHookNameStable.PermissionAsk,
	EnumOpenCodeHookNameStable.CommandExecuteBefore,
	EnumOpenCodeHookNameStable.ToolDefinition,
	EnumOpenCodeHookNameStable.ToolExecuteBefore,
	EnumOpenCodeHookNameStable.ToolExecuteAfter,
	EnumOpenCodeHookNameStable.ShellEnv,
] as const;

/**
 * 所有實驗性 Hook 名稱陣列
 * All experimental hook names array
 *
 * 用於建立 Zod schema 或驗證
 * Used for Zod schema creation or validation
 */
export const ALL_EXPERIMENTAL_HOOK_NAMES = [
	EnumOpenCodeHookNameExperimental.ExperimentalChatMessagesTransform,
	EnumOpenCodeHookNameExperimental.ExperimentalChatSystemTransform,
	EnumOpenCodeHookNameExperimental.ExperimentalSessionCompacting,
	EnumOpenCodeHookNameExperimental.ExperimentalTextComplete,
] as const;

/**
 * 所有 Hook 名稱陣列
 * All hook names array
 */
export const ALL_OPENCODE_HOOK_NAMES = [
	...ALL_STABLE_HOOK_NAMES,
	...ALL_EXPERIMENTAL_HOOK_NAMES,
] as const;

/**
 * 檢查是否為實驗性 Hook
 * Check if hook is experimental
 *
 * @param hookName - Hook 名稱 / Hook name
 * @returns 是否為實驗性 Hook / Whether it's an experimental hook
 */
export function isExperimentalHook(hookName: string): boolean
{
	return ALL_EXPERIMENTAL_HOOK_NAMES.includes(hookName as EnumOpenCodeHookNameExperimental);
}

/**
 * 穩定 Hook 名稱類型
 * Stable hook name type
 */
export type IOpenCodeHookNameStable = ITSTypeAndStringLiteral<EnumOpenCodeHookNameStable>;

/**
 * 實驗性 Hook 名稱類型
 * Experimental hook name type
 */
export type IOpenCodeHookNameExperimental = ITSTypeAndStringLiteral<EnumOpenCodeHookNameExperimental>;

/**
 * 完整 Hook 名稱類型
 * Complete hook name type
 */
export type IOpenCodeHookName = ITSTypeAndStringLiteral<EnumOpenCodeHookName>;
