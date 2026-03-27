/**
 * 事件處理器
 * Event handler
 *
 * 處理 OpenCode event 鉤子的邏輯結構
 * Handles the logic structure of OpenCode event hook
 */

import type { PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { clearSessionModel } from "../config/model-cache";
import { getErrorMessage } from "../utils/error";

/**
 * 事件處理器客戶端上下文（使用 Pick 避免重複類型）
 * Event handler client context (uses Pick to avoid type duplication)
 *
 * 從 PluginInput.client 中提取我們需要的屬性
 * Extracts the properties we need from PluginInput.client
 */
export type IEventHandlerClient = Pick<PluginInput["client"], "session" | "tui" | "app">;

/**
 * 事件處理器上下文
 * Event handler context
 *
 * 包裝 IEventHandlerClient 以符合實際使用方式
 * Wraps IEventHandlerClient to match actual usage
 */
export interface IEventHandlerContext
{
	/** 客戶端 / Client */
	client: IEventHandlerClient;
}

/**
 * 會話事件類型
 * Session event types
 *
 * 定義我們處理的會話事件類型
 * Defines the session event types we handle
 */
export type ISessionEventType =
	| "session.created"
	| "session.idle"
	| "session.deleted";

/**
 * 檢查是否為會話事件
 * Check if event is a session event
 *
 * @param eventType - 事件類型 / Event type
 * @returns 是否為會話事件 / Whether it's a session event
 */
export function isSessionEvent(eventType: string): eventType is ISessionEventType
{
	return (
		eventType === "session.created" ||
		eventType === "session.idle" ||
		eventType === "session.deleted"
	);
}

/**
 * 從事件中提取會話 ID
 * Extract session ID from event
 *
 * @param event - OpenCode 事件物件 / OpenCode event object
 * @returns 會話 ID（若存在）/ Session ID (if exists)
 */
export function extractSessionId(event: Event)
{
	const properties = event.properties as Extract<NonNullable<Event["properties"]>, { sessionID: string | undefined }>;
	return properties?.sessionID;
}

/**
 * 處理會話刪除事件
 * Handle session deleted event
 *
 * 清除會話的模型緩存
 * Clears the model cache for the session
 */
export function handleSessionDeleted(event: Event)
{
	const sessionId = extractSessionId(event);
	if (sessionId)
	{
		clearSessionModel(sessionId);
	}
}

/**
 * 創建事件處理器參數
 * Create event handler parameters
 *
 * @param params - 參數物件 / Parameters object
 * @param params.bannerHook - 橫幅鉤子（可選）/ Banner hook (optional)
 * @param params.outputShaper - 輸出整形器（可選）/ Output shaper (optional)
 * @param params.compactionPreserver - 壓縮保留器（可選）/ Compaction preserver (optional)
 * @param params.todoEnforcer - TODO 強制器（可選）/ TODO enforcer (optional)
 * @param params.backgroundManager - 背景任務管理器 / Background task manager
 */
export interface ICreateEventHandlerParams
{
	bannerHook?: {
		onSessionCreated: () => Promise<void>;
	} | null;
	outputShaper?: {
		shapeOutput: (
			tool: string,
			output: string,
			metadata: Record<string, unknown>
		) => Promise<string>;
	} | null;
	compactionPreserver?: {
		getPreservationContext: () => unknown;
	} | null;
	todoEnforcer?: {
		checkCompletion: (messages: { content: string }[]) => Promise<{
			hasIncompleteTodos: boolean;
			reminderMessage?: string;
		}>;
	} | null;
	backgroundManager: {
		handleEvent: (event: Event) => void;
	};
}

/**
 * 創建完整事件處理器（含上下文依賴）
 * Create full event handler (with context dependency)
 *
 * @param params - 參數物件 / Parameters object
 * @returns 完整的事件處理函式 / Full event handler function
 */
export function createFullEventHandler(
	params: ICreateEventHandlerParams & {
		ctx: IEventHandlerContext;
	}
)
{
	const { ctx, todoEnforcer } = params;

	/**
	 * 完整的事件處理函式
	 * Full event handler function
	 *
	 * 包含需要 ctx 的額外邏輯
	 * Includes extra logic that requires ctx
	 */
	return async function fullEventHandler(input: { event: Event }): Promise<void>
	{
		const event = input.event;

		/** 讓背景任務管理器處理事件 / Let background manager handle events */
		params.backgroundManager.handleEvent(event);

		/** 會話創建時顯示橫幅 / Show banner on session creation */
		if (event.type === "session.created" && params.bannerHook)
		{
			await params.bannerHook.onSessionCreated();
		}

		/** 處理 session.idle 以進行 TODO 強制執行 / Handle session.idle for TODO enforcement */
		if (event.type === "session.idle" && todoEnforcer)
		{
			const sessionId = extractSessionId(event);
			if (sessionId)
			{
				try
				{
					/** 取得最近訊息以檢查未完成的 TODO / Get recent messages to check for incomplete todos */
					const messages = await ctx.client.session.messages({
						path: { id: sessionId },
					});

					if (messages.data)
					{
						/**
						 * 從訊息 parts 中提取文字內容
						 * Extract text content from message parts
						 */
						const recentMessages = messages.data.slice(-5).map((m) =>
						{
							const textContent = extractTextFromMessageParts(m.parts);
							return { content: textContent };
						});

						const result = await todoEnforcer.checkCompletion(recentMessages);

						if (result.hasIncompleteTodos && result.reminderMessage)
						{
							await ctx.client.tui?.showToast({
								body: {
									title: "Arise - Incomplete Tasks",
									message: "You have pending TODOs. Complete them before stopping.",
									variant: "warning",
									duration: 5000,
								},
							});
						}
					}
				} catch (error)
				{
					ctx.client.app?.log?.({
						body: {
							service: "arise",
							level: "warn",
							message: `TODO enforcement failed: ${getErrorMessage(error)}`,
						},
					});
				}
			}
		}

		/** 清除會話結束時的模型緩存 / Clear model cache when session ends */
		if (event.type === "session.deleted")
		{
			handleSessionDeleted(event);
		}
	};
}

/**
 * 從訊息 parts 中提取文字內容
 * Extract text content from message parts
 *
 * @param parts - 訊息 parts 陣列 / Message parts array
 * @returns 提取的文字內容 / Extracted text content
 */
function extractTextFromMessageParts(parts: unknown[]): string
{
	if (!parts || !Array.isArray(parts))
	{
		return "";
	}

	return parts
		.map((part) =>
		{
			if (typeof part === "object" && part !== null)
			{
				const partObj = part as { text?: string; type?: string; content?: string };
				return partObj.text ?? partObj.content ?? "";
			}
			return String(part);
		})
		.join("");
}


