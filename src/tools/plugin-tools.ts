import { createCallAriseAgentTool } from './call-arise-agent';
import {
	createBackgroundCancelTool,
	createBackgroundOutputTool,
	createBackgroundStatusTool,
	createBackgroundTaskTool,
} from './background-tools';
import { EnumAriseTools, IAriseTools } from './tool-names';
import { BackgroundManager } from './background-manager';
import type { PluginInput } from '@opencode-ai/plugin';

export function createPluginTools(ctx: PluginInput, backgroundManager: BackgroundManager): IAriseTools
{
	return {
		[EnumAriseTools.ARISE_SUMMON]: createCallAriseAgentTool(ctx),
		[EnumAriseTools.ARISE_BACKGROUND]: createBackgroundTaskTool(backgroundManager),
		[EnumAriseTools.ARISE_BACKGROUND_OUTPUT]: createBackgroundOutputTool(backgroundManager),
		[EnumAriseTools.ARISE_BACKGROUND_STATUS]: createBackgroundStatusTool(backgroundManager),
		[EnumAriseTools.ARISE_BACKGROUND_CANCEL]: createBackgroundCancelTool(backgroundManager),
	} satisfies IAriseTools
}
