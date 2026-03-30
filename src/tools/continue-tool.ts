import type { ToolContext } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./lib/background-manager";
import { EnumAriseTools } from "../types/enums";
import { getAriseToolsConfigEntry } from "../agents/shadows";
import { tool2 } from '../types/types-opencode';
import { consoleLoggerWithLevel } from "../utils/debug-control";

/**
 * 建立主動繼續工具
 * Create continue tool
 *
 * 允許 agents 主動觸發任務重試
 * Allows agents to manually trigger task retry
 *
 * @param manager - BackgroundManager 實例
 */
export function createContinueTool(manager: BackgroundManager) {
	const {
		description,
		args,
	} = getAriseToolsConfigEntry(EnumAriseTools.ARISE_CONTINUE);

	return tool2<EnumAriseTools.ARISE_CONTINUE>({
		description,
		args,

		async execute(args) {
			/**
			 * 除錯日誌：開始執行手動重試
			 * Debug log: Start manual retry execution
			 */
			consoleLoggerWithLevel.debug(`[continue-tool] Starting manual retry for task: ${args.task_id}, force: ${args.force ?? false}`);

			/** 呼叫 BackgroundManager 的手動重試方法 / Call BackgroundManager's manual retry method */
			const result = await manager.manualRetry(
				args.task_id,
				args.force ?? false,
				args.auto_resume,
				args.background_auto_resume
			);

			/**
			 * 除錯日誌：手動重試結果
			 * Debug log: Manual retry result
			 */
			consoleLoggerWithLevel.debug(`[continue-tool] Manual retry result for ${args.task_id}: ${result}`);

			return result;
		},
	});
}