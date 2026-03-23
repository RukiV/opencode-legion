/** @noUnusedParameters:false */
/// <reference types="bun" />
/// <reference types="bun-types" />
import { describe, expect, it, test } from "bun:test";
import {
	findLastUserMessage,
	findLastAssistantMessage,
	findMessageById,
	extractResumeConfig,
	createRecoveryPrompt,
	detectErrorType,
	isRecoverableError,
	getErrorTypeTitle,
	getErrorTypeMessage,
	extractTextFromMessage,
	messageHasToolCall,
	getToolCallsFromMessage,
	isValidMessageInfo,
	isAssistantMessage,
	hasError,
	EnumRecoveryErrorType,
	type IMessageData,
	type IMessageInfo,
} from "./session-utils";

describe("Session Utils", () => {
	/**
	 * 測試資料工廠
	 * Test data factory
	 */
	const createMockMessage = (
		role: string,
		id: string,
		overrides?: Partial<IMessageData>
	): IMessageData => ({
		info: {
			id,
			role,
			sessionID: "session-123",
			parentID: "parent-456",
			agent: "monarch",
			model: "gpt-4",
			tools: [ "tool1", "tool2" ],
		},
		parts: [
			{ type: "text", text: `Message from ${role}` },
		],
		...overrides,
	});

	describe("findLastUserMessage", () => {
		it("應該找到最後一個使用者訊息 / should find last user message", () => {
			const messages: IMessageData[] = [
				createMockMessage("user", "msg-1"),
				createMockMessage("assistant", "msg-2"),
				createMockMessage("user", "msg-3"),
			];

			const result = findLastUserMessage(messages);

			expect(result).toBeDefined();
			expect(result?.info?.id).toBe("msg-3");
			expect(result?.info?.role).toBe("user");
		});

		it("當沒有使用者訊息時應該返回 undefined / should return undefined when no user messages", () => {
			const messages: IMessageData[] = [
				createMockMessage("assistant", "msg-1"),
				createMockMessage("system", "msg-2"),
			];

			const result = findLastUserMessage(messages);

			expect(result).toBeUndefined();
		});

		it("當陣列為空時應該返回 undefined / should return undefined for empty array", () => {
			const result = findLastUserMessage([]);
			expect(result).toBeUndefined();
		});
	});

	describe("findLastAssistantMessage", () => {
		it("應該找到最後一個助手訊息 / should find last assistant message", () => {
			const messages: IMessageData[] = [
				createMockMessage("assistant", "msg-1"),
				createMockMessage("user", "msg-2"),
				createMockMessage("assistant", "msg-3"),
			];

			const result = findLastAssistantMessage(messages);

			expect(result).toBeDefined();
			expect(result?.info?.id).toBe("msg-3");
			expect(result?.info?.role).toBe("assistant");
		});

		it("當沒有助手訊息時應該返回 undefined / should return undefined when no assistant messages", () => {
			const messages: IMessageData[] = [
				createMockMessage("user", "msg-1"),
				createMockMessage("user", "msg-2"),
			];

			const result = findLastAssistantMessage(messages);

			expect(result).toBeUndefined();
		});
	});

	describe("findMessageById", () => {
		it("應該根據 ID 找到訊息 / should find message by ID", () => {
			const messages: IMessageData[] = [
				createMockMessage("user", "msg-1"),
				createMockMessage("assistant", "msg-2"),
			];

			const result = findMessageById(messages, "msg-2");

			expect(result).toBeDefined();
			expect(result?.info?.id).toBe("msg-2");
		});

		it("當 ID 不存在時應該返回 undefined / should return undefined when ID not found", () => {
			const messages: IMessageData[] = [
				createMockMessage("user", "msg-1"),
			];

			const result = findMessageById(messages, "nonexistent");

			expect(result).toBeUndefined();
		});
	});

	describe("extractResumeConfig", () => {
		it("應該從使用者訊息提取恢復配置 / should extract resume config from user message", () => {
			const userMessage = createMockMessage("user", "msg-1");
			const sessionID = "session-abc";

			const result = extractResumeConfig(userMessage, sessionID);

			expect(result).toMatchObject({
				sessionID: "session-abc",
				agent: "monarch",
				model: "gpt-4",
				tools: [ "tool1", "tool2" ],
			});
		});

		it("當使用者訊息為 undefined 時應該只返回 sessionID / should return only sessionID when user message is undefined", () => {
			const sessionID = "session-abc";

			const result = extractResumeConfig(undefined, sessionID);

			expect(result).toMatchObject({
				sessionID: "session-abc",
			});
			expect(result.agent).toBeUndefined();
			expect(result.model).toBeUndefined();
			expect(result.tools).toBeUndefined();
		});
	});

	describe("createRecoveryPrompt", () => {
		it("應該返回預設恢復文字 / should return default recovery text", () => {
			const result = createRecoveryPrompt();

			expect(result).toBe("[session recovered - continuing previous task]");
		});

		it("應該返回自訂恢復文字 / should return custom recovery text", () => {
			const customText = "Custom recovery message";
			const result = createRecoveryPrompt(customText);

			expect(result).toBe(customText);
		});
	});

	describe("detectErrorType", () => {
		it("應該檢測 tool_result_missing 錯誤 / should detect tool_result_missing error", () => {
			const error = new Error("tool_result_missing: Tool result was cancelled");

			const result = detectErrorType(error);

			expect(result).toBe(EnumRecoveryErrorType.ToolResultMissing);
		});

		it("應該檢測 unavailable_tool 錯誤 / should detect unavailable_tool error", () => {
			const error = new Error("unavailable_tool: Tool does not exist");

			const result = detectErrorType(error);

			expect(result).toBe(EnumRecoveryErrorType.UnavailableTool);
		});

		it("應該檢測 thinking_block_order 錯誤 / should detect thinking_block_order error", () => {
			const error = new Error("Invalid thinking block order");

			const result = detectErrorType(error);

			expect(result).toBe(EnumRecoveryErrorType.ThinkingBlockOrder);
		});

		it("應該檢測 thinking_disabled_violation 錯誤 / should detect thinking_disabled_violation error", () => {
			const error = new Error("thinking is disabled but thinking blocks were found");

			const result = detectErrorType(error);

			expect(result).toBe(EnumRecoveryErrorType.ThinkingDisabledViolation);
		});

		it("應該檢測 assistant_prefill_unsupported 錯誤 / should detect assistant_prefill_unsupported error", () => {
			const error = new Error("Prefill not supported");

			const result = detectErrorType(error);

			expect(result).toBe(EnumRecoveryErrorType.AssistantPrefillUnsupported);
		});

		it("當錯誤無法識別時應該返回 null / should return null for unrecognized errors", () => {
			const error = new Error("Some random error");

			const result = detectErrorType(error);

			expect(result).toBeNull();
		});

		it("應該處理非 Error 類型的錯誤 / should handle non-Error type errors", () => {
			const result = detectErrorType("tool_result_missing");

			expect(result).toBe(EnumRecoveryErrorType.ToolResultMissing);
		});
	});

	describe("isRecoverableError", () => {
		it("當錯誤可恢復時應該返回 true / should return true for recoverable errors", () => {
			const error = new Error("tool_result_missing: something");

			expect(isRecoverableError(error)).toBe(true);
		});

		it("當錯誤不可恢復時應該返回 false / should return false for non-recoverable errors", () => {
			const error = new Error("Some random error");

			expect(isRecoverableError(error)).toBe(false);
		});
	});

	describe("getErrorTypeTitle", () => {
		it("應該返回正確的錯誤類型標題 / should return correct error type title", () => {
			expect(getErrorTypeTitle(EnumRecoveryErrorType.ToolResultMissing)).toBe("Tool Crash Recovery");
			expect(getErrorTypeTitle(EnumRecoveryErrorType.UnavailableTool)).toBe("Tool Recovery");
			expect(getErrorTypeTitle(EnumRecoveryErrorType.ThinkingBlockOrder)).toBe("Thinking Block Recovery");
			expect(getErrorTypeTitle(EnumRecoveryErrorType.ThinkingDisabledViolation)).toBe("Thinking Strip Recovery");
			expect(getErrorTypeTitle(EnumRecoveryErrorType.AssistantPrefillUnsupported)).toBe("Prefill Unsupported");
		});
	});

	describe("getErrorTypeMessage", () => {
		it("應該返回正確的錯誤類型訊息 / should return correct error type message", () => {
			expect(getErrorTypeMessage(EnumRecoveryErrorType.ToolResultMissing)).toBe("Injecting cancelled tool results...");
			expect(getErrorTypeMessage(EnumRecoveryErrorType.UnavailableTool)).toBe("Recovering from unavailable tool call...");
			expect(getErrorTypeMessage(EnumRecoveryErrorType.ThinkingBlockOrder)).toBe("Fixing message structure...");
			expect(getErrorTypeMessage(EnumRecoveryErrorType.ThinkingDisabledViolation)).toBe("Stripping thinking blocks...");
			expect(getErrorTypeMessage(EnumRecoveryErrorType.AssistantPrefillUnsupported)).toBe("Prefill not supported; continuing without recovery.");
		});
	});

	describe("extractTextFromMessage", () => {
		it("應該從訊息中提取文字內容 / should extract text content from message", () => {
			const message: IMessageData = {
				parts: [
					{ type: "text", text: "Hello" },
					{ type: "text", text: "World" },
				],
			};

			const result = extractTextFromMessage(message);

			expect(result).toBe("Hello\nWorld");
		});

		it("當沒有文字 parts 時應該返回空字串 / should return empty string when no text parts", () => {
			const message: IMessageData = {
				parts: [
					{ type: "image", url: "http://example.com/image.png" },
				],
			};

			const result = extractTextFromMessage(message);

			expect(result).toBe("");
		});

		it("當 parts 為空時應該返回空字串 / should return empty string when parts is empty", () => {
			const message: IMessageData = { parts: [] };

			const result = extractTextFromMessage(message);

			expect(result).toBe("");
		});

		it("當 parts 為 undefined 時應該返回空字串 / should return empty string when parts is undefined", () => {
			const message: IMessageData = {};

			const result = extractTextFromMessage(message);

			expect(result).toBe("");
		});
	});

	describe("messageHasToolCall", () => {
		it("當訊息包含特定工具呼叫時應該返回 true / should return true when message has specific tool call", () => {
			const message: IMessageData = {
				parts: [
					{ type: "tool_invoke", tool: "myTool" },
					{ type: "text", text: "Some text" },
				],
			};

			const result = messageHasToolCall(message, "myTool");

			expect(result).toBe(true);
		});

		it("當訊息不包含特定工具呼叫時應該返回 false / should return false when message doesn't have specific tool call", () => {
			const message: IMessageData = {
				parts: [
					{ type: "tool_invoke", tool: "otherTool" },
					{ type: "text", text: "Some text" },
				],
			};

			const result = messageHasToolCall(message, "myTool");

			expect(result).toBe(false);
		});

		it("當沒有 parts 時應該返回 false / should return false when no parts", () => {
			const message: IMessageData = {};

			const result = messageHasToolCall(message, "myTool");

			expect(result).toBe(false);
		});
	});

	describe("getToolCallsFromMessage", () => {
		it("應該從訊息中提取所有工具呼叫 / should extract all tool calls from message", () => {
			const message: IMessageData = {
				parts: [
					{ type: "tool_invoke", tool: "tool1" },
					{ type: "tool_invoke", tool: "tool2" },
					{ type: "text", text: "Some text" },
				],
			};

			const result = getToolCallsFromMessage(message);

			expect(result).toEqual([ "tool1", "tool2" ]);
		});

		it("當沒有工具呼叫時應該返回空陣列 / should return empty array when no tool calls", () => {
			const message: IMessageData = {
				parts: [
					{ type: "text", text: "Some text" },
				],
			};

			const result = getToolCallsFromMessage(message);

			expect(result).toEqual([]);
		});

		it("當 parts 為 undefined 時應該返回空陣列 / should return empty array when parts is undefined", () => {
			const message: IMessageData = {};

			const result = getToolCallsFromMessage(message);

			expect(result).toEqual([]);
		});
	});

	describe("isValidMessageInfo", () => {
		it("當訊息資訊包含必要欄位時應該返回 true / should return true when message info has required fields", () => {
			const info: IMessageInfo = {
				sessionID: "session-123",
				id: "msg-456",
			};

			expect(isValidMessageInfo(info)).toBe(true);
		});

		it("當缺少 sessionID 時應該返回 false / should return false when sessionID is missing", () => {
			const info: IMessageInfo = {
				id: "msg-456",
			};

			expect(isValidMessageInfo(info)).toBe(false);
		});

		it("當缺少 id 時應該返回 false / should return false when id is missing", () => {
			const info: IMessageInfo = {
				sessionID: "session-123",
			};

			expect(isValidMessageInfo(info)).toBe(false);
		});
	});

	describe("isAssistantMessage", () => {
		it("當角色為 assistant 時應該返回 true / should return true when role is assistant", () => {
			const info: IMessageInfo = {
				role: "assistant",
				sessionID: "session-123",
				id: "msg-456",
			};

			expect(isAssistantMessage(info)).toBe(true);
		});

		it("當角色為 user 時應該返回 false / should return false when role is user", () => {
			const info: IMessageInfo = {
				role: "user",
				sessionID: "session-123",
				id: "msg-456",
			};

			expect(isAssistantMessage(info)).toBe(false);
		});

		it("當角色為 undefined 時應該返回 false / should return false when role is undefined", () => {
			const info: IMessageInfo = {
				sessionID: "session-123",
				id: "msg-456",
			};

			expect(isAssistantMessage(info)).toBe(false);
		});
	});

	describe("hasError", () => {
		it("當包含錯誤時應該返回 true / should return true when has error", () => {
			const info: IMessageInfo = {
				sessionID: "session-123",
				id: "msg-456",
				error: new Error("Something went wrong"),
			};

			expect(hasError(info)).toBe(true);
		});

		it("當錯誤為 null 時應該返回 false / should return false when error is null", () => {
			const info: IMessageInfo = {
				sessionID: "session-123",
				id: "msg-456",
				error: null,
			};

			expect(hasError(info)).toBe(false);
		});

		it("當錯誤為 undefined 時應該返回 false / should return false when error is undefined", () => {
			const info: IMessageInfo = {
				sessionID: "session-123",
				id: "msg-456",
			};

			expect(hasError(info)).toBe(false);
		});
	});
});
