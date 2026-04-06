/**
 * Arise 工具簡短描述
 * Arise tool short descriptions
 *
 * 集中管理工具描述，避免循環依賴
 * Centralized tool descriptions to avoid circular dependencies
 *
 * @note 此檔案為純資料定義，不引用 ARISE_TOOLS 以避免循環依賴
 * @note This file is pure data definition, does not import ARISE_TOOLS to avoid circular dependency
 */
import { EnumAriseTools, ALL_ARISE_TOOLS } from '../../types/enums';

/**
 * 工具名稱到簡短描述的映射
 * Tool name to short description mapping
 *
 * 統一使用 ARISE_TOOLS.shortDescription 的完整內容
 * Unified using ARISE_TOOLS.shortDescription content
 */
export const TOOL_SHORT_DESCRIPTIONS: Record<EnumAriseTools, string> = {
	[EnumAriseTools.ARISE_SYNC_SUMMON]: "Summon a shadow agent - sync (returns result) or background (fire-and-forget)",
	[EnumAriseTools.ARISE_ASYNC_BACKGROUND]: "Launch background shadow agent - trackable, retrievable results",
	[EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT]: "Retrieve the completed output from a background shadow agent task",
	[EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS]: "List all background shadow agent tasks and their current status",
	[EnumAriseTools.ARISE_ASYNC_BACKGROUND_CANCEL]: "Cancel a currently running background shadow agent task.",
	[EnumAriseTools.ARISE_LIST_MODELS]: "List all available models from configured providers.",
	[EnumAriseTools.ARISE_CONTINUE]: "Actively continue/resume a failed task manually",
	[EnumAriseTools.ARISE_DEBUG]: "Control debug mode (enable/disable/set level)",
	[EnumAriseTools.ARISE_GIT_SUMMARY]: "Get Git status summary (status + diff stat + recent log)",
	[EnumAriseTools.ARISE_COLLABORATE]: "Multi-agent collaboration - planning, parallel, or chain execution",
};

/**
 * 取得工具列表的格式化字串 (用於 ShadowMonarch prompt)
 * Format tools list for ShadowMonarch prompt
 */
export function getAriseToolsMarkdown(): string
{
	return ALL_ARISE_TOOLS
		.map((tool) => `- ${tool}: ${TOOL_SHORT_DESCRIPTIONS[tool]}`)
		.join("\n");
}
