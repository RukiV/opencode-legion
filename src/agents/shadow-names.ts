import { ITSTypeAndStringLiteral } from "ts-type";

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
	ShadowMonarch = 'shadow-monarch',
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

export type IAllShadowAgentsName = EnumShadowAgentsName | EnumShadowSubAgentsName;

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
] as const;

/**
 * IAllowedShadowName - 使用 ITSTypeAndStringLiteral 將枚舉轉換為字面量類型
 * IAllowedShadowName - Use ITSTypeAndStringLiteral to convert enum to literal type
 */
export type IAllowedShadowName = ITSTypeAndStringLiteral<EnumShadowSubAgentsName>;
