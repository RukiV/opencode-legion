import { z } from "zod";

/**
 * 輪詢間隔預設值（毫秒）
 * Default polling interval in milliseconds
 */
export const DEFAULT_POLL_INTERVAL = 2000;

export const ShadowName = z.enum([
  "monarch",
  "beru",
  "igris",
  "bellion",
  "tusk",
  "tank",
  "shadow-sovereign",
]);
export type ShadowName = z.infer<typeof ShadowName>;

export const HookName = z.enum([
  "arise-banner",
  "output-shaper",
  "compaction-preserver",
  "todo-enforcer",
]);
export type HookName = z.infer<typeof HookName>;

export const AgentOverride = z.object({
  model: z.string().optional(),
  disabled: z.boolean().optional(),
  poll_interval: z.number().optional(),
});

export const AriseConfigSchema = z.object({
  $schema: z.string().optional(),
  disabled_shadows: z.array(ShadowName).optional(),
  disabled_hooks: z.array(HookName).optional(),
  show_banner: z.boolean().default(true).optional(),
  banner_every_session: z.boolean().default(false).optional(),
  agents: z.record(ShadowName, AgentOverride).optional(),
  output_shaping: z
    .object({
      max_chars: z.number().default(12000),
      preserve_errors: z.boolean().default(true),
    })
    .optional(),
  compaction: z
    .object({
      threshold_percent: z.number().min(50).max(95).default(80),
      preserve_todos: z.boolean().default(true),
    })
    .optional(),
  background: z
    .object({
      poll_interval: z.number().default(DEFAULT_POLL_INTERVAL),
    })
    .optional(),
});

export type AriseConfig = z.infer<typeof AriseConfigSchema>;

export const DEFAULT_CONFIG: AriseConfig = {
  show_banner: true,
  banner_every_session: false,
  disabled_shadows: [],
  disabled_hooks: [],
  output_shaping: {
    max_chars: 12000,
    preserve_errors: true,
  },
  compaction: {
    threshold_percent: 80,
    preserve_todos: true,
  },
  background: {
    poll_interval: DEFAULT_POLL_INTERVAL,
  },
};

/**
 * 取得輪詢間隔的輔助函式
 * 優先順序：agent.poll_interval -> background.poll_interval -> 預設值
 *
 * @param config - AriseConfig 物件
 * @param agentName - agent 名稱（可選）
 * @returns 輪詢間隔（毫秒）
 */
export function getPollInterval(config: AriseConfig, agentName?: ShadowName): number {
  // 優先檢查 agent 特定的 poll_interval
  if (agentName && config.agents?.[agentName]?.poll_interval !== undefined) {
    return config.agents[agentName].poll_interval!;
  }

  // 檢查全域 background.poll_interval
  if (config.background?.poll_interval !== undefined) {
    return config.background.poll_interval;
  }

  // 回退至預設值
  return DEFAULT_POLL_INTERVAL;
}
