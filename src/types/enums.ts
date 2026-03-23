import type { ITSTypeAndStringLiteral } from 'ts-type';

/**
 * Shadow Agent 模式
 * Shadow Agent mode
 *
 * - PRIMARY: 主代理（Monarch 使用）
 * - SUBAGENT: 子代理（其他 Shadow 使用）
 * - ALL: 所有模式
 */
export enum EnumOpencodeAgentMode {
	/** 主代理模式 - 唯一的主要協調者 / Primary mode - the only main coordinator */
	PRIMARY = "primary",
	/** 子代理模式 - 被 Monarch 召喚的 Shadow / Subagent mode - Shadows summoned by Monarch */
	SUBAGENT = "subagent",
	/** 所有模式 - 可同時作為主代理和子代理 / All modes - can be both primary and subagent */
	ALL = "all",
}

/**
 * Shadow Agent 權限等級
 * Shadow Agent permission level
 *
 * 控制 Shadow 代理對特定操作的權限
 * Controls Shadow agent permissions for specific operations
 *
 * - ALLOW: 允許執行
 * - DENY: 拒絕執行
 * - ASK: 詢問使用者
 */
export enum EnumOpencodeAgentPermission {
	/** 允許執行 / Allow execution */
	ALLOW = "allow",
	/** 拒絕執行 / Deny execution */
	DENY = "deny",
	/** 詢問使用者 / Ask user */
	ASK = "ask",
}

/**
 * Shadow Monarch 名稱列舉
 * 用於識別主要協調者
 *
 * Shadow Monarch name enum
 * Used to identify the primary orchestrator
 */
export const enum EnumShadowAgentsName
{
	/**
	 * 👑 Shadow Monarch
	 *
	 * 負責任務協調與分配
	 * Orchestration, delegation decisions
	 */
	ShadowMonarch = 'monarch',
}

/**
 * Shadow agent 名稱列舉
 * 用於限制可呼叫的 shadow agents
 *
 * Shadow agent name enum
 * Used to restrict callable shadow agents
 */
export const enum EnumShadowSubAgentsName
{
	/**
	 * 🐜 Ant King Scout
	 *
	 * 快速的程式碼探索
	 * Fast codebase exploration, grep, file discovery
	 */
	Beru = "beru",

	/**
	 * ⚔️ Loyal Knight
	 *
	 * 精確的程式碼實作
	 * Precise implementation, code changes
	 */
	Igris = "igris",

	/**
	 * 🎖️ Grand Marshal
	 *
	 * 策略規劃與架構分析
	 * Strategic planning, architecture analysis
	 */
	Bellion = "bellion",

	/**
	 * 🎨 Creative Shadow
	 *
	 * UI/UX與前端
	 * UI/UX, frontend, styling
	 */
	Tusk = "tusk",

	/**
	 * 🛡️ Research Shadow
	 *
	 * 外部文檔與網路搜尋
	 * External docs, web search, examples
	 */
	Tank = "tank",

	/**
	 * 👁️ Full Power
	 *
	 * 深度推理與複雜Debug
	 * Deep reasoning, complex debugging
	 */
	ShadowSovereign = "shadow-sovereign",
}

/**
 * Shadow agents 陣列 - 使用枚舉值
 * Shadow agents array - using enum values
 */
export const ALLOWED_SHADOWS = [
	EnumShadowSubAgentsName.Beru,
	EnumShadowSubAgentsName.Igris,
	EnumShadowSubAgentsName.Bellion,
	EnumShadowSubAgentsName.Tusk,
	EnumShadowSubAgentsName.Tank,
	EnumShadowSubAgentsName.ShadowSovereign,
] as const satisfies EnumShadowSubAgentsName[];

export const BACKGROUND_SHADOWS = [
	EnumShadowSubAgentsName.Beru,
	EnumShadowSubAgentsName.Tank,
	EnumShadowSubAgentsName.Bellion,
] as const satisfies EnumShadowSubAgentsName[];

export type IBackgroundShadowAgentsName = typeof BACKGROUND_SHADOWS[number];

export type IAllShadowAgentsName = EnumShadowAgentsName | EnumShadowSubAgentsName;

export const ALL_SHADOW_AGENTS_NAME = [
	EnumShadowAgentsName.ShadowMonarch as const,
	...ALLOWED_SHADOWS,
] as const satisfies IAllShadowAgentsName[];

/**
 * IAllowedShadowName - 使用 ITSTypeAndStringLiteral 將枚舉轉換為字面量類型
 * IAllowedShadowName - Use ITSTypeAndStringLiteral to convert enum to literal type
 */
export type IAllowedShadowName = ITSTypeAndStringLiteral<EnumShadowSubAgentsName>;
