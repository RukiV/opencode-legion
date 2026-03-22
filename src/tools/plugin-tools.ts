import { createCallAriseAgentTool } from './call-arise-agent';
import {
	createBackgroundCancelTool,
	createBackgroundOutputTool,
	createBackgroundStatusTool,
	createBackgroundTaskTool,
} from './background-tools';
import { createListModelsTool } from './list-models';
import { EnumAriseTools } from './tool-names';
import { IAriseTools } from '../types/types';
import { BackgroundManager } from './background-manager';
import type { PluginInput } from '@opencode-ai/plugin';

/**
 * 建立所有插件工具
 * Create all plugin tools
 *
 * 集中建立並返回所有 Arise 工具
 * Centralized creation and return of all Arise tools
 *
 * @param ctx - Plugin 上下文
 * @param backgroundManager - 背景任務管理器
 * @returns 所有 Arise 工具的物件
 */
export function createPluginTools(ctx: PluginInput, backgroundManager: BackgroundManager): IAriseTools
{
	return {
		/** 同步/非同步召喚 Shadow 工具 / Sync/async summon Shadow tool */
		[EnumAriseTools.ARISE_SUMMON]: createCallAriseAgentTool(ctx),
		/** 啟動背景任務工具 / Launch background task tool */
		[EnumAriseTools.ARISE_BACKGROUND]: createBackgroundTaskTool(backgroundManager),
		/** 取得背景任務輸出工具 / Get background task output tool */
		[EnumAriseTools.ARISE_BACKGROUND_OUTPUT]: createBackgroundOutputTool(backgroundManager),
		/** 列出背景任務狀態工具 / List background task status tool */
		[EnumAriseTools.ARISE_BACKGROUND_STATUS]: createBackgroundStatusTool(backgroundManager),
		/** 取消背景任務工具 / Cancel background task tool */
		[EnumAriseTools.ARISE_BACKGROUND_CANCEL]: createBackgroundCancelTool(backgroundManager),
		/** 列出可用模型工具 / List available models tool */
		[EnumAriseTools.ARISE_LIST_MODELS]: createListModelsTool(ctx),
	} satisfies IAriseTools
}
