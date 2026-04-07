import type { ToolContext } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./lib/background-manager";
import { EnumAriseTools } from "../types/enums";
import { getAriseToolsConfigEntry } from "../agents/lib/arise-tools-utils";
import { tool2 } from '../types/types-opencode';
import { consoleLoggerWithLevel, logArise2WithLevel } from "../utils/debug-control";
import { createAgentToolListModels } from './arise-list-models';

/**
 * 建立主動繼續工具
 * Create continue tool
 *
 * 允許 agents 主動觸發任務重試
 * Allows agents to manually trigger task retry
 *
 * @param manager - BackgroundManager 實例
 */
export function createAgentToolContinue(manager: BackgroundManager)
{
	const {
		description,
		args,
	} = getAriseToolsConfigEntry(EnumAriseTools.ARISE_CONTINUE);

	return tool2<EnumAriseTools.ARISE_CONTINUE>({
		description,
		args,

		async execute(args)
		{
			const { task_id, force, auto_resume, background_auto_resume } = args;

			/** 優先嘗試用 taskId / Try taskId first */
			let targetTaskId = task_id;

			/** 如果是 sessionId 格式，嘗試用 sessionId 查詢 */
			if (task_id.startsWith("ses_"))
			{
				const task = manager.getTaskBySessionId(task_id);
				if (task)
				{
					targetTaskId = task.id;
				}
			}

			/** 呼叫 BackgroundManager 的手動重試方法 / Call BackgroundManager's manual retry method */
			const result = await manager.manualRetry(
				targetTaskId,
				force ?? false,
				auto_resume,
				background_auto_resume,
			);

			return result;
		},
	});
}
