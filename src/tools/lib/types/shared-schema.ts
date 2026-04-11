import { z } from "zod";
import { EnumAriseTools } from '../../../types/enums';
import { EnumShadowAgentPermissionKey } from '../../../types/types-opencode';

/**
 * 召喚工具共用 args
 * Shared args for summon tools
 *
 * prompt 和 model 的描述在 ARISE_SUMMON / ARISE_BACKGROUND 之間一致
 * prompt and model descriptions are consistent across ARISE_SUMMON / ARISE_BACKGROUND
 */
export const SHARED_SUMMON_ARGS = {
	prompt: z
		.string()
		.meta({ description: "The task for the shadow agent (be specific)" }),
	model: z
		.string()
		.meta({ description: "Override model for this shadow agent (format: provider/model, e.g. opencode/big-pickle, or AUTO to use parent task's model)" })
		.optional(),
	/** 召喚工具共用 description arg 的描述文字 / Shared description arg text for summon tools */
	description: z
		.string()
		.meta({ description: "Short description (3-5 words, used in tracking output and background task status)" }),
	/** 現有 session ID（用於繼續使用現有的 session）/ Existing session ID (for continuing existing session) */
	session_id: z
		.string()
		.meta({ description: "Existing session ID to reuse (continue existing session instead of creating new one)" })
		.optional(),
	/** 工具權限控制（控制子代理可用工具）/ Tool permission control (controls sub-agent available tools) */
	tools: z
		.record(z.union([
				z.enum(EnumAriseTools),
				z.enum(EnumShadowAgentPermissionKey),
				// z.string(),
			]),
			z.literal(false),
		)
		.meta({
			description: "Tool permission control: { \"toolName\": true/false }. E.g., { \"todowrite\": false, \"task\": false } to disable tools",
			title: "Tools Config",
		})
		.optional(),
};

/**
 * Git 摘要工具參數 Zod raw shape
 * Git summary tool args Zod raw shape
 *
 * 可直接用於 ARISE_TOOLS 的 args 欄位
 * Can be directly used in ARISE_TOOLS args field
 */
export const GIT_SUMMARY_ARGS = {
	/** 顯示近期 commit 數量 / Number of recent commits to show */
	log_count: z
		.number()
		.meta({
			description: "Number of recent commits to show (default: 10)",
			title: "Log Count",
		})
		.optional()
		.default(10),
	/** 是否包含 diff --stat / Include diff --stat output */
	diff_stat: z
		.boolean()
		.meta({
			description: "Include diff --stat output (default: true)",
			title: "Diff Stat",
		})
		.optional()
		.default(true),
	/** 目標目錄路徑（相對於專案根目錄或絕對路徑）/ Target directory path (relative to project root or absolute path) */
	cwd: z
		.string()
		.meta({
			description: "Target directory to run git commands in (relative to project root or absolute path). Defaults to current working directory.",
			title: "Working Directory",
		})
		.optional(),
} as const;
