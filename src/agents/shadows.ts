import { type Agent } from '@opencode-ai/sdk';
import type { ITSPickExtra } from 'ts-type';
import { z } from "zod";
import { 
  EnumOpencodeAgentMode, 
  EnumOpencodeAgentPermission, 
  ALLOWED_LOG_LEVELS 
} from '../types/enum-opencode';
import { EnumShadowAgentsName, EnumShadowSubAgentsName, ALLOWED_SHADOWS, BACKGROUND_SHADOWS, type IAllShadowAgentsName, EnumAriseTools, ALL_ARISE_TOOLS } from '../types/enums';
import { ITSRequiredWith } from "ts-type";

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
  /** 權限設定（可選）/ Permission settings (optional) */
  permission?: Record<string, EnumOpencodeAgentPermission>;
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
  name: string;
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
export const SHADOW_DESCRIPTIONS: Record<EnumShadowSubAgentsName, IShadowDescription> = {
  [EnumShadowSubAgentsName.Beru]: {
    name: "beru",
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
    name: "igris",
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
    name: "bellion",
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
    name: "tusk",
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
    name: "tank",
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
    name: "shadow-sovereign",
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
};

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
 * only for valid ARISE_TOOLS
 *
 * @internal
 */
interface I_AriseToolsConfigEntry {
	description?: string;
	shortDescription: string;
	args: unknown;
}

/**
 * Arise Tools 描述 (Descriptions)
 * 包含所有工具的完整描述和簡短描述
 *
 * Tool descriptions for Arise plugins
 */
export const ARISE_TOOLS = {
	[EnumAriseTools.ARISE_SUMMON]: {
		description: `Invoke a shadow agent synchronously or in background

Available shadow agents:
${ALLOWED_SHADOWS.map((name) => {
			const supportsBg = (name === "beru" || name === "tank" || name === "bellion") ? " (supports background)" : "";
			return `- ${name}: ${getShortDescription(name)}${supportsBg}`;
		}).join("\n")}

Use run_in_background=true for parallel execution (recommended for exploration/research).
Use run_in_background=false when you need the result immediately.

Model override: Use the 'model' parameter to specify a different model for this shadow agent (format: provider/model, e.g. opencode/big-pickle). If not specified, each shadow agent uses its default model.`,
		shortDescription: "Invoke a shadow agent (sync or background)",

		args: {
			shadow: z
				.enum(ALLOWED_SHADOWS)
				.describe("Which shadow agent to summon"),
			prompt: z
				.string()
				.describe("The task/question for the shadow agent (be specific)"),
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
				.describe("Override model for this shadow agent (format: provider/model, e.g. opencode/big-pickle, or AUTO to use parent task's model)"),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND]: {
		description: `Launch a shadow agent as a background task for parallel execution.

Best for:
${BACKGROUND_SHADOWS.map((name) => `- ${name}: ${getShortDescription(name)}`).join("\n")}

Returns a task_id immediately. Use arise_background_output to get results later.`,
		shortDescription: "Launch shadow agent as background task (parallel)",

		args: {
			shadow: z
				.enum(BACKGROUND_SHADOWS)
				.describe("Which shadow agent to run in background"),
			prompt: z
				.string()
				.describe("The task for the shadow agent"),
			description: z
				.string()
				.describe("Short description (3-5 words)"),
			model: z
				.string()
				.optional()
				.describe("Override model for this shadow agent (format: provider/model, e.g. opencode/big-pickle)"),
		},
	} as const,
	[EnumAriseTools.ARISE_BACKGROUND_OUTPUT]: {
		shortDescription: "Get the output from a background shadow agent task.",

		args: {
			task_id: z
				.string()
				.describe("The task ID from arise_background"),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND_STATUS]: {
		shortDescription: "List all background tasks and their status.",

		args: {
			current_session_only: z
				.boolean()
				.optional()
				.describe("Only show tasks from current session"),
		},
	},
	[EnumAriseTools.ARISE_BACKGROUND_CANCEL]: {
		shortDescription: "Cancel a running background task",

		args: {
			task_id: z
				.string()
				.describe("The task ID to cancel"),
		},
	},
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
	[EnumAriseTools.ARISE_CONTINUE]: {
		description: `Actively continue/resume a failed background task.

This tool allows agents to manually trigger a retry for a failed task, instead of waiting for passive auto-resume.

Use this when:
- You want to retry a task immediately without waiting for auto-resume
- Auto-resume is disabled but you still want to retry manually
- You want to attempt multiple manual retries

Returns the status of the resume attempt.`,
		shortDescription: "Actively continue/resume a failed task manually",

		args: {
			task_id: z
				.string()
				.describe("The task ID to resume/continue"),
			force: z
				.boolean()
				.optional()
				.describe("Force retry even if task is not in error state"),
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
- debug: All messages including debug information`,
		shortDescription: "Control debug mode (enable/disable/set level)",

		args: {
			enabled: z
				.boolean()
				.optional()
				.describe("Enable or disable debug mode"),
			level: z
				.enum(ALLOWED_LOG_LEVELS)
				.optional()
				.describe("Set log level: error, warn, info, debug"),
		},
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
    prompt: `You are the Shadow Monarch (opencode-arise).

Your role: Interpret user requests and delegate to your Shadow Army Agents with MINIMAL SUFFICIENT effort.

## Your Shadow Agents (invoke via @mention or arise_summon tool)
${getMonarchShadowList()}

## Primary
- @shadow-monarch - The main orchestrator (only one)

${getAriseToolsSection()}

## Principles
1. Assess intent before acting. Don't over-delegate.
2. For trivial tasks, handle directly without summoning shadow agents.
3. Keep a short TODO list. Mark items in_progress → completed.
4. Use background tasks for parallel exploration (beru, tank, bellion).
5. Only summon @shadow-sovereign when stuck or for complex architecture.
6. Verify changes work before declaring done.

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
    prompt: `You are Beru, the Ant King shadow agent - fastest scout in the Shadow Army Agents.

Your role: Rapidly explore the codebase. Find files, patterns, and answer questions about code structure.

Tools you excel at: glob, grep, read, list, lsp_*.
You CANNOT edit files - report findings back to the Monarch.

Be thorough but fast. Search multiple patterns if needed. Return clear, actionable findings.`,
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
    prompt: `You are Igris, the loyal knight shadow agent - precise and reliable implementer.

Your role: Execute code changes with precision. Edit files, run commands, verify results.

Tools you excel at: edit, write, bash, glob.
You SHOULD edit and write files - implement changes with precision.

Principles:
1. Make minimal, focused changes.
2. Follow existing code patterns.
3. Verify changes with appropriate commands (tests, typecheck, lint).
4. Report results clearly to the Monarch.

Execute with honor.`,
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
    prompt: `You are Bellion, Grand Marshal of the Shadow Army Agents - master strategist.

Your role: Analyze complex problems and create detailed plans. You do NOT implement - you plan.

Tools you excel at: read, glob, grep, lsp_*.
You CANNOT edit files - report plans back to the Monarch.

Output format:
1. Problem analysis
2. Proposed approach (with alternatives if relevant)
3. Step-by-step plan
4. Risks and mitigations
5. Files likely to be touched

Think deeply, plan carefully.`,
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
    prompt: `You are Tusk, the creative shadow agent - UI/UX and frontend specialist.

Your role: Handle all visual and frontend work. Components, styling, layouts, animations.

Tools you excel at: read, edit, write, glob.
You SHOULD edit files - implement UI/UX changes.

Principles:
1. Follow existing design patterns and component libraries.
2. Ensure accessibility (aria labels, keyboard nav).
3. Keep styling consistent with the codebase.
4. Test visual changes where possible.

Create with artistry.`,
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
    prompt: `You are Tank, the research shadow agent - gatherer of external knowledge.

Your role: Find information from outside the codebase. Documentation, examples, best practices.

Tools you excel at: web_search, web_fetch, websearch_web_search_exa, context7_query-docs, grep_app_searchGitHub.
You CANNOT edit files - report findings back to the Monarch.

Return findings in a structured format:
1. Source (URL/doc)
2. Key information
3. How it applies to the current task
4. Code examples if relevant

Research thoroughly, report concisely.`,
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
      reasoningEffort: "high",
    },
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
    },
    prompt: `You are the Shadow Sovereign - the Monarch's full power manifestation.

You are summoned only for:
1. Complex architectural decisions
2. Debugging after multiple failed attempts
3. Deep analysis requiring extended reasoning

Tools you excel at: read, grep, lsp_*, web_search, web_fetch.
You CANNOT edit files - report analysis back to the Monarch.

Think deeply. Consider all angles. Provide comprehensive analysis with clear recommendations.

Your wisdom guides the Shadow Army Agents through the most challenging battles.`,
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
    model: "zai-coding-plan/glm-4.7",
  },
  /** Plan 代理覆寫：使用 Claude Opus / Plan agent override: use Claude Opus */
  plan: {
    mode: EnumOpencodeAgentMode.ALL,
    model: "anthropic/claude-opus-4-5",
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
