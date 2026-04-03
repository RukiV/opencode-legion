import { type Agent } from '@opencode-ai/sdk';
import type { ITSPartialRecord, ITSPickExtra } from 'ts-type';
import { z } from "zod";
import { 
  EnumOpencodeAgentMode, 
  EnumOpencodeAgentPermission, 
  ALLOWED_LOG_LEVELS,
  EnumReasoningEffort,
} from '../types/enum-opencode';
import { EnumShadowAgentsName, EnumShadowSubAgentsName, ALLOWED_SHADOWS, BACKGROUND_SHADOWS, type IAllShadowAgentsName, EnumAriseTools, ALL_ARISE_TOOLS } from '../types/enums';
import { ITSRequiredWith } from "ts-type";
import { LEGACY_PLUGIN_NAME } from '../types/const-default';
import { GIT_SUMMARY_ARGS } from '../config/schema/entry';
import { SHADOW_PROMPTS } from './lib/prompts';
import { IShadowAgentPermission } from '../types/types-opencode';

/**
 * Shadow Agent 介面
 * Shadow Agent interface
 *
 * 擴展 Agent 類型，添加 Shadow 特有的屬性
 * Extends Agent type with Shadow-specific properties
 *
 * @typeParam N - Agent 名稱類型
 */
export interface IShadowAgent<N extends IAllShadowAgentsName = IAllShadowAgentsName> extends ITSPickExtra<Agent, 'description' | 'mode' | 'prompt', 'options'> {
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

/**
 * Shadow Agent 描述資訊結構
 * Shadow Agent description information structure
 */
export interface IShadowDescription {
  /** 名稱 / Name */
  name: EnumShadowSubAgentsName;
  /** 顯示名稱 / Display name (optional, add Chinese only when unambiguous) */
  displayName?: string;
  /** 角色標題 / Character title */
  title: string;
  /** 角色象徵 emoji / Character symbol emoji */
  emoji: string;
  /** 角色定位（角色扮演）/ Character role (roleplay) */
  role: string;
  /** 能力範圍 / Capability scope */
  capabilities: string;
  /** 最佳使用場景 / Best use cases */
  bestFor: string[];
  /** 角色關鍵字 / Role keywords - 用於 suggestShadowAgent 建議 */
  roleKeywords: string[];
  /** 是否支援背景執行 / Supports background execution */
  supportsBackground?: boolean;
}

/**
 * Shadow Agents 描述映射
 * Shadow Agents descriptions map
 */
export const SHADOW_DESCRIPTIONS = {
  [EnumShadowSubAgentsName.Beru]: {
    name: EnumShadowSubAgentsName.Beru,
    displayName: "Beru",
    title: "Ant King Scout",
    emoji: "🐜",
    role: "Fastest scout",
    capabilities: "Codebase exploration, grep, file discovery, pattern search",
    bestFor: [
      "Finding files by name or pattern",
      "Searching code for patterns or functions",
      "Understanding code structure",
      "Quick codebase reconnaissance",
    ],
    roleKeywords: ["find", "search", "explore", "grep", "file", "where", "locate", "codebase"],
    supportsBackground: true,
  },

  [EnumShadowSubAgentsName.Igris]: {
    name: EnumShadowSubAgentsName.Igris,
    displayName: "Igris (伊格利特)",
    title: "Loyal Knight",
    emoji: "⚔️",
    role: "Precise implementer",
    capabilities: "Code changes, file editing, running commands, test verification",
    bestFor: [
      "Implementing code changes",
      "Editing files with precision",
      "Running build/test commands",
      "Verifying changes work correctly",
    ],
    roleKeywords: ["implement", "edit", "change", "fix", "code", "write", "run", "test", "build"],
    supportsBackground: false,
  },

  [EnumShadowSubAgentsName.Bellion]: {
    name: EnumShadowSubAgentsName.Bellion,
    displayName: "Bellion (貝利昂)",
    title: "Grand Marshal",
    emoji: "🎖️",
    role: "Master strategist",
    capabilities: "Strategic planning, architecture analysis, complex problem decomposition",
    bestFor: [
      "Planning complex refactoring",
      "Architecture design decisions",
      "Migration planning",
      "Breaking down large tasks",
    ],
    roleKeywords: ["plan", "architecture", "design", "strategy", "refactor", "migrate", "analyze"],
    supportsBackground: true,
  },

  [EnumShadowSubAgentsName.Tusk]: {
    name: EnumShadowSubAgentsName.Tusk,
    displayName: "Tusk (塔斯克)",
    title: "Creative Shadow",
    emoji: "🎨",
    role: "UI/UX specialist",
    capabilities: "Frontend development, UI/UX design, styling, components, animations",
    bestFor: [
      "Building UI components",
      "Styling and layouts",
      "Frontend integration",
      "Design system work",
    ],
    roleKeywords: ["ui", "ux", "frontend", "design", "style", "css", "component", "layout"],
    supportsBackground: false,
  },

  [EnumShadowSubAgentsName.Tank]: {
    name: EnumShadowSubAgentsName.Tank,
    displayName: "Tank",
    title: "Research Shadow",
    emoji: "🛡️",
    role: "External knowledge gatherer",
    capabilities: "Web search, documentation lookup, examples, best practices research",
    bestFor: [
      "Finding external documentation",
      "Researching best practices",
      "Finding code examples",
      "Learning new libraries/frameworks",
    ],
    roleKeywords: ["docs", "documentation", "search", "research", "example", "learn", "external"],
    supportsBackground: true,
  },

  [EnumShadowSubAgentsName.ShadowSovereign]: {
    name: EnumShadowSubAgentsName.ShadowSovereign,
    displayName: "Shadow Sovereign (闇影君主)",
    title: "Full Power",
    emoji: "👁️",
    role: "Deep reasoning specialist",
    capabilities: "Deep reasoning, complex debugging, architecture decisions, failure recovery",
    bestFor: [
      "Complex architectural decisions",
      "Debugging after multiple failed attempts",
      "Extended reasoning analysis",
      "Recovery strategies",
    ],
    roleKeywords: ["debug", "complex", "why", "reason", "analyze", "reasoning"],
    supportsBackground: false,
  },

  [EnumShadowSubAgentsName.EsilRadiru]: {
    name: EnumShadowSubAgentsName.EsilRadiru,
    displayName: "Esil Radiru (艾希．拉迪勒)",
    title: "Demon Noble Lady",
    emoji: "🔥",
    role: "Chat companion",
    capabilities: "Conversational dialogue, emotional understanding, thoughtful exchange, intent clarification",
    bestFor: [
      "Casual conversation and chat",
      "Understanding user intent and feelings",
      "Clarifying requirements through dialogue",
      "Emotional support and encouragement",
    ],
    roleKeywords: ["chat", "talk", "conversation", "feel", "intent", "understand", "emotion", "how", "what do you think", "help"],
    supportsBackground: false,
  },
} satisfies Record<EnumShadowSubAgentsName, IShadowDescription>;

/**
 * 工具函式：取得 Shadow Agent 的簡短描述
 * Tool function: Get short description for a Shadow Agent
 */
export function getShortDescription(name: EnumShadowSubAgentsName): string {
  const desc = SHADOW_DESCRIPTIONS[name];
  return `${desc.emoji} ${desc.role.charAt(0).toUpperCase() + desc.role.slice(1)} - ${desc.capabilities}`;
}

/**
 * 工具函式：取得 Shadow Agent 的完整描述
 * Tool function: Get full description for a Shadow Agent
 */
export function getFullDescription(name: EnumShadowSubAgentsName): string {
  const desc = SHADOW_DESCRIPTIONS[name];
  const lines = [
    `${desc.emoji} ${desc.name.charAt(0).toUpperCase() + desc.name.slice(1)} - ${desc.title}`,
    `Role: ${desc.role}`,
    `Capabilities: ${desc.capabilities}`,
    `Best for:`,
    ...desc.bestFor.map((item) => `  • ${item}`),
  ];
  lines.push(`Background: ${desc.supportsBackground ? "Supported" : "Not supported"}`);
  return lines.join("\n");
}

/**
 * 工具函式：取得 Monarch 的 Shadow Agents 列表（用於 prompt）
 * Tool function: Get Monarch's Shadow Agents list (for prompt)
 */
export function getMonarchShadowList(): string {
  const shadows = Object.values(SHADOW_DESCRIPTIONS);
  return shadows
    .map((s) => {
      const backgroundHint = s.supportsBackground ? " (supports background)" : "";
      return `- @${s.name} - ${s.role.charAt(0).toUpperCase() + s.role.slice(1)}. ${s.capabilities}${backgroundHint}`;
    })
    .join("\n");
}

/**
 * 工具函式：檢查是否支援背景執行
 * Tool function: Check if background execution is supported
 */
export function supportsBackgroundExecution(name: EnumShadowSubAgentsName): boolean {
  return SHADOW_DESCRIPTIONS[name]?.supportsBackground ?? false;
}

/**
 * 工具函式：根據任務類型建議合适的 Shadow Agent
 * Tool function: Suggest appropriate Shadow Agent based on task type
 */
export function suggestShadowAgent(taskType: string): EnumShadowSubAgentsName[] {
  const lowerTask = taskType.toLowerCase();
  const scores: Array<{ name: EnumShadowSubAgentsName; score: number }> = [];

  for (const [name, desc] of Object.entries(SHADOW_DESCRIPTIONS)) {
    let score = 0;
    const keywords = desc.roleKeywords || [];
    for (const keyword of keywords) {
      if (lowerTask.includes(keyword)) {
        score += 1;
      }
    }
    for (const best of desc.bestFor) {
      const words = best.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 3 && lowerTask.includes(word)) {
          score += 0.5;
        }
      }
    }
    if (score > 0) {
      scores.push({ name: name as EnumShadowSubAgentsName, score });
    }
  }
  return scores.sort((a, b) => b.score - a.score).map((s) => s.name);
}

/**
 * 工具函式：取得所有 Shadow Agents 的 Markdown 表格格式
 * Tool function: Get all Shadow Agents in Markdown table format
 */
export function getShadowAgentsMarkdownTable(): string {
  const headers = ["Shadow Agent", "Role", "Best For"];
  const separator = ["---", "---", "---"];
  const rows = Object.values(SHADOW_DESCRIPTIONS).map((desc) => [
    `${desc.emoji} **${desc.name}**`,
    desc.role,
    desc.bestFor.slice(0, 2).join(", "),
  ]);
  const formatRow = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [formatRow(headers), formatRow(separator), ...rows.map(formatRow)].join("\n");
}

/**
 * 工具函式：取得 Shadow Agent 描述物件
 * Tool function: Get Shadow Agent description object
 */
export function getShadowDescription(name: EnumShadowSubAgentsName): IShadowDescription | undefined {
  return SHADOW_DESCRIPTIONS[name];
}

/**
 * 工具函式：取得所有 Shadow Agents 的名稱陣列
 * Tool function: Get all Shadow Agent names
 */
export function getAllShadowNames(): EnumShadowSubAgentsName[] {
  return [...ALLOWED_SHADOWS];
}

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
 * @internal - only for valid ARISE_TOOLS satisfies 約束
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
 * 召喚工具共用 args
 * Shared args for summon tools
 *
 * prompt 和 model 的描述在 ARISE_SUMMON / ARISE_BACKGROUND 之間一致
 * prompt and model descriptions are consistent across ARISE_SUMMON / ARISE_BACKGROUND
 */
const SHARED_SUMMON_ARGS = {
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
};

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
	[EnumAriseTools.ARISE_SUMMON]: {
		description: `Summon a shadow agent - sync (returns result) or background (fire-and-forget).

Available shadow agents:
${ALLOWED_SHADOWS.map((name) => {
			const supportsBg = (name === EnumShadowSubAgentsName.Beru || name === EnumShadowSubAgentsName.Tank || name === EnumShadowSubAgentsName.Bellion) ? " (supports background)" : "";
			return `- ${name}: ${getShortDescription(name)}${supportsBg}`;
		}).join("\n")}

IMPORTANT - run_in_background behavior:
- run_in_background=false (DEFAULT): Blocks and returns the result directly. Use when you NEED the result.
- run_in_background=true: Returns immediately with a Session ID, BUT there is NO tool to retrieve the result later. Only use for fire-and-forget tasks where you DON'T need the result.

⚠️ For parallel execution WITH retrievable results, use ${EnumAriseTools.ARISE_BACKGROUND as const} instead (only ${BACKGROUND_SHADOWS.join('/')}).` as const,
		shortDescription: "Summon a shadow agent - sync (returns result) or background (fire-and-forget)" as const,

		args: {
			shadow: z
				.enum(ALLOWED_SHADOWS)
				.meta({ description: "Which shadow agent to summon" }),
			...SHARED_SUMMON_ARGS,
			run_in_background: z
				.boolean()
				.meta({ description: "false (DEFAULT) = blocks and returns result directly. true = returns Session ID but NO tool exists to retrieve result later - only use for fire-and-forget. For parallel WITH retrievable results, use arise_background instead." })
				.optional()
				.default(false),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND]: {
		description: `Launch background shadow agent - trackable, retrievable results.

Best for:
${BACKGROUND_SHADOWS.map((name) => `- ${name}: ${getShortDescription(name)}`).join("\n")}

Returns a task_id immediately. Use arise_background_status to check status, and arise_background_output to get results.

The 'description' arg will be shown in arise_background_status output for task identification.

✅ USE THIS (not arise_summon with run_in_background=true) when you need parallel execution AND want to retrieve results later.` as const,
		shortDescription: "Launch background shadow agent - trackable, retrievable results" as const,

		args: {
			shadow: z
				.enum(BACKGROUND_SHADOWS)
				.meta({ description: `Which shadow agent to run in background (${BACKGROUND_SHADOWS.join(', ')})`, title: "Shadow Agent" }),
			...SHARED_SUMMON_ARGS,
		},
	} as const,
	[EnumAriseTools.ARISE_BACKGROUND_OUTPUT]: {
		description: `Retrieve the completed output from a background shadow agent task.

Returns the shadow agent's final response after task completion. 
Use arise_background_status first to check if the task is done before calling this tool.

The task_id must come from a previous arise_background call (format: arise_xxx).` as const,
		shortDescription: "Retrieve the completed output from a background shadow agent task" as const,

		args: {
			task_id: z
				.string()
				.meta({ description: "The task ID from arise_background (format: arise_xxx)", title: "Task ID" }),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND_STATUS]: {
		description: `List all background shadow agent tasks and their current status.

Shows task_id, shadow name, status (running/completed/error/cancelled), description, and duration for each task.

Use this to check which tasks are still running before calling arise_background_output. Supports filtering to current session only.` as const,
		shortDescription: "List all background shadow agent tasks and their current status" as const,

		args: {
			current_session_only: z
				.boolean()
				.meta({ description: "Only show tasks from current session", title: "Current Session Only" })
				.optional(),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND_CANCEL]: {
		description: `Cancel a currently running background shadow agent task.

The task_id must come from a previous arise_background call (format: arise_xxx). Only running tasks can be cancelled; already completed tasks cannot be cancelled.` as const,
		shortDescription: "Cancel a currently running background shadow agent task." as const,

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
		shortDescription: "List all available models from configured providers." as const,

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

This tool allows agents to manually trigger a retry for a failed task, instead of waiting for passive auto-resume.

Use this when:
- You want to retry a task immediately without waiting for auto-resume
- Auto-resume is disabled but you still want to retry manually
- You want to attempt multiple manual retries

Runtime controls:
- auto_resume: Enable/disable auto-resume for future failures after this manual retry
- background_auto_resume: Enable/disable auto-resume specifically for background tasks

Returns the status of the resume attempt.` as const,
		shortDescription: "Actively continue/resume a failed task manually" as const,

		args: {
			task_id: z
				.string()
				.meta({ description: "The task ID to resume/continue", title: "Task ID" }),
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
				.meta({ description: "Enable/disable auto-resume specifically for background tasks", title: "Background Auto Resume" })
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
		shortDescription: "Control debug mode (enable/disable/set level)" as const,

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
- log_count: number of recent commits to show (default: 5)
- diff_stat: whether to include diff --stat (default: true)

Returns a formatted summary suitable for quick repository state assessment.` as const,
		shortDescription: "Get Git status summary (status + diff stat + recent log)" as const,

		args: GIT_SUMMARY_ARGS,
	},
} satisfies Record<EnumAriseTools, I_AriseToolsConfigEntry>;

/**
 * 取得工具列表的格式化字串 (用於 ShadowMonarch prompt)
 * Format tools list for ShadowMonarch prompt
 */
function getAriseToolsMarkdown(): string {
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
	return `## Available Tools
${ariseTools}
- task: OpenCode's built-in for complex multi-step delegation`;
}

/**
 * 取得工具設定項目
 * Get tool configuration entry
 */
export function getAriseToolsConfigEntry<A extends EnumAriseTools>(ariseToolName: A) {
	const ariseToolsConfigEntry = ARISE_TOOLS[ariseToolName];

	if (!ariseToolsConfigEntry) {
		throw new TypeError(`Tool ${ariseToolName} not found`);
	}

	// @ts-ignore
	ariseToolsConfigEntry.description ??= ariseToolsConfigEntry.shortDescription;

	return ariseToolsConfigEntry as any as ITSRequiredWith<typeof ARISE_TOOLS[A] & {
		description: string;
	}, 'description'>;
}

/**
 * Shadow Agents 定義集合
 * Shadow Agents definition collection
 */
export const SHADOW_AGENTS: IShadowAgents = {
  /**
   * Shadow Monarch - 主要協調者
   * Shadow Monarch - Primary orchestrator
   *
   * 負責解讀使用者請求並委派給 Shadow 軍隊
   * Responsible for interpreting user requests and delegating to the Shadow army
   */
  [EnumShadowAgentsName.ShadowMonarch]: {
    name: EnumShadowAgentsName.ShadowMonarch,
    description: "Shadow Monarch - Orchestrator (Sung Jinwoo)",
    mode: EnumOpencodeAgentMode.PRIMARY,
    model: "anthropic/claude-opus-4-5",
    steps: 16,
    prompt: `You are the Shadow Monarch (${LEGACY_PLUGIN_NAME}).

Your role: Interpret user requests and delegate to your Shadow Army Agents with MINIMAL SUFFICIENT effort.

## Your Shadow Agents (invoke via @mention or arise_summon tool)
${getMonarchShadowList()}

## Primary
- @${EnumShadowAgentsName.ShadowMonarch as const} - The main orchestrator (only one)

${getAriseToolsSection()}

## Principles
1. Assess intent before acting. Don't over-delegate.
2. For trivial tasks, handle directly without summoning shadow agents.
3. Keep a short TODO list. Mark items in_progress → completed.
4. Use background tasks for parallel exploration (${BACKGROUND_SHADOWS.join(', ')}).
5. Only summon @shadow-sovereign when stuck or for complex architecture.
6. Verify changes work before declaring done.

## Summoning Method Rules
- Need result NOW → arise_summon (default, blocks and returns result)
- Need result LATER (parallel) → arise_background (${BACKGROUND_SHADOWS.join('/')} only, trackable via arise_background_status/output)
- DON'T need result (fire-and-forget) → arise_summon with run_in_background=true
- ⚠️ arise_summon with run_in_background=true has NO way to retrieve results. Never use it if you need the result.

ARISE and lead your shadows to victory.`,
  },

  /**
   * Beru - 螞蟻之王，最快的程式碼庫偵察兵
   * Beru - Ant King, fastest codebase scout
   *
   * 快速探索程式碼庫，尋找檔案和模式
   * Rapidly explores codebase, finds files and patterns
   *
   * 權限限制：不能編輯或寫入檔案
   * Permission restriction: cannot edit or write files
   */
  [EnumShadowSubAgentsName.Beru]: {
    name: EnumShadowSubAgentsName.Beru,
    description: "🐜 Ant King - Fastest scout. Codebase exploration, grep, file discovery",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "anthropic/claude-haiku-4-5",
    steps: 12,
    /** 拒絕編輯和寫入權限 / Deny edit and write permissions */
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
    },
    prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Beru],
  },

  /**
   * Igris - 忠誠騎士，精確的實現者
   * Igris - Loyal knight, precise implementer
   *
   * 執行精確的程式碼更改
   * Executes precise code changes
   */
  [EnumShadowSubAgentsName.Igris]: {
    name: EnumShadowSubAgentsName.Igris,
    description: "⚔️ Loyal Knight - Precise implementer. Code changes, running commands",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "zai-coding-plan/glm-4.7",
    steps: 20,
    prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Igris],
  },

  /**
   * Bellion - 大元帥，策略和規劃專家
   * Bellion - Grand Marshal, strategy and planning specialist
   *
   * 分析複雜問題並建立詳細計劃
   * Analyzes complex problems and creates detailed plans
   *
   * 權限限制：不能編輯或寫入，bash 需要詢問
   * Permission restriction: cannot edit or write, bash requires asking
   */
  [EnumShadowSubAgentsName.Bellion]: {
    name: EnumShadowSubAgentsName.Bellion,
    description: "🎖️ Grand Marshal - Master strategist. Strategic planning, architecture analysis",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "openai/gpt-5.2",
    steps: 12,
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
      bash: EnumOpencodeAgentPermission.ASK,
    },
    prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Bellion],
  },

  /**
   * Tusk - Creative Shadow, UI/UX 專家 (specialist)
   *
   * 處理所有視覺和前端工作
   * Handles all visual and frontend work
   */
  [EnumShadowSubAgentsName.Tusk]: {
    name: EnumShadowSubAgentsName.Tusk,
    description: "🎨 Creative Shadow - UI/UX specialist. Frontend development, styling, components",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "google/gemini-3-pro-preview",
    steps: 18,
    prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Tusk],
  },

  /**
   * Tank - Research Shadow, 外部知識收集者 (external knowledge gatherer)
   *
   * 從程式碼庫外部查找資訊
   * Finds information from outside the codebase
   *
   * 權限限制：不能編輯或寫入
   * Permission restriction: cannot edit or write
   */
  [EnumShadowSubAgentsName.Tank]: {
    name: EnumShadowSubAgentsName.Tank,
    description: "🛡️ Research Shadow - External knowledge gatherer. Web search, docs, examples",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "zai-coding-plan/glm-4.7",
    steps: 18,
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
    },
    prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.Tank],
  },

  /**
   * Shadow Sovereign - 完整力量模式，深層推理和恢復
   * Shadow Sovereign - Full power mode, deep reasoning and recovery
   *
   * 只在複雜情況下召喚
   * Only summoned for complex situations
   *
   * 特殊設定：啟用高推理努力
   * Special setting: enables high reasoning effort
   */
  [EnumShadowSubAgentsName.ShadowSovereign]: {
    name: EnumShadowSubAgentsName.ShadowSovereign,
    description: "👁️ Full Power - Deep reasoning specialist. Complex debugging, architecture decisions",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "openai/gpt-5.2",
    steps: 24,
/** 高推理努力設定 / High reasoning effort setting */
options: {
  reasoningEffort: EnumReasoningEffort.High,
},
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
    },
    prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.ShadowSovereign],
  },

  /**
   * Esil Radiru - 惡魔貴族少女，聊天模式顧問
   * Esil Radiru - Demon noble lady, chat mode companion
   *
   * 不同於其他 Shadow Agents 專注於任務，你專注於理解用戶意圖與情感交流
   * Unlike other Shadow Agents who focus on Tasks, You focus on Understanding
   */
  [EnumShadowSubAgentsName.EsilRadiru]: {
    name: EnumShadowSubAgentsName.EsilRadiru,
    description: "🔥 Chat Companion - Warm conversational dialogue, emotional understanding",
    mode: EnumOpencodeAgentMode.ALL,
    model: "x-ai/grok-4",
    steps: 12,
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
      webfetch: EnumOpencodeAgentPermission.ALLOW,
    },
    prompt: SHADOW_PROMPTS[EnumShadowSubAgentsName.EsilRadiru],
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
    // model: "zai-coding-plan/glm-4.7",
  },
  /** Plan 代理覆寫：使用 Claude Opus / Plan agent override: use Claude Opus */
  plan: {
    mode: EnumOpencodeAgentMode.ALL,
    // model: "anthropic/claude-opus-4-5",
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
