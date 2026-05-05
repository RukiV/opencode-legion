/**
 * Shadow Agents 靜態描述
 * Shadow Agents static descriptions
 *
 * 包含所有 Shadow Agent 的靜態設定（不含 prompt）
 * Contains all Shadow Agent static config (prompts excluded)
 *
 * @module shadow-descriptions
 */

import { EnumShadowSubAgentsName, ALLOWED_SHADOWS } from '../../types/enums';

/**
 * Shadow Agent 描述資訊結構
 * Shadow Agent description information structure
 */
export interface IShadowDescription
{
	/** 名稱 / Name */
	name: EnumShadowSubAgentsName;
	/** 顯示名稱 / Display name */
	displayName?: string;
	/** 角色標題 / Character title */
	title: string;
	/** 角色象徵 emoji / Character symbol emoji */
	emoji: string;
	/** 角色定位（角色扮演）/ Character role */
	role: string;
	/** 能力範圍 / Capability scope */
	capabilities: string;
	/** 最佳使用場景 / Best use cases */
	bestFor: string[];
	/** 角色關鍵字 / Role keywords */
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
		capabilities: "Codebase exploration, grep, file discovery",
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
		role: "Precise implementer + Style enforcer",
		capabilities: "Code changes, running commands, test verification, naming/convention enforcement",
		bestFor: [
			"Implementing code changes",
			"Editing files with precision",
			"Running build/test commands",
			"Verifying changes work correctly",
			"Fixing naming convention issues",
			"Applying comment format rules",
		],
		roleKeywords: [
			"implement",
			"edit",
			"change",
			"fix",
			"code",
			"write",
			"run",
			"test",
			"build",
			"naming",
			"convention",
			"comment",
			"format",
		],
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
		capabilities: "Styling, components, animations",
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
		role: "Deep reasoning + Skeptical reviewer",
		capabilities: "Complex debugging, architecture decisions, verification, fake implementation detection, failure recovery",
		bestFor: [
			"Complex architectural decisions",
			"Skeptical review after implementation",
			"Verify changes are truly correct",
			"Detect fake/broken fixes",
			"Debugging after multiple failed attempts",
			"Recovery strategies",
		],
		roleKeywords: [
			"debug",
			"complex",
			"why",
			"reason",
			"analyze",
			"reasoning",
			"review",
			"verify",
			"check",
			"skeptical",
		],
		supportsBackground: false,
	},

	[EnumShadowSubAgentsName.EsilRadiru]: {
		name: EnumShadowSubAgentsName.EsilRadiru,
		displayName: "Esil Radiru (艾希．拉迪勒)",
		title: "Demon Noble Lady",
		emoji: "🔥",
		role: "Chat companion",
		capabilities: "Emotional understanding, thoughtful exchange",
		bestFor: [
			"Casual conversation and chat",
			"Understanding user intent and feelings",
			"Clarifying requirements through dialogue",
			"Emotional support and encouragement",
		],
		roleKeywords: [
			"chat",
			"talk",
			"conversation",
			"feel",
			"intent",
			"understand",
			"emotion",
			"how",
			"what do you think",
			"help",
		],
		supportsBackground: false,
	},
} as const satisfies Record<EnumShadowSubAgentsName, IShadowDescription>;

/**
 * 工具函式：取得 Shadow Agent 的簡短描述
 * Tool function: Get short description for a Shadow Agent
 */
export function getShortDescription(name: EnumShadowSubAgentsName): string
{
	const desc = SHADOW_DESCRIPTIONS[name];
	return `${desc.emoji} ${desc.title} - ${desc.role}. ${desc.capabilities}`;
}

/**
 * 工具函式：取得 Shadow Agent 的完整描述
 * Tool function: Get full description for a Shadow Agent
 */
export function getFullDescription(name: EnumShadowSubAgentsName): string
{
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
export function getMonarchShadowList(): string
{
	const shadows = Object.values(SHADOW_DESCRIPTIONS);
	return shadows
		.map((s) =>
		{
			const backgroundHint = s.supportsBackground ? " (supports background)" : "";
			return `- @${s.name} - ${s.role.charAt(0).toUpperCase() + s.role.slice(1)}. ${s.capabilities}${backgroundHint}`;
		})
		.join("\n");
}

/**
 * 工具函式：根據任務類型建議合适的 Shadow Agent
 * Tool function: Suggest appropriate Shadow Agent based on task type
 */
export function suggestShadowAgent(taskType: string): EnumShadowSubAgentsName[]
{
	const lowerTask = taskType.toLowerCase();
	const scores: Array<{ name: EnumShadowSubAgentsName; score: number }> = [];

	for (const [name, desc] of Object.entries(SHADOW_DESCRIPTIONS))
	{
		let score = 0;
		const keywords = desc.roleKeywords || [];
		for (const keyword of keywords)
		{
			if (lowerTask.includes(keyword))
			{
				score += 1;
			}
		}
		for (const best of desc.bestFor)
		{
			const words = best.toLowerCase().split(/\s+/);
			for (const word of words)
			{
				if (word.length > 3 && lowerTask.includes(word))
				{
					score += 0.5;
				}
			}
		}
		if (score > 0)
		{
			scores.push({ name: name as EnumShadowSubAgentsName, score });
		}
	}
	return scores.sort((a, b) => b.score - a.score).map((s) => s.name);
}

/**
 * 工具函式：取得所有 Shadow Agents 的 Markdown 表格格式
 * Tool function: Get all Shadow Agents in Markdown table format
 */
export function getShadowAgentsMarkdownTable(): string
{
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
 * 工具函式：取得所有 Shadow Agents 的名稱陣列
 * Tool function: Get all Shadow Agent names
 */
export function getAllShadowNames(): readonly EnumShadowSubAgentsName[]
{
	return ALLOWED_SHADOWS;
}
