/**
 * 會話處理工具函式集合
 * Session handling utility functions
 *
 * 提供會話恢復、訊息搜尋、錯誤檢測等工具
 * Provides utilities for session recovery, message searching, error detection, etc.
 *
 * 參考來源 / Reference:
 * - https://github.com/code-yeongyu/oh-my-openagent
 */

import { getErrorMessage } from "./error";

/* ============ 型別定義 / Type Definitions ============ */

/**
 * 訊息資料介面
 * Message data interface
 */
export interface IMessageData
{
	/** 訊息資訊 / Message info */
	info?: {
		/** 訊息 ID / Message ID */
		id?: string;
		/** 訊息角色 / Message role */
		role?: string;
		/** 會話 ID / Session ID */
		sessionID?: string;
		/** 父訊息 ID / Parent message ID */
		parentID?: string;
		/** 使用的代理 / Agent used */
		agent?: string;
		/** 使用的模型 / Model used */
		model?: string;
		/** 可用工具 / Available tools */
		tools?: string[];
	};
	/** 訊息內容 parts / Message content parts */
	parts?: Array<{
		type: string;
		text?: string;
		[ key: string ]: unknown;
	}>;
}

/**
 * 會話恢復配置介面
 * Session resume configuration interface
 */
export interface IResumeConfig
{
	/** 會話 ID / Session ID */
	sessionID: string;
	/** 代理名稱 / Agent name */
	agent?: string;
	/** 模型 ID / Model ID */
	model?: string;
	/** 工具列表 / Tools list */
	tools?: string[];
}

/**
 * 訊息資訊介面
 * Message info interface
 */
export interface IMessageInfo
{
	/** 訊息 ID / Message ID */
	id?: string;
	/** 訊息角色 / Message role */
	role?: string;
	/** 會話 ID / Session ID */
	sessionID?: string;
	/** 父訊息 ID / Parent message ID */
	parentID?: string;
	/** 錯誤物件 / Error object */
	error?: unknown;
}

/**
 * 錯誤類型列舉
 * Error type enumeration
 */
export enum EnumRecoveryErrorType
{
	/** 工具結果缺失 / Tool result missing */
	ToolResultMissing = "tool_result_missing",
	/** 工具不可用 / Unavailable tool */
	UnavailableTool = "unavailable_tool",
	/** 思考區塊順序錯誤 / Thinking block order error */
	ThinkingBlockOrder = "thinking_block_order",
	/** 思考功能禁用違規 / Thinking disabled violation */
	ThinkingDisabledViolation = "thinking_disabled_violation",
	/** 助手預填充不支援 / Assistant prefill unsupported */
	AssistantPrefillUnsupported = "assistant_prefill_unsupported",
}

/* ============ 訊息搜尋 / Message Search ============ */

/**
 * 尋找最後一個使用者訊息
 * Find the last user message
 *
 * 從訊息列表中找出最後一個 role 為 "user" 的訊息
 * Finds the last message with role "user" from the list
 *
 * @param messages - 訊息資料陣列 / Array of message data
 * @returns 最後一個使用者訊息，若無則返回 undefined / Last user message or undefined
 *
 * @example
 * ```typescript
 * const lastUser = findLastUserMessage(messages);
 * if (lastUser) {
 *   console.log(lastUser.info?.role); // "user"
 * }
 * ```
 */
export function findLastUserMessage(messages: IMessageData[]): IMessageData | undefined
{
	/**
	 * 從陣列末尾開始遍歷，找到最後一個使用者訊息
	 * Traverse from end of array to find the last user message
	 */
	for (let i = messages.length - 1; i >= 0; i--)
	{
		if (messages[ i ]?.info?.role === "user")
		{
			return messages[ i ];
		}
	}
	return undefined;
}

/**
 * 尋找最後一個助手訊息
 * Find the last assistant message
 *
 * @param messages - 訊息資料陣列 / Array of message data
 * @returns 最後一個助手訊息，若無則返回 undefined / Last assistant message or undefined
 */
export function findLastAssistantMessage(messages: IMessageData[]): IMessageData | undefined
{
	for (let i = messages.length - 1; i >= 0; i--)
	{
		if (messages[ i ]?.info?.role === "assistant")
		{
			return messages[ i ];
		}
	}
	return undefined;
}

/**
 * 根據 ID 尋找訊息
 * Find message by ID
 *
 * @param messages - 訊息資料陣列 / Array of message data
 * @param messageId - 要尋找的訊息 ID / Message ID to find
 * @returns 找到的訊息，若無則返回 undefined / Found message or undefined
 */
export function findMessageById(
	messages: IMessageData[],
	messageId: string
): IMessageData | undefined
{
	return messages.find((m) => m.info?.id === messageId);
}

/* ============ 會話恢復 / Session Recovery ============ */

/**
 * 從使用者訊息提取恢復配置
 * Extract resume configuration from user message
 *
 * 從最後一個使用者訊息中提取會話恢復所需的配置資訊
 * Extracts session recovery configuration from the last user message
 *
 * @param userMessage - 使用者訊息（可選）/ User message (optional)
 * @param sessionID - 會話 ID / Session ID
 * @returns 會話恢復配置 / Session resume configuration
 *
 * @example
 * ```typescript
 * const lastUser = findLastUserMessage(messages);
 * const config = extractResumeConfig(lastUser, sessionId);
 * // { sessionID: "abc123", agent: "monarch", model: "gpt-4" }
 * ```
 */
export function extractResumeConfig(
	userMessage: IMessageData | undefined,
	sessionID: string
): IResumeConfig
{
	return {
		sessionID,
		agent: userMessage?.info?.agent,
		model: userMessage?.info?.model,
		tools: userMessage?.info?.tools,
	};
}

/**
 * 建立恢復提示文字
 * Create recovery prompt text
 *
 * @param customText - 自訂恢復文字（可選）/ Custom recovery text (optional)
 * @returns 恢復提示文字 / Recovery prompt text
 */
export function createRecoveryPrompt(customText?: string): string
{
	return customText ?? "[session recovered - continuing previous task]";
}

/* ============ 錯誤檢測 / Error Detection ============ */

/**
 * 檢測錯誤類型
 * Detect error type
 *
 * 分析錯誤物件並返回對應的錯誤類型
 * Analyzes error object and returns corresponding error type
 *
 * @param error - 錯誤物件（任意類型）/ Error object (any type)
 * @returns 錯誤類型，若無法識別則返回 null / Error type or null if unrecognized
 *
 * @example
 * ```typescript
 * const errorType = detectErrorType(error);
 * if (errorType === EnumRecoveryErrorType.ToolResultMissing) {
 *   // 處理工具結果缺失錯誤
 * }
 * ```
 */
export function detectErrorType(error: unknown): EnumRecoveryErrorType | null
{
	/**
	 * 使用共用函式取得錯誤訊息
	 * Use shared function to get error message
	 */
	const errorMessage = getErrorMessage(error);

	/**
	 * 工具結果缺失錯誤
	 * Tool result missing error
	 */
	if (
		errorMessage.includes("tool_result_missing") ||
		errorMessage.includes("Missing tool_result") ||
		errorMessage.includes("tool result was cancelled")
	)
	{
		return EnumRecoveryErrorType.ToolResultMissing;
	}

	/**
	 * 工具不可用錯誤
	 * Unavailable tool error
	 */
	if (
		errorMessage.includes("unavailable_tool") ||
		errorMessage.includes("Tool is not available") ||
		errorMessage.includes("does not exist")
	)
	{
		return EnumRecoveryErrorType.UnavailableTool;
	}

	/**
	 * 思考區塊順序錯誤
	 * Thinking block order error
	 */
	if (
		errorMessage.includes("thinking_block_order") ||
		errorMessage.includes("thinking_block") ||
		errorMessage.includes("Invalid thinking block")
	)
	{
		return EnumRecoveryErrorType.ThinkingBlockOrder;
	}

	/**
	 * 思考功能禁用違規
	 * Thinking disabled violation
	 */
	if (
		errorMessage.includes("thinking_disabled_violation") ||
		errorMessage.includes("thinking is disabled") ||
		errorMessage.includes("thinking blocks are not allowed")
	)
	{
		return EnumRecoveryErrorType.ThinkingDisabledViolation;
	}

	/**
	 * 助手預填充不支援
	 * Assistant prefill unsupported
	 */
	if (
		errorMessage.includes("assistant_prefill_unsupported") ||
		errorMessage.includes("prefill is not supported") ||
		errorMessage.includes("Prefill not supported")
	)
	{
		return EnumRecoveryErrorType.AssistantPrefillUnsupported;
	}

	/**
	 * 無法識別的錯誤類型
	 * Unrecognized error type
	 */
	return null;
}

/**
 * 檢查錯誤是否可恢復
 * Check if error is recoverable
 *
 * @param error - 錯誤物件 / Error object
 * @returns 是否可恢復 / Whether the error is recoverable
 */
export function isRecoverableError(error: unknown): boolean
{
	return detectErrorType(error) !== null;
}

/**
 * 取得錯誤類型的顯示標題
 * Get display title for error type
 *
 * @param errorType - 錯誤類型 / Error type
 * @returns 顯示標題 / Display title
 */
export function getErrorTypeTitle(errorType: EnumRecoveryErrorType): string
{
	const titles: Record<EnumRecoveryErrorType, string> = {
		[ EnumRecoveryErrorType.ToolResultMissing ]: "Tool Crash Recovery",
		[ EnumRecoveryErrorType.UnavailableTool ]: "Tool Recovery",
		[ EnumRecoveryErrorType.ThinkingBlockOrder ]: "Thinking Block Recovery",
		[ EnumRecoveryErrorType.ThinkingDisabledViolation ]: "Thinking Strip Recovery",
		[ EnumRecoveryErrorType.AssistantPrefillUnsupported ]: "Prefill Unsupported",
	};
	return titles[ errorType ] ?? "Unknown Error";
}

/**
 * 取得錯誤類型的顯示訊息
 * Get display message for error type
 *
 * @param errorType - 錯誤類型 / Error type
 * @returns 顯示訊息 / Display message
 */
export function getErrorTypeMessage(errorType: EnumRecoveryErrorType): string
{
	const messages: Record<EnumRecoveryErrorType, string> = {
		[ EnumRecoveryErrorType.ToolResultMissing ]: "Injecting cancelled tool results...",
		[ EnumRecoveryErrorType.UnavailableTool ]: "Recovering from unavailable tool call...",
		[ EnumRecoveryErrorType.ThinkingBlockOrder ]: "Fixing message structure...",
		[ EnumRecoveryErrorType.ThinkingDisabledViolation ]: "Stripping thinking blocks...",
		[ EnumRecoveryErrorType.AssistantPrefillUnsupported ]: "Prefill not supported; continuing without recovery.",
	};
	return messages[ errorType ] ?? "Processing error...";
}

/* ============ 訊息處理 / Message Processing ============ */

/**
 * 從訊息中提取文字內容（增強版）
 * Extract text content from message (enhanced)
 *
 * @param message - 訊息資料 / Message data
 * @returns 提取的文字內容 / Extracted text content
 */
export function extractTextFromMessage(message: IMessageData): string
{
	if (!message.parts || message.parts.length === 0)
	{
		return "";
	}

	return message.parts
		.filter((part) => part.type === "text")
		.map((part) => part.text ?? "")
		.join("\n");
}

/**
 * 檢查訊息是否包含特定工具呼叫
 * Check if message contains specific tool call
 *
 * @param message - 訊息資料 / Message data
 * @param toolName - 工具名稱 / Tool name
 * @returns 是否包含工具呼叫 / Whether message contains tool call
 */
export function messageHasToolCall(message: IMessageData, toolName: string): boolean
{
	if (!message.parts)
	{
		return false;
	}

	return message.parts.some(
		(part) =>
			part.type === "tool_invoke" &&
			( part as { tool?: string } ).tool === toolName
	);
}

/**
 * 取得訊息中的所有工具呼叫
 * Get all tool calls from message
 *
 * @param message - 訊息資料 / Message data
 * @returns 工具名稱陣列 / Array of tool names
 */
export function getToolCallsFromMessage(message: IMessageData): string[]
{
	if (!message.parts)
	{
		return [];
	}

	return message.parts
		.filter((part) => part.type === "tool_invoke")
		.map((part) => ( part as { tool?: string } ).tool)
		.filter((tool): tool is string => tool !== undefined);
}

/* ============ 會話驗證 / Session Validation ============ */

/**
 * 驗證會話訊息資訊
 * Validate session message info
 *
 * 檢查訊息資訊是否包含恢復會話所需的必要欄位
 * Checks if message info contains required fields for session recovery
 *
 * @param info - 訊息資訊 / Message info
 * @returns 是否有效 / Whether the info is valid
 */
export function isValidMessageInfo(info: IMessageInfo): boolean
{
	/**
	 * 必須要有 sessionID 和 id
	 * Must have sessionID and id
	 */
	return !!info.sessionID && !!info.id;
}

/**
 * 檢查訊息是否來自助手
 * Check if message is from assistant
 *
 * @param info - 訊息資訊 / Message info
 * @returns 是否來自助手 / Whether message is from assistant
 */
export function isAssistantMessage(info: IMessageInfo): boolean
{
	return info.role === "assistant";
}

/**
 * 檢查訊息是否包含錯誤
 * Check if message contains error
 *
 * @param info - 訊息資訊 / Message info
 * @returns 是否包含錯誤 / Whether message contains error
 */
export function hasError(info: IMessageInfo): boolean
{
	return info.error !== undefined && info.error !== null;
}
