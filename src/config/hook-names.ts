/**
 * 定義所有可用的生命週期 Hook 名稱
 * Defines all available lifecycle hook names
 *
 * Hooks 一覽 / Hooks overview:
 * - arise-banner: 在 session 開始時顯示 "ARISE!" 歡迎訊息
 * - output-shaper: 安全的輸出截斷，保留錯誤訊息
 * - compaction-preserver: 在 session 緊湊化期間保留關鍵內容
 * - todo-enforcer: 在 session 閒置時提醒未完成的 TODOs
 *
 * @see README.md Hooks section
 */
export const enum EnumHookName
{
	/**
	 * 橫幅顯示 Hook
	 * Arise Banner Hook
	 *
	 * 總結：在 session 開始時顯示 "ARISE!" 歡迎訊息
	 * Summary: Shows "ARISE!" toast on session start
	 *
	 * 詳細說明：
	 * - 在初始化時顯示歡迎訊息
	 * - 可透過 show_banner 和 banner_every_session 配置
	 *
	 * Detailed info:
	 * - Display welcome message on initialization
	 * - Configurable via show_banner and banner_every_session
	 *
	 * @see README.md Hooks - arise-banner
	 */
	AriseBanner = "arise-banner",

	/**
	 * 輸出整形 Hook
	 * Output Shaper Hook
	 *
	 * 總結：安全的輸出截斷，保留錯誤訊息
	 * Summary: Quality-safe output truncation (preserves errors)
	 *
	 * 詳細說明：
	 * - 限制輸出長度並保留錯誤訊息
	 * - 可透過 output_shaping.max_chars 和 output_shaping.preserve_errors 配置
	 *
	 * Detailed info:
	 * - Limit output length and preserve error messages
	 * - Configurable via output_shaping.max_chars and output_shaping.preserve_errors
	 *
	 * @see README.md Hooks - output-shaper
	 */
	OutputShaper = "output-shaper",

	/**
	 * 緊湊化保留 Hook
	 * Compaction Preserver Hook
	 *
	 * 總結：在 session 緊湊化期間保留關鍵內容
	 * Summary: Preserves critical context during session compaction
	 *
	 * 詳細說明：
	 * - 保留緊湊格式的輸出
	 * - 可透過 compaction.threshold_percent 和 compaction.preserve_todos 配置
	 *
	 * Detailed info:
	 * - Preserve compact format output
	 * - Configurable via compaction.threshold_percent and compaction.preserve_todos
	 *
	 * @see README.md Hooks - compaction-preserver
	 */
	CompactionPreserver = "compaction-preserver",

	/**
	 * 待辦事項強制 Hook
	 * Todo Enforcer Hook
	 *
	 * 總結：在 session 閒置時提醒未完成的 TODOs
	 * Summary: Reminds about incomplete TODOs on session idle
	 *
	 * 詳細說明：
	 * - 強制顯示待辦事項
	 * - 在 session 閒置時觸發提醒
	 *
	 * Detailed info:
	 * - Force display of TODO items
	 * - Trigger reminder when session is idle
	 *
	 * @see README.md Hooks - todo-enforcer
	 */
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