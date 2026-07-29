import type { PluginInput } from "@opencode-ai/plugin";
import { formatAriseMsg } from "../utils/string/arise-message";
import { logArise2WithLevel } from "../utils/debug-control";

/**
 * 未完成 TODO 項目的模式
 * Patterns for incomplete TODO items
 *
 * 用於偵測訊息中是否有未完成的 TODO 項目
 * Used to detect incomplete TODO items in messages
 */
/**
 * 未完成 TODO 項目的模式
 * Patterns for incomplete TODO items
 *
 * 用於偵測訊息中是否有未完成的 TODO 項目
 * Used to detect incomplete TODO items in messages
 *
 * @patternMap
 *   pending/in_progress - 任務狀態標記
 *   checkbox - Markdown 核取方塊格式 `- [ ]` checkbox（未勾選）
 *   TODO/FIXME - 程式碼標記慣例
 */
const TODO_PATTERNS = [
	/\[pending\]/i,
	/\[in_progress\]/i,
	/- \[ \]/,
	/TODO:/i,
	/FIXME:/i,
];

/**
 * 已完成 TODO 項目的模式（目前未使用，預留擴展）
 * Patterns for completed TODO items (currently unused, reserved for extension)
 *
 * @note 預留用於未來擴展功能，例如自動標記已完成項目
 *       Reserved for future extension, e.g., auto-marking completed items
 */
const COMPLETION_PATTERNS = [
	/\[completed\]/i,
	/\[done\]/i,
	/- \[x\]/i,
];

/**
 * 建立 TODO 強制執行 Hook
 * Create TODO enforcer hook
 *
 * 檢查訊息中是否有未完成的 TODO 項目，並在有未完成項目時提醒使用者
 * Checks if there are incomplete TODO items in messages and reminds user when there are
 *
 * @param _ctx - Plugin 上下文（目前未使用）
 * @returns TODO 強制執行 Hook 物件
 */
export function createTodoEnforcerHook(_ctx: PluginInput)
{
	return {
		/**
		 * 檢查是否有未完成的 TODO
		 * Check for incomplete TODOs
		 *
		 * 掃描最近的 assistant 訊息，偵測是否有未完成的 TODO 項目
		 * Scans recent assistant messages to detect incomplete TODO items
		 *
		 * @param messages - 訊息陣列
		 * @returns 檢查結果，包含是否有未完成項目和提醒訊息
		 */
		async checkCompletion(messages: Array<{ content: string }>): Promise<{
			hasIncompleteTodos: boolean;
			reminderMessage?: string;
		}>
		{
			/**
			 * 只檢查最近 5 條有內容的訊息
			 * Only check the last 5 messages with content
			 *
			 * 避免掃描整個對話歷史，提昇效能
			 * Avoid scanning entire conversation history for performance
			 */
			const lastAssistantMessages = messages
				.filter((m) => m.content)
				.slice(-5);

			logArise2WithLevel("debug", () => [
				`[todo-enforcer]`,
				`checkCompletion: scanning ${lastAssistantMessages.length} messages (total: ${messages.length})`,
			]);

			/** 是否有待處理項目 / Whether there are pending items */
			let hasPending = false;
			/** 是否有進行中項目 / Whether there are in-progress items */
			let hasInProgress = false;

			/**
			 * 遍歷訊息偵測 TODO 模式
			 * Iterate through messages to detect TODO patterns
			 */
			for (const msg of lastAssistantMessages)
			{
				const content = msg.content;

				/**
				 * 先快速檢查是否有任何 TODO 模式
				 * First quickly check if any TODO pattern exists
				 */
				if (TODO_PATTERNS.some((p) => p.test(content)))
				{
					/**
					 * 分別檢查 pending 和 in_progress 狀態
					 * Check pending and in_progress status separately
					 *
					 * 使用更精確的模式匹配
					 * Use more precise pattern matching
					 */
					if (/\[pending\]/i.test(content) || /- \[ \]/.test(content))
					{
						hasPending = true;
					}
					if (/\[in_progress\]/i.test(content))
					{
						hasInProgress = true;
					}
				}
			}

			/** 只要有任一種類型的未完成項目就算數 / Any type of incomplete item counts */
			const hasIncompleteTodos = hasPending || hasInProgress;

			logArise2WithLevel("debug", () => [
				`[todo-enforcer]`,
				`checkCompletion: hasPending=${hasPending}, hasInProgress=${hasInProgress}, hasIncompleteTodos=${hasIncompleteTodos}`,
			]);

			/**
			 * 如果有未完成的 TODO，返回提醒訊息
			 * If there are incomplete TODOs, return a reminder message
			 */
			if (hasIncompleteTodos)
			{
				logArise2WithLevel("info", () => [
					`[todo-enforcer]`,
					`checkCompletion: incomplete TODOs detected (pending=${hasPending}, in_progress=${hasInProgress})`,
				]);

				return {
					hasIncompleteTodos: true,
					reminderMessage: formatAriseMsg(`Lord of Shadows notice: You have incomplete TODOs. ${
						hasInProgress ? "Tasks are in_progress." : ""
					} ${hasPending ? "Tasks are pending." : ""} Complete them before stopping.`),
				};
			}

			return { hasIncompleteTodos: false };
		},
	};
}
