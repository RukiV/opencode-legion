/**
 * 事件處理器
 * Event handler
 *
 * 處理 OpenCode event 鉤子的邏輯結構
 * Handles the logic structure of OpenCode event hook
 */

import type { PluginInput } from "@opencode-ai/plugin";
import type { Event, EventSessionCreated, EventSessionDeleted, EventSessionIdle } from "@opencode-ai/sdk";
import { EnumSessionEventType, SUPPORTED_SESSION_EVENT_TYPES, ISessionEventType } from "../types/enum-opencode";
import { clearSessionModel } from "../config/model-cache";
import { getErrorMessage } from "../utils/error";
import { ITSPickExtra, ITSTypeAndStringLiteral } from "ts-type";
import { formatAriseMsgLogBody } from "../utils/string/arise-message";

export type IEventHandlerContext = ITSPickExtra<PluginInput, "client">;

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
		eventType === EnumSessionEventType.SessionCreated ||
		eventType === EnumSessionEventType.SessionIdle ||
		eventType === EnumSessionEventType.SessionDeleted
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
export function handleSessionDeleted(event: EventSessionDeleted, params?: ICreateEventHandlerParams)
{
	const sessionId = extractSessionId(event);
	if (sessionId)
	{
		clearSessionModel(sessionId);
	}
}

/**
 * 處理會話創建事件
 * Handle session created event
 *
 * 顯示橫幅（如果有的話）
 * Shows banner (if available)
 */
async function handleSessionCreated(
	event: EventSessionCreated,
	params: Pick<ICreateEventHandlerParams, "bannerHook">
): Promise<void>
{
	await params.bannerHook?.onSessionCreated();
}

/**
 * 處理會話空閒事件
 * Handle session idle event
 *
 * 執行 TODO 檢查並顯示提醒（如果需要的話）
 * Performs TODO check and shows reminder (if needed)
 */
async function handleSessionIdle(
	event: EventSessionIdle,
	params: Pick<ICreateEventHandlerParams, "todoEnforcer"> & { ctx: IEventHandlerContext }
): Promise<void>
{
	if (!params.todoEnforcer)
	{
		return;
	}
	const sessionId = extractSessionId(event);
	if (!sessionId)
	{
		return;
	}
	try
	{
		/** 取得最近訊息以檢查未完成的 TODO / Get recent messages to check for incomplete todos */
		const messages = await params.ctx.client.session.messages({
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

			const result = await params.todoEnforcer.checkCompletion(recentMessages);

			if (result.hasIncompleteTodos && result.reminderMessage)
			{
				await params.ctx.client.tui?.showToast({
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
		params.ctx.client.app?.log?.({
			body: formatAriseMsgLogBody({
				message: `TODO enforcement failed: ${getErrorMessage(error)}`,
				level: "warn",
			}),
		});
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
	/**
	 * 完整的事件處理函式
	 * Full event handler function
	 */
	return async function fullEventHandler(input: { event: Event }): Promise<void>
	{
		const event = input.event;

		/** 讓背景任務管理器處理事件 / Let background manager handle events */
		params.backgroundManager.handleEvent(event);

		switch (event.type)
		{
			case EnumSessionEventType.SessionCreated:
				await handleSessionCreated(event, params);
				break;
			case EnumSessionEventType.SessionIdle:
				await handleSessionIdle(event, params);
				break;
			case EnumSessionEventType.SessionDeleted:
				handleSessionDeleted(event, params);
				break;
			default:
				// 未處理的事件類型 / No handler for other event types
				break;
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


