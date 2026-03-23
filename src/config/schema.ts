import { z } from "zod";
import { ALL_SHADOW_AGENTS_NAME, IAllShadowAgentsName } from "../types/enums";
import { ALLOWED_HOOKS, EnumHookName } from "./hook-names";
import { IValueNotPartial } from "../types/types";

/**
 * 特殊模型值，表示自動沿用發起對話的主任務所使用的模型
 * Special model value that inherits the parent task's model
 *
 * 當使用此值時，背景任務會自動使用呼叫它的主任務的模型
 * When used, background tasks will automatically use the parent task's model
 */
export const AUTO_MODEL = "<auto>";

/**
 * 輪詢間隔預設值（毫秒）
 * Default polling interval in milliseconds
 */
export const DEFAULT_POLL_INTERVAL = 2000;

/**
 * 重試延遲遞增量預設值（毫秒）
 * Default retry delay increment in milliseconds
 */
export const DEFAULT_RETRY_DELAY_INCREMENT = 5000;

/**
 * 重試延遲最大值預設值（毫秒）
 * Default maximum retry delay in milliseconds
 */
export const DEFAULT_RETRY_DELAY_MAX = 60000;

/**
 * Shadow 代理名稱 Zod Schema
 * Shadow agent name Zod schema
 *
 * 定義所有可用的 Shadow 代理名稱
 * Defines all available Shadow agent names
 *
 * @see IAllShadowAgentsName
 */
export const ShadowName = z.enum(ALL_SHADOW_AGENTS_NAME);

/**
 * 定義所有可用的生命週期 Hook
 * Defines all available lifecycle hooks
 */
export const HookName = z.enum(ALLOWED_HOOKS);

/**
 * 允許針對特定代理覆寫全域預設值
 * Allows overriding global defaults for specific agents
 */
export const AgentOverride = z.object({
  /** 模型名稱（可選）/ Model name (optional) */
  model: z.string().optional(),
  /** 是否停用該代理（可選）/ Whether to disable this agent (optional) */
  disabled: z.boolean().optional(),
  /** 輪詢間隔（毫秒，可選）/ Polling interval in ms (optional) */
  poll_interval: z.number().optional(),
  /** 重試延遲遞增量（毫秒，可選）/ Retry delay increment in ms (optional) */
  retry_delay_increment: z.number().optional(),
  /** 重試延遲最大值（毫秒，可選）/ Max retry delay in ms (optional) */
  retry_delay_max: z.number().optional(),
  /** 系統提示補充（可選）/ System prompt supplement (optional) */
  system_prompt_addon: z.string().optional(),
});

/**
 * Arise 主配置結構定義
 * Arise main configuration schema definition
 *
 * 使用 Zod 進行執行期驗證
 * Uses Zod for runtime validation
 */
export const AriseConfigSchema = z.object({
  /** JSON Schema URI（可選）/ JSON Schema URI (optional) */
  $schema: z.string().optional(),
  /** 要停用的陰影代理列表（可選）/ List of shadows to disable (optional) */
  disabled_shadows: z.array(ShadowName).optional(),
  /** 要停用的 Hook 列表（可選）/ List of hooks to disable (optional) */
  disabled_hooks: z.array(HookName).optional(),
  /** 是否顯示歡迎橫幅（預設 true）/ Show welcome banner (default true) */
  show_banner: z.boolean().default(true).optional(),
  /** 每個工作階段都顯示橫幅（預設 false）/ Show banner every session (default false) */
  banner_every_session: z.boolean().default(false).optional(),
  /** 各代理的覆寫設定（可選）/ Per-agent override settings (optional) */
  agents: z.record(ShadowName, AgentOverride).optional(),
  /** 輸出截斷設定（可選）/ Output truncation settings (optional) */
  output_shaping: z
    .object({
      /** 最大輸出字元數（預設 12000）/ Max output chars (default 12000) */
      max_chars: z.number().default(12000),
      /** 是否保留錯誤輸出（預設 true）/ Preserve error output (default true) */
      preserve_errors: z.boolean().default(true),
    })
    .optional(),
  /** 對話壓縮設定（可選）/ Conversation compaction settings (optional) */
  compaction: z
    .object({
      /** 觸發壓縮的閾值百分比（50-95，預設 80）/ Compaction threshold percent (50-95, default 80) */
      threshold_percent: z.number().min(50).max(95).default(80),
      /** 保留 TODO 項目（預設 true）/ Preserve TODO items (default true) */
      preserve_todos: z.boolean().default(true),
    })
    .optional(),
  /** 背景任務設定（可選）/ Background task settings (optional) */
  background: z
    .object({
      /** 輪詢間隔（毫秒，預設 2000）/ Polling interval in ms (default 2000) */
      poll_interval: z.number().default(DEFAULT_POLL_INTERVAL),
      /** 重試延遲遞增量（毫秒，預設 5000）/ Retry delay increment in ms (default 5000) */
      retry_delay_increment: z.number().default(DEFAULT_RETRY_DELAY_INCREMENT),
      /** 重試延遲最大值（毫秒，預設 60000）/ Max retry delay in ms (default 60000) */
      retry_delay_max: z.number().default(DEFAULT_RETRY_DELAY_MAX),
    })
    .optional(),
  /** 除錯設定（可選）/ Debug settings (optional) */
  debug: z
    .object({
      /** 是否啟用除錯模式（預設 false）/ Enable debug mode (default false) */
      enabled: z.boolean().default(false),
      /** 日誌級別（預設 warn）/ Log level (default warn) */
      level: z.enum(["error", "warn", "info", "debug"]).default("warn"),
    })
    .optional(),
});

/** Arise 配置類型 / Arise configuration type */
export type IAriseConfig = z.infer<typeof AriseConfigSchema>;

/**
 * 預設配置值
 * Default configuration values
 *
 * 當使用者未提供配置或配置無效時使用此值
 * Used when user doesn't provide config or config is invalid
 */
export const DEFAULT_CONFIG: IAriseConfig = {
  /** 顯示歡迎橫幅 / Show welcome banner */
  show_banner: true,
  /** 不每個工作階段都顯示橫幅 / Don't show banner every session */
  banner_every_session: false,
  /** 不停用任何陰影代理 / Don't disable any shadow agents */
  disabled_shadows: [],
  /** 不停用任何 Hook / Don't disable any hooks */
  disabled_hooks: [],
  /** 輸出截斷設定 / Output truncation settings */
  output_shaping: {
    max_chars: 12000,
    preserve_errors: true,
  },
  /** 對話壓縮設定 / Conversation compaction settings */
  compaction: {
    threshold_percent: 80,
    preserve_todos: true,
  },
  /** 背景任務設定 / Background task settings */
  background: {
    poll_interval: DEFAULT_POLL_INTERVAL,
    retry_delay_increment: DEFAULT_RETRY_DELAY_INCREMENT,
    retry_delay_max: DEFAULT_RETRY_DELAY_MAX,
  },
  /** 除錯設定 / Debug settings */
  debug: {
    enabled: false,
    level: "warn",
  },
};

/**
 * 配置獲取值型別
 * Config getter value type
 *
 * 邏輯意圖：
 * 1. 支援從 background 全域設定或 agent 特定設定中讀取值
 * 2. 巢狀 IValueNotPartial 確保：
 *    - 外層：最終結果不為 null/undefined
 *    - 內層：OR 運算前的兩個來源都已排除空值
 * 3. 使用 keyof 限制只能存取有效的背景設定鍵
 *
 * 型別推導過程：
 * - T 限制為 IAriseConfig["background"] 的鍵（不含 undefined）
 * - A 為代理名稱，預設為所有代理
 * - 回傳值 = background[T] | agents[A][T]，兩者皆已排除空值
 */
export type ILazyConfigGetterValue<T extends keyof IValueNotPartial<IAriseConfig["background"]>, A extends IAllShadowAgentsName = IAllShadowAgentsName> = IValueNotPartial<IValueNotPartial<IAriseConfig["background"]>[T] | IValueNotPartial<IAriseConfig["agents"]>[IValueNotPartial<A>][T]>;

/**
 * 建立配置 getter 函式的工廠函式
 * Factory function to create config getter functions
 *
 * 用於建立讀取配置屬性的標準化 getter
 * Used to create standardized getters for reading config properties
 *
 * 優先順序：agent 特定設定 -> background 全域設定 -> 預設值
 * Priority: agent-specific setting -> background global setting -> default value
 *
 * @param configKey - 配置鍵名稱（snake_case）
 * @param defaultValue - 預設值
 * @returns 讀取配置的 getter 函式
 */
export function _createConfigGetter<T extends keyof Exclude<IAriseConfig["background"], undefined>>(
	configKey: T,
	defaultValue: ILazyConfigGetterValue<NoInfer<T>, IAllShadowAgentsName>
)
{
	return <A extends IAllShadowAgentsName = IAllShadowAgentsName>(config: IAriseConfig, agentName?: A): ILazyConfigGetterValue<NoInfer<T>, NoInfer<A>> =>
	{
		/**
		 * 優先檢查 agent 特定的設定
		 * First check for agent-specific setting
		 *
		 * 允許個別代理覆寫全域設定
		 * Allows individual agents to override global settings
		 */
		if (agentName && (config.agents as any)?.[agentName]?.[configKey] !== undefined)
		{
			return (config.agents as any)[agentName]![configKey];
		}

		/**
		 * 檢查全域 background 設定
		 * Check for global background setting
		 *
		 * 作為次優先級的全域設定
		 * As secondary priority global setting
		 */
		if ((config.background as any)?.[configKey] !== undefined)
		{
			return (config.background as any)[configKey];
		}

		/**
		 * 回退至預設值
		 * Fallback to default value
		 *
		 * 確保總是有有效的設定值
		 * Ensures there's always a valid setting value
		 */
		return defaultValue;
	};
}

/**
 * 取得輪詢間隔的輔助函式
 * Helper function to get polling interval
 *
 * 優先順序：agent.poll_interval -> background.poll_interval -> 預設值
 * Priority: agent.poll_interval -> background.poll_interval -> default
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 輪詢間隔（毫秒）
 */
export const getPollInterval = _createConfigGetter("poll_interval", DEFAULT_POLL_INTERVAL);

/**
 * 取得重試延遲遞增量的輔助函式
 * Helper function to get retry delay increment
 *
 * 優先順序：agent.retry_delay_increment -> background.retry_delay_increment -> 預設值
 * Priority: agent.retry_delay_increment -> background.retry_delay_increment -> default
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 重試延遲遞增量（毫秒）
 */
export const getRetryDelayIncrement = _createConfigGetter("retry_delay_increment", DEFAULT_RETRY_DELAY_INCREMENT);

/**
 * 取得重試延遲最大值的輔助函式
 * Helper function to get max retry delay
 *
 * 優先順序：agent.retry_delay_max -> background.retry_delay_max -> 預設值
 * Priority: agent.retry_delay_max -> background.retry_delay_max -> default
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 重試延遲最大值（毫秒）
 */
export const getRetryDelayMax = _createConfigGetter("retry_delay_max", DEFAULT_RETRY_DELAY_MAX);
