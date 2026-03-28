/**
 * 預設常數定義
 * Default constants definition
 *
 * 定義模型解析和配置相關的預設常數值
 * Defines default constant values for model resolution and configuration
 */

import { z } from "zod";

/**
 * 自動模型標記
 * Auto model marker
 *
 * 表示自動沿用發起對話的主任務所使用的模型
 * When used, background tasks will automatically use the parent task's model
 *
 * 使用時機：
 * - opencode-arise.json 中 agents.<agent>.model 設為 AUTO_MODEL
 * - 呼叫 arise_summon 工具時 model 參數設為 AUTO_MODEL
 * - shadows.ts 中 Shadow 預設模型設為 AUTO_MODEL
 */
export const AUTO_MODEL = 'AUTO' as const;

/**
 * Zod schema for AUTO_MODEL 常數驗證
 * Zod schema for AUTO_MODEL constant validation
 */
export const AutoModelSchema = z.literal(AUTO_MODEL).meta({
  description: "自動模型標記，表示自動沿用主任務的模型 / Auto model marker, inherits parent task's model",
  title: "Auto Model",
});

/**
 * 預設模型
 * Default model fallback
 *
 * 當沒有指定任何模型時使用的 fallback
 * Used when no model is specified at all
 */
export const DEFAULT_MODEL = 'opencode/big-pickle' as const;
