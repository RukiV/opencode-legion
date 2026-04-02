import type { ITSTypeAndStringLiteral } from 'ts-type';

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

	/**
	 * 🔥 Esil Radiru
	 *
	 * 惡魔貴族少女，聊天模式顧問
	 * Demon noble lady, chat mode companion
	 *
	 * 渴望理解人類情感，特別是「思念」與「愛」
	 * 善於傾聽、對話、情感交流
	 * Longing for understanding human emotions, especially "longing" and "love"
	 * Good at listening, conversation, emotional exchange
	 */
	EsilRadiru = "esil-radiru",
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
	EnumShadowSubAgentsName.EsilRadiru,
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

/**
 * Hook 名稱列舉
 * Hook name enum
 *
 * 定義所有可用的生命週期 Hook 名稱
 * Defines all available lifecycle hook names
 */
export const enum EnumHookName {
	/** 橫幅顯示 Hook / Arise Banner Hook */
	AriseBanner = "arise-banner",
	/** 輸出整形 Hook / Output Shaper Hook */
	OutputShaper = "output-shaper",
	/** 緊湊化保留 Hook / Compaction Preserver Hook */
	CompactionPreserver = "compaction-preserver",
	/** 待辦事項強制 Hook / Todo Enforcer Hook */
	TodoEnforcer = "todo-enforcer",
}

/**
 * Hook 名稱陣列
 * Hook names array
 *
 * 用於建立 Zod schema
 * Used for creating Zod schema
 */
export const ALLOWED_HOOKS = [
	EnumHookName.AriseBanner,
	EnumHookName.OutputShaper,
	EnumHookName.CompactionPreserver,
	EnumHookName.TodoEnforcer,
] as const;

/**
 * Auto-resume 錯誤處理行為列舉
 * Auto-resume error handling behavior enum
 *
 * 定義 auto_resume 任務失敗時的行為
 * Defines behavior when auto_resume task fails
 */
export enum EnumAutoResumeOnError {
	/** 忽略錯誤，繼續執行 / Ignore error, continue execution */
	Ignore = "ignore",
	/** 重試任務 / Retry the task */
	Retry = "retry",
	/** 通知使用者 / Notify user */
	Notify = "notify",
}

/**
 * Auto-resume 目標任務類型列舉
 * Auto-resume target task type enum
 *
 * 定義哪些任務類型啟用 auto-resume
 * Defines which task types enable auto-resume
 */
export enum EnumAutoResumeTarget {
	/** 僅背景任務 / Background tasks only */
	Background = "background",
	/** 所有任務 / All tasks */
	All = "all",
}

/**
 * Auto-resume 錯誤處理行為允許值陣列
 * Auto-resume error handling behavior allowed values array
 *
 * 用於建立 Zod schema
 * Used for creating Zod schema
 */
export const ALLOWED_AUTO_RESUME_ON_ERROR = [
	EnumAutoResumeOnError.Ignore,
	EnumAutoResumeOnError.Retry,
	EnumAutoResumeOnError.Notify,
] as const;

/**
 * Auto-resume 目標任務類型允許值陣列
 * Auto-resume target task type allowed values array
 *
 * 用於建立 Zod schema
 * Used for creating Zod schema
 */
export const ALLOWED_AUTO_RESUME_TARGET = [
	EnumAutoResumeTarget.Background,
	EnumAutoResumeTarget.All,
] as const;

/**
 * 背景任務狀態列舉
 * Background task status enumeration
 */
export enum BackgroundTaskStatus
{
	/** 執行中 / Running */
	Running = "running",
	/** 已完成 / Completed */
	Completed = "completed",
	/** 發生錯誤 / Error */
	Error = "error",
}

/**
 * Arise 工具名稱列舉
 * Arise tool name enum
 *
 * 定義所有 OpencodeArise 插件提供的工具 key
 * Enum of all Arise tool names
 */
export enum EnumAriseTools {
	/** 同步或非同步召喚 shadow agent 執行任務 / Invoke a shadow agent synchronously or in background */
	ARISE_SUMMON = "arise_summon",
	/** 以背景任務方式啟動 shadow agent (平行執行) / Launch shadow agent as background task (parallel) */
	ARISE_BACKGROUND = "arise_background",
	/** 取得背景任務的輸出結果 / Get result from background task */
	ARISE_BACKGROUND_OUTPUT = "arise_background_output",
	/** 列出所有背景任務及其狀態 / List all background tasks and their status */
	ARISE_BACKGROUND_STATUS = "arise_background_status",
	/** 取消執行中的背景任務 / Cancel a running background task */
	ARISE_BACKGROUND_CANCEL = "arise_background_cancel",
	/** 列出所有可用的模型 / List all available models */
	ARISE_LIST_MODELS = "arise_list_models",
	/** 主動繼續執行失敗的任務 / Actively continue/resume a failed task */
	ARISE_CONTINUE = "arise_continue",
	/** 控制除錯模式 (開啟/關閉/設定等級) / Control debug mode (enable/disable/set level) */
	ARISE_DEBUG = "arise_debug",
	/** 一次性取得 Git 狀態摘要（status、diff stat、log）/ Get Git status summary in one shot */
	ARISE_GIT_SUMMARY = "arise_git_summary",
}

/**
 * 所有 Arise 工具陣列
 * All Arise tools array
 */
export const ALL_ARISE_TOOLS = [
	EnumAriseTools.ARISE_SUMMON,
	EnumAriseTools.ARISE_BACKGROUND,
	EnumAriseTools.ARISE_BACKGROUND_OUTPUT,
	EnumAriseTools.ARISE_BACKGROUND_STATUS,
	EnumAriseTools.ARISE_BACKGROUND_CANCEL,
	EnumAriseTools.ARISE_LIST_MODELS,
	EnumAriseTools.ARISE_CONTINUE,
	EnumAriseTools.ARISE_DEBUG,
	EnumAriseTools.ARISE_GIT_SUMMARY,
] as const satisfies EnumAriseTools[];
