import type { ToolContext } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./background-manager";
import { EnumAriseTools, getAriseToolsConfigEntry } from "./tool-names";
import { tool2 } from '../types/opencode';

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
			/** 呼叫 BackgroundManager 的手動重試方法 / Call BackgroundManager's manual retry method */
			const result = await manager.manualRetry(args.task_id, args.force ?? false);
			return result;
		},
	});
}