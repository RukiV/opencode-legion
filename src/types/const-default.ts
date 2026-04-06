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

/**
 * Arise 訊息前綴常數
 * Arise message prefix constant
 */
export const ARISE_PREFIX = "[opencode-arise]" as const;

/**
 * OpenCode 插件名稱
 * OpenCode plugin name
 */
export const PLUGIN_NAME = "@bluelovers/opencode-arise" as const;

/**
 * 舊版 OpenCode 插件名稱（向後相容）
 * Legacy OpenCode plugin name (backward compatibility)
 */
export const LEGACY_PLUGIN_NAME = "opencode-arise" as const;

/**
 * Arise 配置檔案名稱
 * Arise config file name
 */
export const CONFIG_FILENAME = "opencode-arise.json";

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
 * Collaborate 工具預設總回合數
 * Default total rounds for collaborate tool
 */
export const DEFAULT_COLLABORATE_TOTAL_ROUNDS = 8 as const;

/**
 * Collaborate 工具最大總回合數
 * Maximum total rounds for collaborate tool
 */
export const MAX_COLLABORATE_TOTAL_ROUNDS = 15 as const;

/**
 * Collaborate 工具預設最大並行數
 * Default max concurrent agents for collaborate tool
 */
export const DEFAULT_COLLABORATE_MAX_CONCURRENT = 2 as const;

/**
 * Collaborate 工具最大並行數
 * Maximum max concurrent agents for collaborate tool
 */
export const MAX_COLLABORATE_MAX_CONCURRENT = 5 as const;

/**
 * Collaborate 工具預設回合超時（毫秒）
 * Default round timeout for collaborate tool
 */
export const DEFAULT_COLLABORATE_ROUND_TIMEOUT_MS = 60000 as const;

/**
 * @see {@link https://github.com/anomalyco/opencode/blob/2cc738fb1794470d28b6795f2267b9b756d4be88/packages/opencode/src/session/compaction.ts#L320}
 */
export const DEFAULT_SAFETY_PROMPT = `請依序檢查：
1. 若後續任務明確可行，繼續執行
2. 若存在潛在風險（如破壞性變更、資料遺失、安全疑慮、或將更動專案外檔案），請先停止並說明風險，請求用戶確認
3. 若需求模糊或資訊不足，請停止並說明疑點，請求用戶澄清
4. 若非用戶明確要求撤銷更改或刪除檔案，請先詢問用戶，獲得許可後才執行

**若任務已完成，請複查並總結結果後結束**

Check in order:
1. If the next step is clear and actionable, proceed.
2. If potential risks exist (e.g., destructive changes, data loss, security concerns, or modifying files outside the project), stop, explain the risks, and request confirmation.
3. If requirements are ambiguous or information is insufficient, stop, state the uncertainty, and request clarification.
4. Unless the user explicitly requests to revert changes or delete files, always ask for permission first and only proceed after obtaining user consent.

**If the task is complete, review and summarize the results, then end.**` as const;

/**
 * 高負載額外延遲（毫秒）/ High load bonus delay (ms)
 *
 * 當偵測到高負載訊息時，額外增加的重試延遲時間
 * Additional retry delay when high load message is detected
 */
export const HIGH_LOAD_BONUS_DELAY_MS = 10_000;

/**
 * 提供者緩存檔案名稱
 * Providers cache file name
 *
 * 儲存於 getHomeConfigDirArise() 下
 * Stored under getHomeConfigDirArise()
 */
export const PROVIDERS_CACHE_FILENAME = "providers-cache.json";

/**
 * 提供者歷史紀錄檔案名稱（永久保存）
 * Providers history file name (permanent)
 *
 * 儲存於 getHomeConfigDirArise() 下
 * Stored under getHomeConfigDirArise()
 */
export const PROVIDERS_HISTORY_FILENAME = "providers-history.json";
export const DEFAULT_DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm:ss ZZ";
