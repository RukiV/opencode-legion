import { z } from "zod";
import { ALL_ARISE_TOOLS, ALL_SHADOW_AGENTS_NAME, ALLOWED_COLLABORATE_MODES } from "../types/enums";
import { ALLOWED_HOOKS, EnumHookName } from "../types/enums";
import { ALLOWED_LOG_LEVELS, EnumLogLevel } from "../types/enum-opencode";
import {
	ALLOWED_AUTO_RESUME_ON_ERROR,
	ALLOWED_AUTO_RESUME_TARGET,
	EnumAutoResumeOnError,
	EnumAutoResumeTarget,
} from "../types/enums";
import {
	AUTO_MODEL,
	DEFAULT_SAFETY_PROMPT,
	DEFAULT_POLL_INTERVAL,
	DEFAULT_RETRY_DELAY_INCREMENT,
	DEFAULT_RETRY_DELAY_MAX,
	MAX_COLLABORATE_TOTAL_ROUNDS,
	MAX_COLLABORATE_MAX_CONCURRENT,
} from "../types/const-default";
import { extractDefaultsFromJSONSchema } from "../utils/type/zod-defaults";
import { unwrapZodAll, unwrapZodAllShape } from "../utils/type/zod-schema-helpers";

/**
 * Shadow Agent 名稱 Zod Schema
 *
 * 定義所有可用的 Shadow Agent 名稱
 * Defines all available Shadow Agent names
 *
 * @see IAllShadowAgentsName
 */
export const ShadowName = z.enum(ALL_SHADOW_AGENTS_NAME).meta({
	description: "Shadow Agent 名稱 / Shadow Agent name",
	title: "Shadow Agent Name",
});

/**
 * 定義所有可用的生命週期 Hook
 * Defines all available lifecycle hooks
 */
export const HookName = z.enum(ALLOWED_HOOKS).meta({
	description: "生命週期 Hook 名稱 / Lifecycle hook name",
	title: "Hook Name",
});

/**
 * Auto-resume 錯誤時的行為 Schema
 * Auto-resume on error behavior Schema
 *
 * 定義 auto_resume 任務失敗時的行為
 * Defines behavior when auto_resume task fails
 */
export const AutoResumeOnError = z.enum(ALLOWED_AUTO_RESUME_ON_ERROR).meta({
	description: "錯誤時的行為：ignore=忽略、retry=重試、notify=通知 / Behavior on error: ignore=ignore, retry=retry, notify=notify",
	title: "On Error",
});

/**
 * Auto-resume 目標任務類型 Schema
 * Auto-resume target task type Schema
 *
 * 定義哪些任務類型啟用 auto-resume
 * Defines which task types enable auto-resume
 */
export const AutoResumeTarget = z.enum(ALLOWED_AUTO_RESUME_TARGET).meta({
	description: "目標任務類型：background=背景任務、all=所有任務 / Target task type: background=background tasks, all=all tasks",
	title: "Target",
});

/**
 * Auto-resume 自訂提示 Schema
 * Auto-resume custom prompts Schema
 *
 * 定義自訂提示訊息的結構
 * Defines the structure of custom prompt messages
 */
const AutoResumePrompts = z
	.object({
		/** 首次重試時的提示 / Prompt for first retry */
		retry: z.string()
			.meta({
				description: "首次重試時的提示 / Prompt for first retry",
				title: "Retry Prompt",
			}).optional(),
		/** 最終重試時的提示 / Prompt for final retry */
		final: z.string()
			.meta({
				description: "最終重試時的提示 / Prompt for final retry",
				title: "Final Prompt",
			}).optional(),
		/** 自定義提示陣列，按順序使用 / Custom prompt array, used in order */
		custom: z.array(z.string())
			.meta({
				description: "自定義提示陣列，按順序使用 / Custom prompt array, used in order",
				title: "Custom Prompts",
			}).optional(),
	})
	.meta({
		description: "自訂提示訊息 / Custom prompts",
		title: "Prompts",
	})
	.optional();

/**
 * Auto-resume 設定 Schema
 * Auto-resume settings Schema
 *
 * 定義 auto_resume 的完整結構
 * Defines the complete structure of auto_resume
 *
 * 屬性使用 snake_case 命名：
 * - enabled: 是否啟用
 * - max_retries: 最大重試次數
 * - retry_delay: 重試延遲（毫秒）
 * - on_error: 錯誤時的行為
 * - target: 目標任務類型
 * - prompts: 自訂提示訊息
 */
export const AutoResumeConfig = z
	.object({
		/** 是否啟用自動繼續任務（預設 false）/ Enable auto resume (default false) */
		enabled: z.boolean()
			.meta({
				description: "是否啟用自動繼續任務 / Enable auto resume",
				title: "Enabled",
			}).default(false),
		/** 最大重試次數（預設 3）/ Max retry count (default 3) */
		max_retries: z.number()
			.meta({
				description: "最大重試次數 / Maximum retry count",
				title: "Max Retries",
			}).default(3).optional(),
		/** 重試延遲（毫秒，預設 5000）/ Retry delay in ms (default 5000) */
		retry_delay: z.number()
			.meta({
				description: "重試延遲（毫秒）/ Retry delay in milliseconds",
				title: "Retry Delay",
			}).default(5000).optional(),
		/**
		 * Backoff 策略 (預設 fixed)
		 * Backoff strategy (default fixed)
		 *
		 * fixed: 每次重試使用相同延遲 / same delay for each retry
		 * exponential: 每次重試延遲倍增：delay * multiplier^attempt / delay doubles each retry
		 */
		backoff_strategy: z.enum(["fixed", "exponential"])
			.meta({
				description: "Backoff 策略：fixed=固定延遲、exponential=指數倍增 / Backoff strategy: fixed=fixed delay, exponential=exponential increase",
				title: "Backoff Strategy",
			}).default("fixed").optional(),
		/** Backoff 倍增因子（預設 2，僅 exponential 策略使用） / Backoff multiplier (default 2, only for exponential strategy) */
		backoff_multiplier: z.number()
			.meta({
				description: "Backoff 倍增因子（僅 exponential 策略）/ Backoff multiplier (only for exponential strategy)",
				title: "Backoff Multiplier",
			}).default(2).optional(),
		/** Backoff 最大延遲（毫秒，預設 300000 = 5 分鐘）/ Max backoff delay in ms (default 300000 = 5 min) */
		backoff_max_delay: z.number()
			.meta({
				description: "Backoff 最大延遲（毫秒）/ Maximum backoff delay in milliseconds",
				title: "Backoff Max Delay",
			}).default(300000).optional(),
		/** 錯誤時的行為（預設 ignore）/ Behavior on error (default ignore) */
		on_error: AutoResumeOnError
			.meta({
				description: "錯誤時的行為：ignore=忽略、retry=重試、notify=通知 / Behavior on error: ignore=ignore, retry=retry, notify=notify",
				title: "On Error",
			}).default(EnumAutoResumeOnError.Ignore),
		/** 哪些任務類型啟用 auto-resume（可選）/ Which task types enable auto-resume (optional) */
		target: AutoResumeTarget
			.meta({
				description: "目標任務類型：background=背景任務、all=所有任務 / Target task type: background=background tasks, all=all tasks",
				title: "Target",
			}).default(EnumAutoResumeTarget.Background),
		/** 自訂提示訊息（可選）/ Custom prompts (optional) */
		prompts: AutoResumePrompts,
		/**
		 * 安全檢查提示（可選）/ Safety check prompt (optional)
		 *
		 * 重要：新增欄位時，請確保 config-defaults.ts 也會自動產生對應的預設值
		 * Important: When adding new fields, ensure config-defaults.ts will auto-generate corresponding defaults
		 * @see build:config-defaults 腳本會自動從 schema 提取預設值
		 */
		safety_prompt: z.string()
			.meta({
				description: "自動繼續任務前发送的安全检查提示 / Safety check prompt before auto resume",
				title: "Safety Prompt",
			}).default(DEFAULT_SAFETY_PROMPT).optional(),
	})
	.meta({
		description: "自動繼續任務設定 / Auto resume settings",
		title: "Auto Resume",
	});

/**
 * 背景任務定時設定 Schema
 * Background task timing settings Schema
 *
 * 定義輪詢和重試相關的定時設定
 * Defines timing settings for polling and retry
 */
const BackgroundTiming = z
	.object({
		/** 輪詢間隔（毫秒，預設 2000）/ Polling interval in ms (default 2000) */
		poll_interval: z.number()
			.meta({
				description: "輪詢間隔（毫秒）/ Polling interval in milliseconds",
				title: "Poll Interval",
			}).default(DEFAULT_POLL_INTERVAL),
		/** 重試延遲遞增量（毫秒，預設 5000）/ Retry delay increment in ms (default 5000) */
		retry_delay_increment: z.number()
			.meta({
				description: "重試延遲遞增量（毫秒）/ Retry delay increment in milliseconds",
				title: "Retry Delay Increment",
			}).default(DEFAULT_RETRY_DELAY_INCREMENT),
		/** 重試延遲最大值（毫秒，預設 60000）/ Max retry delay in ms (default 60000) */
		retry_delay_max: z.number()
			.meta({
				description: "重試延遲最大值（毫秒）/ Maximum retry delay in milliseconds",
				title: "Retry Delay Max",
			}).default(DEFAULT_RETRY_DELAY_MAX),
	})
	.meta({
		description: "背景任務定時設定 / Background task timing settings",
		title: "Timing",
	});

/**
 * 允許針對特定代理覆寫全域預設值
 * Allows overriding global defaults for specific agents
 */
export const AgentOverride = z
	.object({
		/** 模型名稱（可選）/ Model name (optional) */
		model: z.string()
			.meta({
				description: "要使用的模型名稱 / Model name to use",
				title: "Model",
			}).optional(),
		/** 是否停用該代理（可選）/ Whether to disable this agent (optional) */
		disabled: z.boolean()
			.meta({
				description: "是否停用此代理 / Whether to disable this agent",
				title: "Disabled",
			}).optional(),
		/** 系統提示補充（可選）/ System prompt supplement (optional) */
		system_prompt_addon: z.string()
			.meta({
				description: "系統提示補充內容 / System prompt supplement content",
				title: "System Prompt Addon",
			}).optional(),
	})
	.extend(BackgroundTiming.partial().shape)
	.extend({
		/** 自動繼續任務設定（可選）/ Auto resume settings (optional) */
		auto_resume: AutoResumeConfig.extend(unwrapZodAllShape(AutoResumeConfig)).optional(),
	})
	.meta({
		description: "代理覆寫設定 / Agent override settings",
		title: "Agent Override",
	});
;
/**
 * Arise 主配置結構
 * Arise main configuration schema
 */
export const AriseConfigSchema = z
	.object({
		/** JSON Schema URI（可選）/ JSON Schema URI (optional) */
		$schema: z.string()
			.meta({
				description: "JSON Schema URI / JSON Schema URI",
				title: "Schema",
			}).optional(),
		/** 要停用的 Shadow Agents 列表（可選）/ List of Shadow Agents to disable (optional) */
		disabled_shadows: z.array(ShadowName)
			.meta({
				description: "要停用的 Shadow Agents 列表 / List of Shadow Agents to disable",
				title: "Disabled Shadows",
			}).optional(),
		/** 要停用的工具列表（可選）/ List of tools to disable (optional) */
		disabled_tools: z.array(z.enum(ALL_ARISE_TOOLS))
			.meta({
				description: "要停用的工具列表 / List of tools to disable",
				title: "Disabled Tools",
			}).optional(),
		/** 要停用的 Hook 列表（可選）/ List of hooks to disable (optional) */
		disabled_hooks: z.array(HookName)
			.meta({
				description: "要停用的 Hook 列表 / List of hooks to disable",
				title: "Disabled Hooks",
			}).optional(),
		/** 是否顯示歡迎橫幅（預設 true）/ Show welcome banner (default true) */
		show_banner: z.boolean()
			.meta({
				description: "是否顯示歡迎橫幅 / Show welcome banner",
				title: "Show Banner",
			}).default(true).optional(),
		/** 每個工作階段都顯示橫幅（預設 false）/ Show banner every session (default false) */
		banner_every_session: z.boolean()
			.meta({
				description: "每個工作階段都顯示橫幅 / Show banner every session",
				title: "Banner Every Session",
			}).default(false).optional(),
		/** 各代理的覆寫設定（可選）/ Per-agent override settings (optional) */
		agents: z.record(ShadowName, AgentOverride)
			.meta({
				description: "各代理的覆寫設定 / Per-agent override settings",
				title: "Agents",
			}).optional(),
		/** 輸出截斷設定（可選）/ Output truncation settings (optional) */
		output_shaping: z
			.object({
				/** 最大輸出字元數（預設 12000）/ Max output chars (default 12000) */
				max_chars: z.number()
					.meta({
						description: "最大輸出字元數 / Maximum output characters",
						title: "Max Chars",
					}).default(12000),
				/** 是否保留錯誤輸出（預設 true）/ Preserve error output (default true) */
				preserve_errors: z.boolean()
					.meta({
						description: "是否保留錯誤輸出 / Preserve error output",
						title: "Preserve Errors",
					}).default(true),
			})
			.meta({
				description: "輸出截斷設定 / Output truncation settings",
				title: "Output Shaping",
			})
			.optional(),
		/** 對話壓縮設定（可選）/ Conversation compaction settings (optional) */
		compaction: z
			.object({
				/** 觸發壓縮的閾值百分比（50-95，預設 80）/ Compaction threshold percent (50-95, default 80) */
				threshold_percent: z.number().min(50).max(95)
					.meta({
						description: "觸發壓縮的閾值百分比（50-95）/ Compaction threshold percent (50-95)",
						title: "Threshold Percent",
					}).default(80),
				/** 保留 TODO 項目（預設 true）/ Preserve TODO items (default true) */
				preserve_todos: z.boolean()
					.meta({
						description: "保留 TODO 項目 / Preserve TODO items",
						title: "Preserve TODOs",
					}).default(true),
			})
			.meta({
				description: "對話壓縮設定 / Conversation compaction settings",
				title: "Compaction",
			})
			.optional(),
		/** 背景任務設定（可選）/ Background task settings (optional) */
		background: BackgroundTiming.extend({
				/** 自動繼續任務設定（可選）/ Auto resume task settings (optional) */
				auto_resume: AutoResumeConfig.optional(),
			})
			.meta({
				description: "背景任務設定 / Background task settings",
				title: "Background",
			})
			.optional(),
		/** 協作任務設定（可選）/ Collaboration task settings (optional) */
		collaborate: z
			.object({
				/** 允許的模式列表（白名單）/ Allowed modes (whitelist) */
				allowed_modes: z.array(z.enum(ALLOWED_COLLABORATE_MODES))
					.meta({
						description: "允許的模式列表，若設定則只允許這些模式 / Allowed modes, if set only these modes are allowed",
						title: "Allowed Modes",
					})
					.optional(),
				/** 禁止的模式列表（黑名單）/ Denied modes (blacklist) */
				denied_modes: z.array(z.enum(ALLOWED_COLLABORATE_MODES))
					.meta({
						description: "禁止的模式列表，優先於 allowed_modes / Denied modes, takes precedence over allowed_modes",
						title: "Denied Modes",
					})
					.optional(),
				/** 預設總回合數（預設 8）/ Default total rounds (default 8) */
				total_rounds: z.number().int().min(1)
					.meta({
						description: "預設總回合數（預設 8）/ Default total rounds (default 8)",
						title: "Total Rounds",
					})
					.optional(),
				/** 總回合數最大上限（預設 15）/ Total rounds maximum limit (default 15) */
				total_rounds_max: z.number().int().min(1)
					.meta({
						description: "總回合數最大上限（預設 15）/ Total rounds maximum limit (default 15)",
						title: "Total Rounds Max",
					})
					.optional(),
				/** 預設每個 agent 回合數（可選）/ Default per-agent rounds (optional) */
				per_agent_rounds: z.number().int().positive()
					.meta({
						description: "預設每個 agent 回合數 / Default per-agent rounds",
						title: "Per Agent Rounds",
					})
					.optional(),
				/** 預設最大並行數（預設 2，最大 5）/ Default max concurrent (default 2, max 5) */
				max_concurrent: z.number().int().min(1)
					.meta({
						description: `預設最大並行數（最大 ${MAX_COLLABORATE_MAX_CONCURRENT}）/ Default max concurrent (max ${MAX_COLLABORATE_MAX_CONCURRENT})`,
						title: "Max Concurrent",
					})
					.optional(),
				/** 預設回合超時（毫秒）/ Default round timeout (ms) */
				round_timeout_ms: z.number().int().positive()
					.meta({
						description: "預設回合超時（毫秒）/ Default round timeout (ms)",
						title: "Round Timeout",
					})
					.optional(),
				/** 回合超時最大上限（毫秒）/ Round timeout maximum limit (ms) */
				round_timeout_ms_max: z.number().int().positive()
					.meta({
						description: "回合超時最大上限（毫秒）/ Round timeout maximum limit (ms)",
						title: "Round Timeout Max",
					})
					.optional(),
			})
			.meta({
				description: "協作任務設定 / Collaboration task settings",
				title: "Collaborate",
			})
			.optional(),
		/** 除錯設定（可選）/ Debug settings (optional) */
		debug: z
			.object({
				/** 是否啟用除錯模式（預設 false）/ Enable debug mode (default false) */
				enabled: z.boolean()
					.meta({
						description: "是否啟用除錯模式 / Enable debug mode",
						title: "Enabled",
					}).default(false),
				/**
				 * 日誌級別（預設 warn）/ Log level (default warn)
				 * - error: 錯誤訊息 / Error messages
				 * - warn: 警告訊息 / Warning messages
				 * - info: 一般資訊 / General information
				 * - debug: 除錯資訊 / Debug information
				 */
				level: z.enum(ALLOWED_LOG_LEVELS)
					.meta({
						description: "日誌級別：error、warn、info、debug / Log level: error, warn, info, debug",
						title: "Level",
					}).default(EnumLogLevel.Warn),
			})
			.meta({
				description: "除錯設定 / Debug settings",
				title: "Debug",
			})
			.optional(),
	})
	.meta({
		description: "Arise 主配置結構 / Arise main configuration schema",
		title: "Arise Config",
	});

/** Arise 配置類型 / Arise configuration type */
export type IAriseConfig = NonNullable<z.infer<typeof AriseConfigSchema>>;

/** Auto-resume 配置類型（從 const AutoResumeConfig 推導）/ Auto-resume config type (derived from const AutoResumeConfig) */
export type IAutoResumeConfig = NonNullable<z.infer<typeof AutoResumeConfig>>;
