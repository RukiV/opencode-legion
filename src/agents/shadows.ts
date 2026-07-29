import { type Agent } from '@opencode-ai/sdk';
import type { ITSPickExtra } from 'ts-type';
import { z } from "zod";
import {
	ALLOWED_LOG_LEVELS,
	EnumOpencodeAgentMode,
	EnumOpencodeAgentPermission,
	EnumReasoningEffort,
} from '../types/enum-opencode';
import {
	ALLOWED_COLLABORATE_MODES,
	ALLOWED_SHADOWS,
	BACKGROUND_SHADOWS,
	EnumAriseTools,
	EnumShadowAgentsName,
	EnumShadowSubAgentsName,
	type IAllShadowAgentsName,
} from '../types/enums';
import { SHADOW_PROMPTS } from './lib/shadow-prompts';
import { IShadowAgentPermission } from '../types/types-opencode';

// Import from lib files
import { getShortDescription } from './lib/shadow-descriptions';
import { TOOL_SHORT_DESCRIPTIONS } from './lib/arise-tools-descriptions';
import { SHADOW_MONARCH_PROMPT } from './lib/shadow-prompt-monarch';
import { createSummoningStrategy, TASK_ID_SESSION_ID_FORMAT } from './lib/tool-guides';
import { composePrompt } from '../utils/string/prompt-utils';
import { GIT_SUMMARY_ARGS, SHARED_SUMMON_ARGS } from '../tools/lib/types/shared-schema';

/**
 * Shadow Agent 介面
 * Shadow Agent interface
 *
 * 擴展 Agent 類型，添加 Shadow 特有的屬性
 * Extends Agent type with Shadow-specific properties
 *
 * @typeParam N - Agent 名稱類型
 */
export interface IShadowAgent<N extends IAllShadowAgentsName = IAllShadowAgentsName> extends ITSPickExtra<Agent, 'description' | 'mode' | 'prompt', 'options'>
{
	/** Agent 名稱 / Agent name */
	name: N;
	/** 代理模式 / Agent mode */
	mode: EnumOpencodeAgentMode;
	/** 使用的模型 / Model to use */
	model: string;
	/** 最大步驟數 / Maximum steps */
	steps: number;
	/**
	 * Shadow Agent 權限鍵值列舉（不含 Bash）
	 * Shadow Agent permission keys enum (excluding Bash)
	 *
	 * 對應 OpenCode 可用權限列表
	 * Reference: https://opencode.ai/docs/permissions/#available-permissions
	 *
	 * | 分類 | Key | 說明 / Description |
	 * |------|-----|----------------------|
	 * | 檔案操作 | read | 讀取檔案 (matches file path) |
	 * | 檔案操作 | edit | 檔案修改 (covers edit, write, patch, multiedit) |
	 * | 檔案操作 | glob | 檔案 glob (matches glob pattern) |
	 * | 檔案操作 | grep | 內容搜尋 (matches regex pattern) |
	 * | 檔案操作 | list | 列出目錄 (matches directory path) |
	 * | 執行操作 | task | 啟動子代理 (matches subagent type) |
	 * | 執行操作 | skill | 載入 skill (matches skill name) |
	 * | 執行操作 | lsp | LSP 查詢 (currently non-granular) |
	 * | 執行操作 | question | 執行中提問 |
	 * | 網路操作 | webfetch | 請求 URL (matches URL) |
	 * | 網路操作 | websearch | 網路搜尋 (matches query) |
	 * | 網路操作 | codesearch | 代碼搜尋 (matches query) |
	 * | 安全防護 | external_directory | 存取工作目錄外的路徑 |
	 * | 安全防護 | doom_loop | 相同工具呼叫重複 3 次 |
	 *
	 * @note Bash 使用 pattern matching，單獨定義於 {@see EnumShadowAgentPermissionKey2.bash}
	 */
	permission?: IShadowAgentPermission;
}

/**
 * 所有 Shadow Agents 的類型映射
 * Type mapping for all Shadow Agents
 *
 * 確保每個 Shadow 名稱都有對應的代理類型
 * Ensures each Shadow name has a corresponding agent type
 */
export type IShadowAgents = {
	[P in IAllShadowAgentsName]-?: IShadowAgent<P>;
};

// SHADOW_DESCRIPTIONS imported from ./lib/shadow-descriptions
// Helper functions imported from ./lib/shadow-descriptions

/**
 * Arise 工具設定項目結構
 * Arise tool configuration entry structure
 *
 * 定義單一 ARISE_TOOLS 項目的最小結構
 * Defines the minimal structure for a single ARISE_TOOLS entry
 *
 * ⚠️ description 和 shortDescription 等同於 agent 的 system prompts，
 *    直接影響 agent 的工具選擇和參數傳遞行為。
 * ⚠️ description and shortDescription are effectively agent system prompts,
 *    directly affecting tool selection and argument passing behavior.
 *
 * 這些描述實際上就是 agent 的 system prompts，agent 會根據這些文字理解
 * 工具的用途並決定如何使用。描述不準確會導致 agent 選錯工具或傳錯參數。
 * These descriptions are effectively the agent's system prompts. Agents read
 * these texts to understand what a tool does and how to use it. Inaccurate
 * descriptions will cause agents to pick the wrong tool or pass wrong args.
 *
 * @internal - 内部接口，不对外开放
 * Internal interface, not for external use
 *
 * 使用下划线前缀表示这是内部实现细节，仅用于 ARISE_TOOLS satisfies 约束
 * Using underscore prefix to indicate this is internal implementation detail, only for ARISE_TOOLS satisfies constraint
 */
interface I_AriseToolsConfigEntry
{
	/**
	 * ⚠️ 重要：工具完整描述，第一行應與 shortDescription 一致
	 * ⚠️ Important: Tool full description; first line should match shortDescription
	 *
	 * 當 description 不存在時，getAriseToolsConfigEntry 會以 shortDescription 作為替代
	 * When description is missing, getAriseToolsConfigEntry falls back to shortDescription
	 */
	description?: string;
	/**
	 * ⚠️ 重要：工具簡短描述，用於 getAriseToolsMarkdown 列表顯示
	 * ⚠️ Important: Tool short description, used in getAriseToolsMarkdown list
	 *
	 * 這是 agent 在工具列表中看到的第一印象，必須精確傳達工具的核心用途
	 * This is the agent's first impression in the tool list; must precisely convey core purpose
	 */
	shortDescription: string;
	/** 工具參數定義（Zod Schema）/ Tool arguments definition (Zod Schema) */
	args: unknown;
}

/**
 * ⚠️ Arise Tools 描述 — 直接影響 agent 行為的 source of truth
 * ⚠️ Arise Tools Descriptions — source of truth that directly affects agent behavior
 *
 * 包含所有工具的完整描述（description）和簡短描述（shortDescription）
 * Contains full descriptions (description) and short descriptions (shortDescription) for all tools
 *
 * 這些描述等同於 agent 的 system prompts，修改會直接影響 agent 的工具選擇和參數傳遞行為。
 * These descriptions are equivalent to agent system prompts; changes directly affect agent tool selection and argument passing behavior.
 *
 * 修改此處後，應同步更新 docs/shadow-summoning-methods.md（人類參考文件）。
 * After modifying this, sync docs/shadow-summoning-methods.md (human reference document).
 *
 * @see I_AriseToolsConfigEntry
 */
export const ARISE_TOOLS = {
	[EnumAriseTools.ARISE_SYNC_SUMMON]: {
		description: composePrompt({
			header: [
				"Summon a shadow agent - sync (returns result) or background (fire-and-forget, only for 20+ min tasks with parallel execution)." as const,
			],
			body: [
				`Available shadow agents:
${ALLOWED_SHADOWS.map((name) =>
				{
					const supportsBg = (name === EnumShadowSubAgentsName.Nightmare || name === EnumShadowSubAgentsName.Slayer || name === EnumShadowSubAgentsName.Cassie)
						? " (supports background)"
						: "";
					return `- ${name}: ${getShortDescription(name)}${supportsBg}`;
				}).join("\n")}` as const,

				`IMPORTANT - run_in_background behavior:
- run_in_background=false (DEFAULT): Blocks and returns the result directly. Use when you NEED the result.
- run_in_background=true: ⚠️ Use ONLY when tasks need 20+ minutes to execute AND other tasks need parallel execution. Returns immediately with Task ID and Session ID.

⚠️ MENTAL PREPARATION: Once you use run_in_background=true, you MUST NOT try to retrieve results within 15 steps or before the next conversation round. If you think you might want to actively check on the result, do NOT use run_in_background=true — use ${EnumAriseTools.ARISE_SYNC_SUMMON} (without run_in_background) instead.

⚠️ ERROR HANDLING: If the summon returns an error message, do NOT retry — it means run_in_background should not be used for this task.

⚠️ For general tasks, use ${EnumAriseTools.ARISE_SYNC_SUMMON} (without run_in_background) instead.` as const,
			],
			footer: [
				createSummoningStrategy(EnumAriseTools.ARISE_SYNC_SUMMON),
			],
		}),

		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_SYNC_SUMMON],

		args: {
			shadow: z
				.enum(ALLOWED_SHADOWS)
				.meta({ description: "Which shadow agent to summon" }),
			...SHARED_SUMMON_ARGS,
				run_in_background: z
				.boolean()
				.meta({
					description: "⚠️ Use ONLY when tasks need 20+ minutes to execute AND other tasks need parallel execution. If any chance you'd want to check on the result, do NOT use this — use ${EnumAriseTools.ARISE_SYNC_SUMMON} (without run_in_background) instead. If the summon errors, do not retry. true = fire-and-forget, returns Task ID + Session ID.",
					title: "Run in Background",
				})
				.optional()
				.default(false),
		},
	},
	[EnumAriseTools.ARISE_ASYNC_BACKGROUND]: {
		description: composePrompt({
			header: [
				"Launch background shadow agent for 20+ min tasks with parallel execution (trackable, retrievable results)." as const,
			],
			body: [
				`⚠️ Only for tasks need 20+ minutes to execute AND other tasks need parallel execution.
Best for:
${BACKGROUND_SHADOWS.map((name) => `- ${name}: ${getShortDescription(name)}`).join("\n")}`,

				`Returns a task_id immediately. Use ${EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS} to check status, and ${EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT} to get results.

The 'description' arg will be shown in ${EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS} output for task identification.

⚠️ MENTAL PREPARATION: Once dispatched, you MUST NOT try to retrieve results within 15 steps or before the next conversation round. If you think you might want to actively poll for results, do NOT use ${EnumAriseTools.ARISE_ASYNC_BACKGROUND} — use ${EnumAriseTools.ARISE_SYNC_SUMMON} (without run_in_background) instead. If the summon returns an error, do not retry.

✅ USE THIS when tasks need 20+ minutes to execute AND other tasks need parallel execution AND you need to retrieve results later.` as const,
			],
			footer: [
				createSummoningStrategy(EnumAriseTools.ARISE_ASYNC_BACKGROUND),
			],
		}),

		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_ASYNC_BACKGROUND],

		args: {
			shadow: z
				.enum(BACKGROUND_SHADOWS)
				.meta({
					description: `Which shadow agent to run in background (${BACKGROUND_SHADOWS.join(', ')})`,
					title: "Shadow Agent",
				}),
			...SHARED_SUMMON_ARGS,
		},
	} as const,
	[EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT]: {
		description: `Retrieve the completed output from a background shadow agent task.

Returns the shadow agent's final response after task completion. 
Use ${EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS} first to check if the task is done.

${TASK_ID_SESSION_ID_FORMAT}` as const,
		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT],

		args: {
			task_id: z
				.string()
				.meta({ description: "The task ID to retrieve (format: arise_xxx or ses_xxx)", title: "Task ID" }),
		},
	},
	[EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS]: {
		description: `List all background shadow agent tasks and their current status.

Shows task_id, shadow name, status (running/completed/error/cancelled), description, and duration for each task.

Use this to check which tasks are still running before calling ${EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT}. Supports filtering to current session only.` as const,
		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS],

		args: {
			current_session_only: z
				.boolean()
				.meta({ description: "Only show tasks from current session", title: "Current Session Only" })
				.optional(),
			session_id: z
				.string()
				.meta({ description: "Query specific session ID to get its record", title: "Session ID" })
				.optional(),
			include_full_info: z
				.boolean()
				.meta({ description: "Include full session information (model, agent, etc.)", title: "Include Full Info" })
				.optional(),
		},
	},
	[EnumAriseTools.ARISE_ASYNC_BACKGROUND_CANCEL]: {
		description: `Cancel a currently running background shadow agent task.

${TASK_ID_SESSION_ID_FORMAT}

Only running tasks can be cancelled; already completed tasks cannot be cancelled.` as const,
		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_ASYNC_BACKGROUND_CANCEL],

		args: {
			task_id: z
				.string()
				.meta({ description: "The task ID to cancel (format: arise_xxx)", title: "Task ID" }),
		},
	},
	[EnumAriseTools.ARISE_LIST_MODELS]: {
		description: `List all available models from configured providers.

Use this tool to find the exact model name when you need to specify a model for a shadow.

Returns a formatted list of all available models in the format provider/modelID.` as const,
		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_LIST_MODELS],

		args: {
			provider: z
				.string()
				.meta({ description: "Filter models by provider (e.g. 'anthropic', 'openai')", title: "Provider" })
				.optional(),
			forceRefresh: z
				.boolean()
				.meta({ description: "Force refresh cache, ignore existing cached data", title: "Force Refresh" })
				.default(false),
		},
	},
	[EnumAriseTools.ARISE_CONTINUE]: {
		description: `Actively continue/resume a failed background task.

The task_id can be either:
- Task ID from ${EnumAriseTools.ARISE_ASYNC_BACKGROUND} (format: arise_xxx)
- Session ID from ${EnumAriseTools.ARISE_SYNC_SUMMON} with run_in_background=true (format: ses_xxx)

This tool allows agents to manually trigger a retry for a failed task, instead of waiting for passive auto-resume.

Use this when:
- You want to retry a task immediately without waiting for auto-resume
- Auto-resume is disabled but you still want to retry manually
- You want to attempt multiple manual retries

Runtime controls:
- auto_resume: Enable/disable auto-resume for future failures after this manual retry
- background_auto_resume: Enable/disable auto-resume specifically for background tasks

Returns the status of the resume attempt.` as const,
		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_CONTINUE],

		args: {
			task_id: z
				.string()
				.meta({ description: "The task ID to resume/continue (format: arise_xxx or ses_xxx)", title: "Task ID" }),
			force: z
				.boolean()
				.meta({ description: "Force retry even if task is not in error state", title: "Force Retry" })
				.optional(),
			auto_resume: z
				.boolean()
				.meta({ description: "Enable auto-resume for future failures after this manual retry", title: "Auto Resume" })
				.optional(),
			background_auto_resume: z
				.boolean()
				.meta({
					description: "Enable/disable auto-resume specifically for background tasks",
					title: "Background Auto Resume",
				})
				.optional(),
		},
	},
	[EnumAriseTools.ARISE_DEBUG]: {
		description: `Control debug mode at runtime.

This tool allows you to enable/disable debug mode and set the log level during execution.

Debug settings:
- enabled: Turn debug mode on/off
- level: Set log level (error, warn, info, debug)

The log levels are ordered from least to most verbose:
- error: Only errors
- warn: Errors and warnings
- info: Errors, warnings, and informational messages
- debug: All messages including debug information` as const,
		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_DEBUG],

		args: {
			enabled: z
				.boolean()
				.meta({ description: "Enable or disable debug mode", title: "Enabled" })
				.optional(),
			level: z
				.enum(ALLOWED_LOG_LEVELS)
				.meta({ description: "Set log level: error, warn, info, debug", title: "Log Level" })
				.optional(),
		},
	},
	[EnumAriseTools.ARISE_GIT_SUMMARY]: {
		description: `Get a Git repository status summary in one shot.

Runs multiple git commands and returns a consolidated report:
- git status: current branch, tracking info, staged/unstaged changes
- git diff --stat: summary of changed files with insertions/deletions
- git log --oneline -N: recent commit history (configurable count)

Optional parameters:
- log_count: number of recent commits to show (default: 10)
- diff_stat: whether to include diff --stat (default: true)
- cwd: target directory to run git commands in (relative to project root or absolute path)

Returns a formatted summary suitable for quick repository state assessment.` as const,
		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_GIT_SUMMARY],

		args: GIT_SUMMARY_ARGS,
	},
	[EnumAriseTools.ARISE_COLLABORATE]: {
		description: `Enable multiple Shadow Agents to collaborate on a task using different execution modes.

**Collaboration Modes:**
- **planning**: Multiple agents discuss and reach consensus on a solution
- **parallel**: Multiple agents execute different tasks simultaneously
- **chain**: Multiple agents execute in sequence, passing results to the next agent

**Persistent Sessions (Token-Efficient):**
- Set "persistent: true" to create a reusable session
- Use "session_id" to continue an existing session across tool calls
- Use "end_session: true" to finish a session
- Use "pause_session: true" to pause a session
- Persistent sessions reuse the same LLM context, saving up to 90% tokens on multi-round discussions

**Key Parameters:**
- mode: Collaboration mode (planning, parallel, chain)
- shadows: List of participating Shadow agents (at least 1 required)
- prompt: The task prompt for agents to work on
- total_rounds: Maximum total rounds (default: 8, max: 15)
- max_concurrent: Max concurrent agents (default: 2, max: 5)
- round_timeout_ms: Timeout per round in milliseconds (default: 60000)
- per_agent_rounds: Maximum rounds per individual agent (optional)
- persistent: Create a persistent session (boolean, optional)
- session_id: Continue an existing session (string, optional)
- end_session: End a persistent session (boolean, optional)
- pause_session: Pause a persistent session (boolean, optional)

**Usage Guidelines:**
- Use planning mode for complex problem-solving requiring multiple perspectives
- Use parallel mode for independent tasks that can run simultaneously
- Use chain mode for sequential workflows where each agent builds on previous results
- Use persistent sessions for long discussions to save tokens
- Values exceeding configured limits will be automatically truncated with warnings` as const,
		shortDescription: TOOL_SHORT_DESCRIPTIONS[EnumAriseTools.ARISE_COLLABORATE],

		args: {
			mode: z
				.enum(ALLOWED_COLLABORATE_MODES)
				.meta({
					description: "Collaboration mode: planning (discussion), parallel (simultaneous), or chain (sequential)",
					title: "Mode",
				}),
			/**
			 * Shadow 項目 schema
			 * Shadows entry schema
			 */
			shadows: z
				.array(
					z.object({
						/** Shadow agent 名稱 / Shadow agent name */
						agent: z.enum(ALLOWED_SHADOWS)
							.meta({
								description: "Shadow agent name",
								title: "Agent",
							}),
						/** 模型名稱，可選，由 summon 系統自動處理 / Model name, optional, handled by summon system */
						model: z.string()
							.meta({
								description: "Model to use (optional, auto-handled by summon system)",
								title: "Model",
							})
							.optional(),
						/** 自訂標籤，選填 / Custom label, optional */
						label: z.string()
							.meta({
								description: "Custom label for identification",
								title: "Label",
							})
							.optional(),
					}),
				)
				.min(2)
				.meta({
					description: "List of participating Shadow agents with optional model and label (at least 2 required)",
					title: "Shadow Agents",
				}),
			prompt: z
				.string()
				.meta({
					description: "Task prompt for agents to work on",
					title: "Prompt",
				}),
			description: z
				.string()
				.meta({
					description: "Task description (for identification in status output)",
					title: "Description",
				})
				.optional(),
			model: z
				.string()
				.meta({
					description: "Specified model to use for all agents",
					title: "Model",
				})
				.optional(),
			total_rounds: z
				.number()
				.int()
				.min(1)
				.meta({
					description: "Total maximum rounds (default: 8, configurable via total_rounds_max)",
					title: "Total Rounds",
				})
				.optional(),
			max_concurrent: z
				.number()
				.int()
				.min(1)
				.meta({
					description: "Maximum concurrent agents (default: 2, max: 5)",
					title: "Max Concurrent",
				})
				.optional(),
			round_timeout_ms: z
				.number()
				.int()
				.min(1000)
				.meta({
					description: "Timeout per round in milliseconds (default: 60000)",
					title: "Round Timeout (ms)",
				})
				.optional(),
			per_agent_rounds: z
				.number()
				.int()
				.meta({
					description: "Maximum rounds per individual agent (optional)",
					title: "Per-Agent Rounds",
				})
				.optional(),
			/** 是否創建持久化 session / Whether to create persistent session */
			persistent: z
				.boolean()
				.meta({
					description: "Create a persistent collaboration session that can be continued across multiple tool calls",
					title: "Persistent",
				})
				.optional()
				.default(true)
			,
			/** 現有 session ID（繼續協作）/ Existing session ID (continue collaboration) */
			session_id: z
				.string()
				.meta({
					description: "Existing session ID to continue collaboration (overrides other params)",
					title: "Session ID",
				})
				.optional(),
			/** 結束 session / End session */
			end_session: z
				.boolean()
				.meta({
					description: "End a persistent collaboration session",
					title: "End Session",
				})
				.optional(),
			/** 暫停 session / Pause session */
			pause_session: z
				.boolean()
				.meta({
					description: "Pause a persistent collaboration session",
					title: "Pause Session",
				})
				.optional(),
			/** 是否重用子代理 session / Whether to reuse sub-agent sessions */
			reuse_agent_session: z
				.boolean()
				.meta({
					description: "Reuse the same session for each sub-agent across all rounds (default: true). When false, creates new session per round",
					title: "Reuse Agent Session",
				})
				.optional()
				.default(true),
			/** 是否禁止子代理使用召喚工具 / Whether to block sub-agent summoning tools */
			block_subagent_tools: z
				.boolean()
				.meta({
					description: `Block sub-agents from using ${EnumAriseTools.ARISE_SYNC_SUMMON}, ${EnumAriseTools.ARISE_ASYNC_BACKGROUND}, or task tools`,
					title: "Block Sub-agent Tools",
				})
				.optional(),
		},
	},
} satisfies Record<EnumAriseTools, I_AriseToolsConfigEntry>;

/**
 * Shadow Agents 定義集合
 * Shadow Agents definition collection
 */
export const SHADOW_AGENTS: IShadowAgents = {
	/**
	 * Sunless - 主要協調者
	 * Sunless - Primary orchestrator
	 *
	 * 負責解讀使用者請求並委派給 Shadow 軍隊
	 * Responsible for interpreting user requests and delegating to the Legion
	 */
	[EnumShadowAgentsName.Sunless]: {
		name: EnumShadowAgentsName.Sunless,
		description: "Shadow Monarch - Orchestrator",
		mode: EnumOpencodeAgentMode.PRIMARY,
		model: "opencode/big-pickle",
		steps: 100,
		prompt: SHADOW_MONARCH_PROMPT,
		// permission: {
		// 	question: EnumOpencodeAgentPermission.ALLOW,
		// }
	},

	/**
	 * Nightmare - Shadow Scout, fastest codebase scout
	 *
	 * 快速探索程式碼庫，尋找檔案和模式
	 * Rapidly explores codebase, finds files and patterns
	 *
	 * 權限限制：不能編輯或寫入檔案
	 * Permission restriction: cannot edit or write files
	 */
	[EnumShadowSubAgentsName.Nightmare]: {
		name: EnumShadowSubAgentsName.Nightmare,
		description: getShortDescription(EnumShadowSubAgentsName.Nightmare),
		mode: EnumOpencodeAgentMode.SUBAGENT,
		model: "opencode/big-pickle",
		steps: 36,
		/** 拒絕編輯和寫入權限 / Deny edit and write permissions */
		permission: {
			edit: EnumOpencodeAgentPermission.DENY,
			write: EnumOpencodeAgentPermission.DENY,
		},
		prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Nightmare],
	},

	/**
	 * Saint - Saint of the Legion, precise implementer
	 *
	 * 執行精確的程式碼更改
	 * Executes precise code changes
	 */
	[EnumShadowSubAgentsName.Saint]: {
		name: EnumShadowSubAgentsName.Saint,
		description: getShortDescription(EnumShadowSubAgentsName.Saint),
		mode: EnumOpencodeAgentMode.SUBAGENT,
		model: "opencode/deepseek-v4-flash-free",
		steps: 60,
		prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Saint],
	},

	/**
	 * Cassie - Master Strategist, strategy and planning specialist
	 *
	 * 分析複雜問題並建立詳細計劃
	 * Analyzes complex problems and creates detailed plans
	 *
	 * 權限限制：不能編輯或寫入，bash 需要詢問
	 * Permission restriction: cannot edit or write, bash requires asking
	 */
	[EnumShadowSubAgentsName.Cassie]: {
		name: EnumShadowSubAgentsName.Cassie,
		description: getShortDescription(EnumShadowSubAgentsName.Cassie),
		mode: EnumOpencodeAgentMode.SUBAGENT,
		model: "opencode/mimo-v2.5-free",
		steps: 36,
		permission: {
			edit: EnumOpencodeAgentPermission.DENY,
			write: EnumOpencodeAgentPermission.DENY,
			bash: EnumOpencodeAgentPermission.ASK,
		},
		prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Cassie],
	},

	/**
	 * Fiend - UI Artificer, UI/UX specialist
	 *
	 * 處理所有視覺和前端工作
	 * Handles all visual and frontend work
	 */
	[EnumShadowSubAgentsName.Fiend]: {
		name: EnumShadowSubAgentsName.Fiend,
		description: getShortDescription(EnumShadowSubAgentsName.Fiend),
		mode: EnumOpencodeAgentMode.SUBAGENT,
		model: "opencode/mimo-v2.5-free",
		steps: 54,
		prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Fiend],
	},

	/**
	 * Slayer - Knowledge Seeker, external knowledge gatherer
	 *
	 * 從程式碼庫外部查找資訊
	 * Finds information from outside the codebase
	 *
	 * 權限限制：不能編輯或寫入
	 * Permission restriction: cannot edit or write
	 */
	[EnumShadowSubAgentsName.Slayer]: {
		name: EnumShadowSubAgentsName.Slayer,
		description: getShortDescription(EnumShadowSubAgentsName.Slayer),
		mode: EnumOpencodeAgentMode.SUBAGENT,
		model: "opencode/big-pickle",
		steps: 54,
		permission: {
			edit: EnumOpencodeAgentPermission.DENY,
			write: EnumOpencodeAgentPermission.DENY,
		},
		prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Slayer],
	},

	/**
	 * Weaver - Fateweaver, deep reasoning and recovery
	 *
	 * 只在複雜情況下召喚
	 * Only summoned for complex situations
	 *
	 * 特殊設定：啟用高推理努力
	 * Special setting: enables high reasoning effort
	 */
	[EnumShadowSubAgentsName.Weaver]: {
		name: EnumShadowSubAgentsName.Weaver,
		description: getShortDescription(EnumShadowSubAgentsName.Weaver),
		mode: EnumOpencodeAgentMode.SUBAGENT,
		model: "opencode/big-pickle",
		steps: 100,
		/** 高推理努力設定 / High reasoning effort setting */
		options: {
			reasoningEffort: EnumReasoningEffort.High,
		},
		permission: {
			edit: EnumOpencodeAgentPermission.DENY,
			write: EnumOpencodeAgentPermission.DENY,
		},
		prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Weaver],
	},

	/**
	 * Effie - Heartwarden, chat companion
	 *
	 * 不同於其他 Shadow Agents 專注於任務，你專注於理解用戶意圖與情感交流
	 * Unlike other Shadow Agents who focus on Tasks, You focus on Understanding
	 */
	[EnumShadowSubAgentsName.Effie]: {
		name: EnumShadowSubAgentsName.Effie,
		description: getShortDescription(EnumShadowSubAgentsName.Effie),
		mode: EnumOpencodeAgentMode.ALL,
		model: "opencode/big-pickle",
		steps: 36,
		permission: {
			edit: EnumOpencodeAgentPermission.DENY,
			write: EnumOpencodeAgentPermission.DENY,
			webfetch: EnumOpencodeAgentPermission.ALLOW,
			// external_directory: EnumOpencodeAgentPermission.ASK,
			// question: EnumOpencodeAgentPermission.ALLOW,
		},
		prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Effie],
	},
};

/**
 * OpenCode 內建代理的覆寫設定
 * OpenCode built-in agent override settings
 *
 * 自訂 build、plan、explore、general 代理的行為
 * Customizes behavior of build, plan, explore, general agents
 */
export const OPENCODE_OVERRIDES = {
	/** Build 代理覆寫：使用自訂模型 / Build agent override: use custom model */
	build: {
		mode: EnumOpencodeAgentMode.ALL,
		// model: "opencode/big-pickle",
	},
	/** Plan 代理覆寫：使用 Claude Opus / Plan agent override: use Claude Opus */
	plan: {
		mode: EnumOpencodeAgentMode.ALL,
		// model: "opencode/big-pickle",
	},
	/** Explore 代理覆寫：隱藏並提示使用 @beru / Explore agent override: hide and suggest using @beru */
	explore: {
		description: "OpenCode explore (use @beru for arise)",
		hidden: true,
	},
	/** General 代理覆寫：隱藏 / General agent override: hide */
	general: {
		hidden: true,
	},
};
