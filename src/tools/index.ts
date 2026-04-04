import { createCallAriseAgentTool } from './arise-summon';
import {
	createBackgroundCancelTool,
	createBackgroundOutputTool,
	createBackgroundStatusTool,
	createBackgroundTaskTool,
} from './arise-background';
import { createListModelsTool } from './arise-list-models';
import { createContinueTool } from './arise-continue';
import { createDebugTool } from './arise-debug';
import { createGitSummaryTool } from './arise-git-summary';
import { EnumAriseTools } from '../types/enums';
import { IAriseTools } from '../types/types';
import { BackgroundManager } from './lib/background-manager';
import type { PluginInput } from '@opencode-ai/plugin';
import type { IAriseConfig } from '../config/schema';
import { loadAriseConfig } from '../config/io';

/**
 * 建立所有插件工具
 * Create all plugin tools
 *
 * @see docs/tools/list-models.md
 * @param ctx - Plugin 上下文
 * @param backgroundManager - 背景任務管理器
 * @returns 所有 Arise 工具的物件
 */
export function createPluginTools(ctx: PluginInput, backgroundManager: BackgroundManager, config: IAriseConfig): IAriseTools
{
	return {
		/** 同步/非同步召喚 Shadow 工具 / Sync/async summon Shadow tool */
		[EnumAriseTools.ARISE_SYNC_SUMMON]: createCallAriseAgentTool(ctx, config),
		/** 啟動背景任務工具 / Launch background task tool */
		[EnumAriseTools.ARISE_ASYNC_BACKGROUND]: createBackgroundTaskTool(backgroundManager),
		/** 取得背景任務輸出工具 / Get background task output tool */
		[EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT]: createBackgroundOutputTool(backgroundManager),
		/** 列出背景任務狀態工具 / List background task status tool */
		[EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS]: createBackgroundStatusTool(backgroundManager),
		/** 取消背景任務工具 / Cancel background task tool */
		[EnumAriseTools.ARISE_ASYNC_BACKGROUND_CANCEL]: createBackgroundCancelTool(backgroundManager),
		/** 列出可用模型工具 / List available models tool @see docs/tools/list-models.md */
		[EnumAriseTools.ARISE_LIST_MODELS]: createListModelsTool(ctx),
		/** 主動繼續/重試失敗任務工具 / Actively continue/retry failed task tool */
		[EnumAriseTools.ARISE_CONTINUE]: createContinueTool(backgroundManager),
		/** 除錯控制工具 / Debug control tool */
		[EnumAriseTools.ARISE_DEBUG]: createDebugTool(),
		/** Git 狀態摘要工具 / Git status summary tool */
		[EnumAriseTools.ARISE_GIT_SUMMARY]: createGitSummaryTool(),
	} satisfies IAriseTools
}
