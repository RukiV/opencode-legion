/**
 * 除錯工具
 * Debug tool
 *
 * 提供執行期開關除錯模式和設定日誌等級的功能
 * Provides runtime debug mode toggle and log level setting
 */

import { EnumAriseTools } from '../types/enums';
import { getAriseToolsConfigEntry } from '../agents/lib/arise-tools-utils';
import { tool2 } from '../types/types-opencode';
import
	{
		getDebugEnabled,
		setDebugEnabled,
		getLogLevel,
		setLogLevel,
		getDebugStatus,
	} from '../utils/debug-control';
import { formatAriseMsgSuccess, formatAriseMsgError } from '../utils/string/arise-message';
import type { ILogLevel } from '../types/enum-opencode';
import { createAgentToolListModels } from './arise-list-models';

/**
 * 建立除錯控制工具
 * Create debug control tool
 *
 * 允許在執行期開啟/關閉除錯模式，以及設定日誌級別
 * Allows enabling/disabling debug mode and setting log level at runtime
 */
export function createAgentToolDebug()
{
	const {
		description,
		args,
	} = getAriseToolsConfigEntry(EnumAriseTools.ARISE_DEBUG);

	return tool2({
		description,
		args,

		async execute(input)
		{
			const { enabled, level } = input as {
				enabled?: boolean;
				level?: ILogLevel;
			};

			try
			{
				// 處理 enabled 參數
				// Handle enabled parameter
				if (enabled !== undefined)
				{
					setDebugEnabled(enabled);
				}

				// 處理 level 參數
				// Handle level parameter
				if (level !== undefined)
				{
					setLogLevel(level);
				}

				// 取得目前狀態
				// Get current status
				const status = getDebugStatus();

				const messages: string[] = [];

				if (enabled !== undefined)
				{
					messages.push(`Debug mode: ${status.enabled ? "enabled" : "disabled"}`);
				}

				if (level !== undefined)
				{
					messages.push(`Log level: ${status.level}`);
				}

				// 如果沒有提供任何參數，顯示目前狀態
				// If no parameters provided, show current status
				if (enabled === undefined && level === undefined)
				{
					return formatAriseMsgSuccess(`Debug status:
- Enabled: ${status.enabled}
- Level: ${status.level}`);
				}

				return formatAriseMsgSuccess(messages);
			} catch (error)
			{
				return formatAriseMsgError(`Failed to update debug settings: ${error instanceof Error ? error.message : String(error)}`);
			}
		},
	});
}
