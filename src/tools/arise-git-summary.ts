/**
 * Git 狀態摘要工具（OpenCode 包裝層）
 * Git status summary tool (OpenCode wrapper)
 *
 * 核心邏輯位於 src/utils/git-summary.ts，此檔案僅做 OpenCode 工具框架的整合
 * Core logic is in src/utils/git-summary.ts; this file only integrates with OpenCode tool framework
 */
import { EnumAriseTools } from '../types/enums';
import { getAriseToolsConfigEntry } from '../agents/shadows';
import { tool2 } from '../types/types-opencode';
import { formatAriseMsgError, formatAriseMsgSuccess } from '../utils/string/arise-message';
import { getGitSummary, formatGitSummary } from '../utils/git-summary';

/**
 * 建立 Git 狀態摘要工具
 * Create Git status summary tool
 *
 * @see docs/shadow-summoning-methods.md
 */
export function createGitSummaryTool()
{
	const {
		description,
		args,
	} = getAriseToolsConfigEntry(EnumAriseTools.ARISE_GIT_SUMMARY);

	return tool2({
		description,
		args,

		async execute(args)
		{
			try
			{
				const result = getGitSummary({
					log_count: args.log_count,
					diff_stat: args.diff_stat,
				});

				return formatAriseMsgSuccess(`Git Summary:\n\n${formatGitSummary(result)}`);
			}
			catch (error)
			{
				const msg = error instanceof Error ? error.message : String(error);
				return formatAriseMsgError(`Failed to get git summary: ${msg}`);
			}
		},
	});
}
