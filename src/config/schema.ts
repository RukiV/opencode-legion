import { z } from "zod";
import { ALL_SHADOW_AGENTS_NAME } from "../types/enums";
import { ALLOWED_HOOKS, EnumHookName } from "../types/enums";
import { ALLOWED_LOG_LEVELS, EnumLogLevel } from "../types/enum-opencode";
import { ALLOWED_AUTO_RESUME_ON_ERROR, ALLOWED_AUTO_RESUME_TARGET, EnumAutoResumeOnError, EnumAutoResumeTarget } from "../types/enums";
import { AUTO_MODEL } from "../types/const-default";
import { extractDefaultsFromJSONSchema } from "../utils/type/zod-defaults";

/**
 * 輪詢間隔預設值（毫秒）
 * Default polling interval in milliseconds
 */
export const DEFAULT_POLL_INTERVAL = 2000 as const;

/**
 * 重試延遲遞增量預設值（毫秒）
 * Default retry delay increment in milliseconds
 */
export const DEFAULT_RETRY_DELAY_INCREMENT = 5000 as const;

/**
 * 重試延遲最大值預設值（毫秒）
 * Default maximum retry delay in milliseconds
 */
export const DEFAULT_RETRY_DELAY_MAX = 60000 as const;

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
		retry: z.string().optional()
			.meta({
				description: "首次重試時的提示 / Prompt for first retry",
				title: "Retry Prompt",
			}),
		/** 最終重試時的提示 / Prompt for final retry */
		final: z.string().optional()
			.meta({
				description: "最終重試時的提示 / Prompt for final retry",
				title: "Final Prompt",
			}),
		/** 自定義提示陣列，按順序使用 / Custom prompt array, used in order */
		custom: z.array(z.string()).optional()
			.meta({
				description: "自定義提示陣列，按順序使用 / Custom prompt array, used in order",
				title: "Custom Prompts",
			}),
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
		enabled: z.boolean().default(false)
			.meta({
				description: "是否啟用自動繼續任務 / Enable auto resume",
				title: "Enabled",
			}),
		/** 最大重試次數（預設 3）/ Max retry count (default 3) */
		max_retries: z.number().default(3).optional()
			.meta({
				description: "最大重試次數 / Maximum retry count",
				title: "Max Retries",
			}),
		/** 重試延遲（毫秒，預設 5000）/ Retry delay in ms (default 5000) */
		retry_delay: z.number().default(5000).optional()
			.meta({
				description: "重試延遲（毫秒）/ Retry delay in milliseconds",
				title: "Retry Delay",
			}),
		/** 錯誤時的行為（預設 ignore）/ Behavior on error (default ignore) */
		on_error: AutoResumeOnError.default(EnumAutoResumeOnError.Ignore)
			.meta({
				description: "錯誤時的行為：ignore=忽略、retry=重試、notify=通知 / Behavior on error: ignore=ignore, retry=retry, notify=notify",
				title: "On Error",
			}),
		/** 哪些任務類型啟用 auto-resume（可選）/ Which task types enable auto-resume (optional) */
		target: AutoResumeTarget.default(EnumAutoResumeTarget.Background)
			.meta({
				description: "目標任務類型：background=背景任務、all=所有任務 / Target task type: background=background tasks, all=all tasks",
				title: "Target",
			}),
		/** 自訂提示訊息（可選）/ Custom prompts (optional) */
		prompts: AutoResumePrompts,
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
		poll_interval: z.number().default(DEFAULT_POLL_INTERVAL)
			.meta({
				description: "輪詢間隔（毫秒）/ Polling interval in milliseconds",
				title: "Poll Interval",
			}),
		/** 重試延遲遞增量（毫秒，預設 5000）/ Retry delay increment in ms (default 5000) */
		retry_delay_increment: z.number().default(DEFAULT_RETRY_DELAY_INCREMENT)
			.meta({
				description: "重試延遲遞增量（毫秒）/ Retry delay increment in milliseconds",
				title: "Retry Delay Increment",
			}),
		/** 重試延遲最大值（毫秒，預設 60000）/ Max retry delay in ms (default 60000) */
		retry_delay_max: z.number().default(DEFAULT_RETRY_DELAY_MAX)
			.meta({
				description: "重試延遲最大值（毫秒）/ Maximum retry delay in milliseconds",
				title: "Retry Delay Max",
			}),
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
		model: z.string().optional()
			.meta({
				description: "要使用的模型名稱 / Model name to use",
				title: "Model",
			}),
		/** 是否停用該代理（可選）/ Whether to disable this agent (optional) */
		disabled: z.boolean().optional()
			.meta({
				description: "是否停用此代理 / Whether to disable this agent",
				title: "Disabled",
			}),
		/** 系統提示補充（可選）/ System prompt supplement (optional) */
		system_prompt_addon: z.string().optional()
			.meta({
				description: "系統提示補充內容 / System prompt supplement content",
				title: "System Prompt Addon",
			}),
	})
	.extend(BackgroundTiming.partial().shape)
	.extend({
		/** 自動繼續任務設定（可選）/ Auto resume settings (optional) */
		auto_resume: AutoResumeConfig.optional(),
	})
	.meta({
		description: "代理覆寫設定 / Agent override settings",
		title: "Agent Override",
	});

/**
 * Arise 主配置結構
 * Arise main configuration schema
 */
export const AriseConfigSchema = z
	.object({
		/** JSON Schema URI（可選）/ JSON Schema URI (optional) */
		$schema: z.string().optional()
			.meta({
				description: "JSON Schema URI / JSON Schema URI",
				title: "Schema",
			}),
		/** 要停用的 Shadow Agents 列表（可選）/ List of Shadow Agents to disable (optional) */
		disabled_shadows: z.array(ShadowName).optional()
			.meta({
				description: "要停用的 Shadow Agents 列表 / List of Shadow Agents to disable",
				title: "Disabled Shadows",
			}),
		/** 要停用的 Hook 列表（可選）/ List of hooks to disable (optional) */
		disabled_hooks: z.array(HookName).optional()
			.meta({
				description: "要停用的 Hook 列表 / List of hooks to disable",
				title: "Disabled Hooks",
			}),
		/** 是否顯示歡迎橫幅（預設 true）/ Show welcome banner (default true) */
		show_banner: z.boolean().default(true).optional()
			.meta({
				description: "是否顯示歡迎橫幅 / Show welcome banner",
				title: "Show Banner",
			}),
		/** 每個工作階段都顯示橫幅（預設 false）/ Show banner every session (default false) */
		banner_every_session: z.boolean().default(false).optional()
			.meta({
				description: "每個工作階段都顯示橫幅 / Show banner every session",
				title: "Banner Every Session",
			}),
		/** 各代理的覆寫設定（可選）/ Per-agent override settings (optional) */
		agents: z.record(ShadowName, AgentOverride).optional()
			.meta({
				description: "各代理的覆寫設定 / Per-agent override settings",
				title: "Agents",
			}),
		/** 輸出截斷設定（可選）/ Output truncation settings (optional) */
		output_shaping: z
			.object({
				/** 最大輸出字元數（預設 12000）/ Max output chars (default 12000) */
				max_chars: z.number().default(12000)
					.meta({
						description: "最大輸出字元數 / Maximum output characters",
						title: "Max Chars",
					}),
				/** 是否保留錯誤輸出（預設 true）/ Preserve error output (default true) */
				preserve_errors: z.boolean().default(true)
					.meta({
						description: "是否保留錯誤輸出 / Preserve error output",
						title: "Preserve Errors",
					}),
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
				threshold_percent: z.number().min(50).max(95).default(80)
					.meta({
						description: "觸發壓縮的閾值百分比（50-95）/ Compaction threshold percent (50-95)",
						title: "Threshold Percent",
					}),
				/** 保留 TODO 項目（預設 true）/ Preserve TODO items (default true) */
				preserve_todos: z.boolean().default(true)
					.meta({
						description: "保留 TODO 項目 / Preserve TODO items",
						title: "Preserve TODOs",
					}),
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
		/** 除錯設定（可選）/ Debug settings (optional) */
		debug: z
			.object({
				/** 是否啟用除錯模式（預設 false）/ Enable debug mode (default false) */
				enabled: z.boolean().default(false)
					.meta({
						description: "是否啟用除錯模式 / Enable debug mode",
						title: "Enabled",
					}),
				/**
				 * 日誌級別（預設 warn）/ Log level (default warn)
				 * - error: 錯誤訊息 / Error messages
				 * - warn: 警告訊息 / Warning messages
				 * - info: 一般資訊 / General information
				 * - debug: 除錯資訊 / Debug information
				 */
				level: z.enum(ALLOWED_LOG_LEVELS).default(EnumLogLevel.Warn)
					.meta({
						description: "日誌級別：error、warn、info、debug / Log level: error, warn, info, debug",
						title: "Level",
					}),
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
