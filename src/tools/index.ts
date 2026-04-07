import { createAgentToolAriseSyncSummon } from './arise-summon';
import {
	createAgentToolAriseBackgroundCancel,
	createAgentToolAriseBackgroundOutput,
	createAgentToolAriseBackgroundStatus,
	createAgentToolAriseBackgroundTask,
} from './arise-background';
import { createAgentToolListModels } from './arise-list-models';
import { createAgentToolContinue } from './arise-continue';
import { createAgentToolDebug } from './arise-debug';
import { createAgentToolGitSummary } from './arise-git-summary';
import { createAgentToolAriseCollaborate } from './arise-collaborate';
import { EnumAriseTools, ALL_ARISE_TOOLS } from '../types/enums';
import { IAriseTools } from '../types/types';
import { BackgroundManager } from './lib/background-manager';
import type { PluginInput } from '@opencode-ai/plugin';
import type { IAriseConfig } from '../config/schema';
import { tsObjectEntries } from 'ts-type-object-entries';
import { IReturnTypeOfPluginToolArise } from '../types/types-opencode';
import { getActiveTools, getDisabledTools } from '../types/const-project';

/**
 * 建立所有插件工具
 * Create all plugin tools
 *
 * @see docs/tools/list-models.md
 * @param ctx - Plugin 上下文
 * @param backgroundManager - 背景任務管理器
 * @param config - Arise 配置 / Arise config
 * @returns 所有 Arise 工具的物件
 */
export function createPluginTools(ctx: PluginInput,
	backgroundManager: BackgroundManager,
	config: IAriseConfig,
): IAriseTools
{
	/** 先建立所有工具物件 */
	const allTools = {
		/** 同步/非同步召喚 Shadow 工具 / Sync/async summon Shadow tool */
		[EnumAriseTools.ARISE_SYNC_SUMMON]: () => createAgentToolAriseSyncSummon(ctx, config, backgroundManager),
		/** 啟動背景任務工具 / Launch background task tool */
		[EnumAriseTools.ARISE_ASYNC_BACKGROUND]: () => createAgentToolAriseBackgroundTask(backgroundManager),
		/** 取得背景任務輸出工具 / Get background task output tool */
		[EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT]: () => createAgentToolAriseBackgroundOutput(backgroundManager),
		/** 列出背景任務狀態工具 / List background task status tool */
		[EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS]: () => createAgentToolAriseBackgroundStatus(backgroundManager, ctx),
		/** 取消背景任務工具 / Cancel a running background task */
		[EnumAriseTools.ARISE_ASYNC_BACKGROUND_CANCEL]: () => createAgentToolAriseBackgroundCancel(backgroundManager),
		/** 列出可用模型工具 / List available models tool @see docs/tools/list-models.md */
		[EnumAriseTools.ARISE_LIST_MODELS]: () => createAgentToolListModels(ctx),
		/** 主動繼續/重試失敗任務工具 / Actively continue/retry failed task tool */
		[EnumAriseTools.ARISE_CONTINUE]: () => createAgentToolContinue(backgroundManager),
		/** 除錯控制工具 / Debug control tool */
		[EnumAriseTools.ARISE_DEBUG]: () => createAgentToolDebug(),
		/** Git 狀態摘要工具 / Git status summary tool */
		[EnumAriseTools.ARISE_GIT_SUMMARY]: () => createAgentToolGitSummary(),
		/** 多代理協作工具 / Multi-agent collaboration tool */
		[EnumAriseTools.ARISE_COLLABORATE]: () => createAgentToolAriseCollaborate(ctx, config, backgroundManager),
	} as {
		[k in EnumAriseTools]: () => IReturnTypeOfPluginToolArise<k>;
	};

	const disabledTools = getDisabledTools(config);

	/**
	 * 過濾掉 Code-level 禁用的工具
	 * Filter out code-level disabled tools
	 */
	const filteredTools = tsObjectEntries(allTools).reduce((entries, [key]) => {
			if (!disabledTools.includes(key))
			{
				entries[key] = allTools[key]() as any;
			}

			return entries
		}, {} as IAriseTools) as IAriseTools;

	return filteredTools;
}
