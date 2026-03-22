import { z, ZodEnum, ZodString, ZodOptional, ZodBoolean } from "zod";
import {
	ALLOWED_SHADOWS,
	BACKGROUND_SHADOWS,
} from "../agents/shadow-names";
import { ITSRequiredWith } from "ts-type";

/**
 * Arise Tools 列舉 (Enum)
 * 定義所有 OpencodeArise 插件提供的工具 key
 *
 * Enum of all Arise tool names
 */
export enum EnumAriseTools {
	/** 同步或非同步召喚 shadow士兵執行任務 / Invoke a shadow synchronously or in background */
	ARISE_SUMMON = "arise_summon",
	/** 以背景任務方式啟動 shadow士兵 (平行執行) / Launch shadow as background task (parallel) */
	ARISE_BACKGROUND = "arise_background",
	/** 取得背景任務的輸出結果 / Get result from background task */
	ARISE_BACKGROUND_OUTPUT = "arise_background_output",
	/** 列出所有背景任務及其狀態 / List all background tasks and their status */
	ARISE_BACKGROUND_STATUS = "arise_background_status",
	/** 取消執行中的背景任務 / Cancel a running background task */
	ARISE_BACKGROUND_CANCEL = "arise_background_cancel",
	/** 列出所有可用的模型 / List all available models @see docs/tools/list-models.md */
	ARISE_LIST_MODELS = "arise_list_models",
}

export const ALL_ARISE_TOOLS = [
	EnumAriseTools.ARISE_SUMMON,
	EnumAriseTools.ARISE_BACKGROUND,
	EnumAriseTools.ARISE_BACKGROUND_OUTPUT,
	EnumAriseTools.ARISE_BACKGROUND_STATUS,
	EnumAriseTools.ARISE_BACKGROUND_CANCEL,
	EnumAriseTools.ARISE_LIST_MODELS,
] as const satisfies EnumAriseTools[];

/**
 * only for valid ARISE_TOOLS
 *
 * @internal
 */
interface I_AriseToolsConfigEntry
{
	description?: string;
	shortDescription: string;
	args: unknown;
}

/**
 * Arise Tools 描述 (Descriptions)
 * 包含所有工具的完整描述和簡短描述
 *
 * Tool descriptions for Arise plugins
 *
 */
export const ARISE_TOOLS = {
	[EnumAriseTools.ARISE_SUMMON]: {
		description: `Invoke a shadow synchronously or in background

Available shadows:
- beru: Fast codebase scout (exploration, grep, file discovery)
- igris: Precise implementation (code changes, running commands)
- bellion: Strategic planning (architecture, complex analysis)
- tusk: UI/UX specialist (frontend, styling, components)
- tank: External research (docs, web search, examples)
- shadow-sovereign: Deep reasoning (complex debugging, architecture decisions)

Use run_in_background=true for parallel execution (recommended for exploration/research).
Use run_in_background=false when you need the result immediately.

Model override: Use the 'model' parameter to specify a different model for this shadow (format: provider/model, e.g. opencode/big-pickle). If not specified, each shadow uses its default model.`,
		shortDescription: "Invoke a shadow synchronously or in background",

		args: {
			shadow: z
				.enum(ALLOWED_SHADOWS)
				.describe("Which shadow to summon"),
			prompt: z
				.string()
				.describe("The task/question for the shadow (be specific)"),
			run_in_background: z
				.boolean()
				.describe("true = async (parallel), false = sync (wait for result)"),
			description: z
				.string()
				.optional()
				.describe("Short description of the task (for tracking)"),
			model: z
				.string()
				.optional()
				.describe("Override model for this shadow (format: provider/model, e.g. opencode/big-pickle)"),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND]: {
		description: `Launch a shadow soldier as a background task for parallel execution.

Best for:
- beru: Parallel codebase exploration
- tank: Parallel external research
- bellion: Parallel planning/analysis

Returns a task_id immediately. Use arise_background_output to get results later.`,
		shortDescription: "Launch shadow soldier as background task (parallel)",

		args: {
			shadow: z
				.enum(BACKGROUND_SHADOWS)
				.describe("Which shadow to run in background"),
			prompt: z
				.string()
				.describe("The task for the shadow"),
			description: z
				.string()
				.describe("Short description (3-5 words)"),
			model: z
				.string()
				.optional()
				.describe("Override model for this shadow (format: provider/model, e.g. opencode/big-pickle)"),
		},
	} as const,
	[EnumAriseTools.ARISE_BACKGROUND_OUTPUT]: {
		// description: `Get the output from a background shadow task.`,
		shortDescription: "Get the output from a background shadow task.",

		args: {
			task_id: z
				.string()
				.describe("The task ID from arise_background"),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND_STATUS]: {
		// description: `List all background tasks and their status.`,
		shortDescription: "List all background tasks and their status.",

		args: {
			current_session_only: z
				.boolean()
				.optional()
				.describe("Only show tasks from current session"),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND_CANCEL]: {
		// description: `Cancel a running background task.`,
		shortDescription: "Cancel a running background task",

		args: {
			task_id: z
				.string()
				.describe("The task ID to cancel"),
		},
	},
	/**
	 * 列出所有可用的模型
	 * List all available models
	 *
	 * @see docs/tools/list-models.md
	 */
	[EnumAriseTools.ARISE_LIST_MODELS]: {
		description: `List all available models from configured providers.

Use this tool to find the exact model name when you need to specify a model for a shadow.

Returns a formatted list of all available models in the format provider/modelID.`,
		shortDescription: "List all available models from configured providers.",

		args: {
			provider: z
				.string()
				.optional()
				.describe("Filter models by provider (e.g. 'anthropic', 'openai')"),
		},
	},
} satisfies Record<EnumAriseTools, I_AriseToolsConfigEntry>;

/**
 * 取得工具列表的格式化字串 (用於 ShadowMonarch prompt)
 * Format tools list for ShadowMonarch prompt
 */
export function getAriseToolsMarkdown()
{
	return Object.entries(ARISE_TOOLS)
		.map(([key, toolDef]) => `- ${key}: ${toolDef.shortDescription}`)
		.join("\n");
}

/**
 * 取得工具列表的格式化字串 (含 OpenCode 內建 task 工具)
 * Format tools list including OpenCode built-in task tool
 */
export function getAriseToolsSection(): string {
	const ariseTools = getAriseToolsMarkdown();
	return `## Tools
${ariseTools}
- task: OpenCode's built-in for complex multi-step delegation`;
}

export function getAriseToolsConfigEntry<A extends EnumAriseTools>(ariseToolName: A)
{
	const ariseToolsConfigEntry = ARISE_TOOLS[ariseToolName];

	if (!ariseToolsConfigEntry)
	{
		throw new TypeError(`Tool ${ariseToolName} not found`);
	}

	// @ts-ignore
	ariseToolsConfigEntry.description ??= ariseToolsConfigEntry.shortDescription;

	return ariseToolsConfigEntry as any as ITSRequiredWith<typeof ARISE_TOOLS[A] & {
		description: string;
	}, 'description'>;
}
