import type { PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import type { ISessionRecord } from "../../types/session";
import {
	getPollInterval,
	getRetryDelayIncrement,
	getRetryDelayMax,
	getAutoResumeConfig,
	getAutoResumeSafetyPrompt,
} from "../../config/getters";
import { DEFAULT_RETRY_DELAY_INCREMENT, HIGH_LOAD_BONUS_DELAY_MS } from "../../types/const-default";
import { type IAriseConfig } from "../../config/schema";
import {
	EnumAutoResumeOnError,
	EnumAutoResumeTarget,
	IAllShadowAgentsName,
	BackgroundTaskStatus,
} from "../../types/enums";
import { EnumSessionStatusType, EnumLogLevel, EnumOpenCodeEventType } from "../../types/enum-opencode";
import { createDefaultConfig } from "../../types/config-defaults";
import { getErrorMessage } from "../../utils/error";
import { resolveModelContext, formatModelBodyDescription } from "../../utils/model-resolver";
import {
	formatAriseMsg,
	formatAriseMsgError,
	formatAriseMsgTitleCustom,
	formatAriseMsgPrefixId,
	formatAriseMsgSuccessMultiLine,
	formatAriseMsgSessionTitle,
	formatAriseMsgLogBody,
} from "../../utils/string/arise-message";
import { logArise2WithLevel } from "../../utils/debug-control";
import { isHighLoadError } from "../../utils/string/regexp";
import { runtimeCache } from '../../utils/session/session-cache';

/**
 * === 配置取得說明 / Configuration Getter Guide ===
 *
 * BackgroundManager 提供公開的 getter 方法，透過 getters.ts 中的函式取得 per-agent 配置。
 * BackgroundManager exposes public getter methods that delegate to getters.ts for per-agent config.
 *
 * 公開方法 / Public methods:
 * - getPollInterval(agentName?) -> number
 * - getRetryDelayIncrement(agentName?) -> number
 * - getRetryDelayMax(agentName?) -> number
 *
 * 內部使用的 getter（從 getters.ts 直接呼叫）:
 * - getAutoResumeConfig(config, agentName?) -> auto_resume 物件 / object
 *
 * 使用範例 / Usage example:
 *   const pollInterval = manager.getPollInterval("beru");
 *   const maxDelay = manager.getRetryDelayMax("igris");
 *
 * 優先順序：agents[agentName].property -> background.property -> 預設值
 * Priority: agents[agentName].property -> background.property -> default
 */

/**
 * 背景任務結構定義
 * Background task structure definition
 *
 * 追蹤每個背景 Shadow 任務的狀態和結果
 * Tracks the status and result of each background Shadow task
 */
export interface BackgroundTask
{
	/** 任務唯一識別符 / Unique task identifier */
	id: string;
	/** 關聯的 Session ID / Associated session ID */
	sessionId: string;
	/** 父 Session ID（發起任務的 session）/ Parent session ID (session that launched the task) */
	parentSessionId: string;
	/** Shadow 名稱 / Shadow name */
	shadow: string;
	/** 任務描述 / Task description */
	description: string;
	/** 任務狀態 / Task status */
	status: BackgroundTaskStatus;
	/** 任務開始時間戳 / Task start timestamp */
	startedAt: number;
	/** 任務完成時間戳（可選）/ Task completion timestamp (optional) */
	completedAt?: number;
	/** 任務結果（可選）/ Task result (optional) */
	result?: string;
	/** 錯誤訊息（可選）/ Error message (optional) */
	error?: string;
	/** 輪詢重試次數 / Polling retry count */
	retryCount: number;
	/** Auto-resume 重試次數 / Auto-resume retry count */
	resumeRetryCount?: number;
	/** Auto-resume 是否正在等待重試 / Auto-resume is waiting for retry */
	resumePending?: boolean;
	/** Runtime override for auto-resume (foreground tasks) / Runtime 覆寫 auto-resume（foreground tasks） */
	overrideAutoResume?: boolean;
	/** Runtime override for auto-resume (background tasks) / Runtime 覆寫 auto-resume（background tasks） */
	overrideBackgroundAutoResume?: boolean;
}

/**
 * 背景任務管理器
 * Background task manager
 *
 * 負責管理所有背景 Shadow 任務的生命週期
 * Responsible for managing the lifecycle of all background Shadow tasks
 */
export class BackgroundManager
{
	/** 任務儲存（以 taskId 為 key）/ Task storage (keyed by taskId) */
	private tasks: Map<string, BackgroundTask> = new Map();
	/** Plugin 上下文 / Plugin context */
	private ctx: PluginInput;
	/** AriseConfig 物件（用於取得 per-agent 覆寫配置）/ AriseConfig object (for per-agent override config) */
	private config: IAriseConfig;

	/**
	 * 建構函式
	 * Constructor
	 *
	 * @param ctx - Plugin 上下文 / Plugin context
	 * @param config - AriseConfig 物件（用於取得 per-agent 覆寫配置）/ AriseConfig object for per-agent overrides
	 */
	constructor(
		ctx: PluginInput,
		config: IAriseConfig = createDefaultConfig(),
	)
	{
		this.ctx = ctx;
		this.config = config;
	}

	/**
	 * 取得輪詢間隔
	 * Get polling interval
	 *
	 * 優先順序：agent.poll_interval -> background.poll_interval -> 預設值
	 * Priority: agent.poll_interval -> background.poll_interval -> default
	 *
	 * @param agentName - agent 名稱（可選）/ Agent name (optional)
	 * @returns 輪詢間隔（毫秒）/ Polling interval (ms)
	 */
	public getPollInterval(agentName?: IAllShadowAgentsName): number
	{
		return getPollInterval(this.config, agentName);
	}

	/**
	 * 取得重試延遲遞增量
	 * Get retry delay increment
	 *
	 * 優先順序：agent.retry_delay_increment -> background.retry_delay_increment -> 預設值
	 * Priority: agent.retry_delay_increment -> background.retry_delay_increment -> default
	 *
	 * @param agentName - agent 名稱（可選）/ Agent name (optional)
	 * @returns 重試延遲遞增量（毫秒）/ Retry delay increment (ms)
	 */
	public getRetryDelayIncrement(agentName?: IAllShadowAgentsName): number
	{
		return getRetryDelayIncrement(this.config, agentName);
	}

	/**
	 * 取得重試延遲最大值
	 * Get max retry delay
	 *
	 * 優先順序：agent.retry_delay_max -> background.retry_delay_max -> 預設值
	 * Priority: agent.retry_delay_max -> background.retry_delay_max -> default
	 *
	 * @param agentName - agent 名稱（可選）/ Agent name (optional)
	 * @returns 重試延遲最大值（毫秒）/ Max retry delay (ms)
	 */
	public getRetryDelayMax(agentName?: IAllShadowAgentsName): number
	{
		return getRetryDelayMax(this.config, agentName);
	}

	/**
	 * 檢查是否應該對任務執行 auto-resume
	 * Check if auto-resume should be performed on a task
	 *
	 * === 決策流程圖 / Decision Flowchart ===
	 *
	 * ┌─────────────────────────────┐
	 * │ shouldAutoResume(task)      │
	 * └──────────────┬──────────────┘
	 *                │
	 *                ▼
	 * ┌─────────────────────────────┐
	 * │ isBackgroundTask =          │
	 * │   parentSessionId !==       │
	 * │   sessionId                  │
	 * └──────────────┬──────────────┘
	 *                │
	 *                ▼
	 * ┌─────────────────────────────┐
	 * │ Check Runtime Override      │
	 * │ (overrideAutoResume or      │
	 * │  overrideBackgroundAutoResume)│
	 * └──────────────┬──────────────┘
	 *                │
	 *         ┌──────┴──────┐
	 *         ▼             ▼
	 *    ┌────────┐    ┌────────┐
	 *    │false   │    │ Check  │
	 *    │return │    │ Config │
	 *    │ false │    │enabled │
	 *    └────────┘    └────────┘
	 *                       │
	 *                 ┌──────┴──────┐
	 *                 ▼             ▼
	 *            ┌────────┐    ┌────────┐
	 *            │ false │    │ Check  │
	 *            │return │    │ status │
	 *            │ false │    │ ===    │
	 *            └────────┘    │ Error  │
	 *                         └────────┘
	 *                               │
	 *                        ┌──────┴──────┐
	 *                        ▼             ▼
	 *                   ┌────────┐    ┌────────┐
	 *                   │ false │    │ Check  │
	 *                   │return │    │ target │
	 *                   │ false │    │ match  │
	 *                   └────────┘    └────────┘
	 *                                     │
	 *                              ┌──────┴──────┐
	 *                              ▼             ▼
	 *                         ┌────────┐    ┌────────┐
	 *                         │ false │    │ Check  │
	 *                         │return │    │ retry  │
	 *                         │ false │    │ count  │
	 *                         └────────┘    └────────┘
	 *                                       │
	 *                               ┌───────┴───────┐
	 *                               ▼               ▼
	 *                          ┌────────┐     ┌────────┐
	 *                          │ false  │     │ Check  │
	 *                          │return  │     │ on_err │
	 *                          │ false  │     │ Ignore │
	 *                          └────────┘     └────────┘
	 *                                        │
	 *                                ┌───────┴───────┐
	 *                                ▼               ▼
	 *                           ┌────────┐     ┌────────┐
	 *                           │ false  │     │ return │
	 *                           │return  │     │  true  │
	 *                           │ false  │     └────────┘
	 *                           └────────┘
	 *
	 * === 檢查條件 / Check Conditions ===
	 * 1. Runtime Override（優先級最高）
	 *    - 背景任務：overrideBackgroundAutoResume
	 *    - 前景任務：overrideAutoResume
	 *    - 若為 false 直接返回 false
	 *    - 若為 true 繼續後續檢查
	 *
	 * 2. Config Enabled
	 *    - 從 config 取得 auto_resume.enabled
	 *    - 若為 false 直接返回 false
	 *
	 * 3. Task Status
	 *    - 必須處於 error 狀態
	 *    - 若非 error 直接返回 false
	 *
	 * 4. Target Match
	 *    - config.target = "background" 時，只對背景任務生效
	 *    - config.target = "all" 時，對所有任務生效
	 *
	 * 5. Max Retries
	 *    - 檢查 resumeRetryCount 是否超過 max_retries
	 *    - 預設 max_retries = 3
	 *
	 * 6. On Error Behavior
	 *    - on_error = "ignore" 時不進行 auto-resume
	 *    - on_error = "notify" / "retry" 時允許 auto-resume
	 *
	 * @param task - 背景任務
	 * @returns 是否應該執行 auto-resume
	 */
	shouldAutoResume(task: BackgroundTask): boolean
	{
		return this.checkAutoResume(task).should;
	}

	/**
	 * 檢查是否應該對任務執行 auto-resume（含原因）
	 * Check if auto-resume should be performed on a task (with reason)
	 *
	 * 回傳結果包含 should（是否執行）與 reason（不執行的原因）
	 * Returns result with should (whether to execute) and reason (why not)
	 *
	 * @param task - 背景任務
	 * @returns { should: boolean, reason: string }
	 */
	private checkAutoResume(task: BackgroundTask): { should: boolean, reason: string }
	{
		/**
		 * 檢查是否為背景任務
		 * Check if it's a background task
		 *
		 * 背景任務：parentSessionId !== sessionId
		 * Background task: parentSessionId !== sessionId
		 */
		const isBackgroundTask = task.parentSessionId !== task.sessionId;

		let enabled: boolean;

		/**
		 * 優先檢查 runtime override
		 * Priority: Check runtime override first
		 *
		 * runtime override 允許在執行時期覆寫 auto-resume 設定
		 * Runtime override allows overriding auto-resume settings at execution time
		 *
		 * 邏輯：
		 * - 背景任務：檢查 task.overrideBackgroundAutoResume
		 * - 前景任務：檢查 task.overrideAutoResume
		 */
		if (isBackgroundTask && task.overrideBackgroundAutoResume !== undefined)
		{
			enabled ??= task.overrideBackgroundAutoResume;

			if (!enabled)
			{
				logArise2WithLevel("debug", () => [
					`[background-manager]`,
					`shouldAutoResume: background task with overrideBackgroundAutoResume=false, returning false`,
				]);
				return { should: false, reason: "background auto-resume disabled by runtime override" };
			}
			// override = true 時，繼續檢查其他條件
		}
		else if (!isBackgroundTask && task.overrideAutoResume !== undefined)
		{
			enabled ??= task.overrideAutoResume;
			if (!enabled)
			{
				logArise2WithLevel("debug", () => [
					`[background-manager]`,
					`shouldAutoResume: foreground task with overrideAutoResume=false, returning false`,
				]);
				return { should: false, reason: "foreground auto-resume disabled by runtime override" };
			}
			// override = true 時，繼續檢查其他條件
		}

		/** 取得 auto-resume 配置（使用 getters.ts 的 getAutoResumeConfig）/ Get auto-resume config (using getters.ts getAutoResumeConfig) */
		const autoResumeConfig = getAutoResumeConfig(this.config, task.shadow as IAllShadowAgentsName);

		enabled ??= autoResumeConfig.enabled;

		/** 檢查是否啟用 / Check if enabled */
		if (!enabled)
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`shouldAutoResume: auto-resume not enabled, returning false`,
			]);
			return { should: false, reason: "auto-resume not enabled in config" };
		}

		/**
		 * 檢查任務是否處於 error 狀態
		 * Check if task is in error status
		 */
		if (task.status !== BackgroundTaskStatus.Error)
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`shouldAutoResume: task status=${task.status} !== 'error', returning false`,
			]);
			return { should: false, reason: `task status is '${task.status}', not 'error'` };
		}

		/**
		 * 檢查目標類型是否符合
		 * Check if target type matches
		 *
		 * target = "background" 只對背景任務（(parentSessionId !== sessionId）生效
		 * target = "background" only applies to background tasks (parentSessionId !== sessionId)
		 * target = "all" 對所有任務生效
		 * target = "all" applies to all tasks
		 */
		if (autoResumeConfig.target === EnumAutoResumeTarget.Background)
		{
			// 背景任務的 parentSessionId 不同於 sessionId
			// Background task has different parentSessionId from sessionId
			if (task.parentSessionId === task.sessionId)
			{
				logArise2WithLevel("debug", () => [
					`[background-manager]`,
					`shouldAutoResume: target=background but parentSessionId === sessionId (foreground task), returning false`,
				]);
				return { should: false, reason: "target=background but task is foreground" };
			}
		}

		/**
		 * 檢查是否已超過最大重試次數
		 * Check if max retry count exceeded
		 */
		const currentRetryCount = task.resumeRetryCount ?? 0;
		const maxRetries = autoResumeConfig.max_retries ?? 3;
		if (currentRetryCount >= maxRetries)
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`shouldAutoResume: resumeRetryCount=${currentRetryCount} >= max_retries=${maxRetries}, returning false`,
			]);
			return { should: false, reason: `max retries exceeded (${currentRetryCount}/${maxRetries})` };
		}

		/**
		 * 檢查錯誤處理行為
		 * Check error handling behavior
		 *
		 * onError = "ignore" 時不進行 auto-resume
		 * onError = "ignore" means no auto-resume
		 */
		if (autoResumeConfig.on_error === EnumAutoResumeOnError.Ignore)
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`shouldAutoResume: on_error=Ignore, returning false`,
			]);
			return { should: false, reason: "on_error is set to 'ignore'" };
		}

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`shouldAutoResume: all checks passed, returning true`,
		]);
		return { should: true, reason: "" };
	}

	/**
	 * 通知使用者 auto-resume 被跳過
	 * Notify user that auto-resume was skipped
	 *
	 * 同時發送 app.log（記錄日誌）與 tui.showToast（顯示通知）
	 * Sends both app.log (log entry) and tui.showToast (toast notification)
	 *
	 * @param task - 任務物件
	 * @param reason - 跳過原因
	 */
	private notifyAutoResumeSkipped(task: BackgroundTask, reason: string): void
	{
		const message = `Auto-resume skipped for task ${task.id} (${task.shadow}): ${reason}`;

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`notifyAutoResumeSkipped: ${message}`,
		]);

		this.ctx.client.app.log?.({
			body: formatAriseMsgLogBody({
				label: "Auto-resume",
				message,
				level: EnumLogLevel.Info,
			}),
		});

		this.ctx.client.tui.showToast?.({
			body: {
				title: "Auto-resume Skipped",
				message,
				variant: "warning",
				duration: 5000,
			},
		}).catch(() =>
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`notifyAutoResumeSkipped: TUI not available, skipping toast`,
			]);
		});
	}

	/**
	 * 執行 auto-resume
	 * Perform auto-resume
	 *
	 * 重新執行失敗的任務
	 * Re-execute failed task
	 *
	 * === 設定值讀取機制流程 / Config Getter Flow ===
	 * 1. 透過 this.getAutoResumeConfig() 取得 auto-resume 設定物件
	 *    - 回傳結構：{ enabled, max_retries, retry_delay, on_error, target, prompts }
	 *    - 若無，回退使用預設值：{ enabled: false, max_retries: 3, retry_delay: 5000, ... }
	 * 2. 取得 retry_delay：用於控制重試間隔（預設 5000ms）
	 * 3. 取得 max_retries：用於控制最大重試次數（預設 3 次）
	 * 4. 取得 on_error：用於控制錯誤發生時的行為（Ignore/Notify/Retry）
	 * 5. 取得 target：用於控制哪些類型任務（Foreground/Background）適用
	 *
	 * 優先順序：agents[agentName].auto_resume -> background.auto_resume -> 預設值
	 * Priority: agents[agentName].auto_resume -> background.auto_resume -> default
	 *
	 * @param task - 要重試的任務
	 */
	private async performAutoResume(task: BackgroundTask): Promise<void>
	{
		/**
		 * 取得 auto-resume 配置（支援 per-agent 覆寫）
		 * Get auto-resume config (supports per-agent override)
		 */
		const autoResumeConfig = getAutoResumeConfig(this.config, task.shadow as IAllShadowAgentsName);

		/**
		 * 標記任務為即將重試
		 * Mark task as about to retry
		 *
		 * 防止重複觸發
		 * Prevent duplicate triggers
		 */
		task.resumePending = true;

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`performAutoResume: marking taskId=${task.id} as resumePending, currentResumeRetryCount=${task.resumeRetryCount ?? 0}`,
		]);

		/**
		 * 記錄重試嘗試
		 * Log retry attempt
		 */
		this.ctx.client.app.log?.({
			body: formatAriseMsgLogBody({
				label: "Auto-resume",
				message: `Retrying task ${task.id}, attempt ${(task.resumeRetryCount ?? 0) + 1}/${autoResumeConfig.max_retries ?? 3}`,
				level: EnumLogLevel.Info,
			}),
		});

		/**
		 * 顯示 toast 通知使用者 auto-resume 已觸發
		 * Show toast notification to user that auto-resume was triggered
		 */
		this.ctx.client.tui.showToast?.({
			body: {
				title: "Auto-resume Triggered",
				message: `Retrying task ${task.id} (${task.shadow}), attempt ${(task.resumeRetryCount ?? 0) + 1}/${autoResumeConfig.max_retries ?? 3}`,
				variant: "info",
				duration: 5000,
			},
		}).catch(() =>
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`performAutoResume: TUI not available, skipping toast`,
			]);
		});

		/**
		 * 等待配置的重試延遲（偵測高負載時額外增加 10 秒）
		 * Wait for configured retry delay (add 10s bonus when high load detected)
		 *
		 * 若錯誤訊息包含 "under high load"、"retry after"、"please wait" 等模式，
		 * 則在基礎延遲上額外增加 HIGH_LOAD_BONUS_DELAY_MS
		 * If error message contains high load indicators,
		 * add HIGH_LOAD_BONUS_DELAY_MS on top of base delay
		 */
		const baseRetryDelay = autoResumeConfig.retry_delay ?? DEFAULT_RETRY_DELAY_INCREMENT;
		let totalRetryDelay = baseRetryDelay;

		if (isHighLoadError(task.error))
		{
			totalRetryDelay += HIGH_LOAD_BONUS_DELAY_MS;

			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`performAutoResume: high load detected in error, adding ${HIGH_LOAD_BONUS_DELAY_MS}ms bonus delay (total: ${totalRetryDelay}ms)`,
			]);
		}

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`performAutoResume: waiting retry_delay=${totalRetryDelay}ms before retry`,
		]);

		await new Promise((resolve) => setTimeout(resolve, totalRetryDelay));

		/**
		 * 重置 pending 狀態並增加重試計數
		 * Reset pending status and increment retry count
		 */
		task.resumePending = false;
		task.resumeRetryCount = (task.resumeRetryCount ?? 0) + 1;

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`performAutoResume: reset resumePending=false, resumeRetryCount=${task.resumeRetryCount}`,
		]);

		/**
		 * 重新建立 session 並執行任務
		 * Re-create session and execute task
		 *
		 * 使用原來的 shadow、prompt、description 等參數
		 * Use original shadow, prompt, description and other parameters
		 */
		try
		{
			const session = await this.ctx.client.session.create({
				body: { title: formatAriseMsgSessionTitle(task.id, task.description, `retry ${task.resumeRetryCount}`) },
			});

			const newSessionId = session.data?.id;
			if (!newSessionId)
			{
				throw new Error("Failed to create retry session");
			}

			/**
			 * 更新任務的 sessionId
			 * Update task's sessionId
			 */
			const oldSessionId = task.sessionId;
			task.sessionId = newSessionId;
			task.status = BackgroundTaskStatus.Running;
			task.startedAt = Date.now();
			task.error = undefined;
			task.completedAt = undefined;

			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`performAutoResume: updated task, oldSessionId=${oldSessionId}, newSessionId=${task.sessionId}, status=${task.status}`,
			]);

			/**
			 * 取得安全檢查提示（可選）
			 * Get safety check prompt (optional)
			 *
			 * 設計原理 / Design rationale:
			 * 使用 getAutoResumeSafetyPrompt 取得 safety_prompt，因為：
			 * - 支援 per-agent 覆寫：agents[agentName].auto_resume.safety_prompt
			 * - 支援全域設定：background.auto_resume.safety_prompt
			 * - 優先順序：agent 設定優先於 background 設定
			 *
			 * Use getAutoResumeSafetyPrompt to get safety_prompt because:
			 * - Supports per-agent override: agents[agentName].auto_resume.safety_prompt
			 * - Supports global setting: background.auto_resume.safety_prompt
			 * - Priority: agent setting takes precedence over background setting
			 */
			const safetyPrompt = getAutoResumeSafetyPrompt(this.config, task.shadow as IAllShadowAgentsName);

			/**
			 * 組合最終執行的 prompt
			 * Compose final prompt to execute
			 *
			 * 如果有 safety_prompt，則前置於任務描述
			 * 使用 \n\n---\n\n 作為分隔符號，清晰區分安全檢查提示與實際任務
			 * If safety_prompt exists, prepend to task description
			 * Use \n\n---\n\n as separator to clearly separate safety check from actual task
			 */
			const finalPrompt = safetyPrompt
				? `${safetyPrompt}\n\n---\n\n${task.description}`
				: task.description;

			/**
			 * 重新執行 prompt（非同步）
			 * Re-execute prompt (async)
			 *
			 * 這次不等待完成，讓輪詢機制處理
			 * Don't wait for completion, let polling mechanism handle it
			 */
			this.ctx.client.session
				.promptAsync({
					path: { id: newSessionId },
					body: {
						agent: task.shadow,
						model: undefined, // 使用預設模型 / Use default model
						parts: [{ type: "text", text: finalPrompt }],
					},
				})
				.then(() =>
				{
					logArise2WithLevel("debug", () => [
						`[background-manager]`,
						`performAutoResume: promptAsync succeeded for taskId=${task.id}, will be polled`,
					]);
					this.pollTaskCompletion(task.id);
				})
				.catch((err) =>
				{
					/**
					 * 處理 promptAsync 的錯誤
					 * Handle promptAsync errors
					 *
					 * 標記任務為 error 並記錄錯誤訊息
					 * Mark task as error and record error message
					 */
					task.status = BackgroundTaskStatus.Error;
					task.error = getErrorMessage(err);
					task.completedAt = Date.now();

					/**
					 * 根據 on_error 設定處理錯誤
					 * Handle error based on on_error setting
					 */
					const autoResumeCfg = getAutoResumeConfig(this.config, task.shadow as IAllShadowAgentsName);
					if (autoResumeCfg?.on_error === EnumAutoResumeOnError.Notify)
					{
						// 通知模式：記錄但不做進一步重試
						// Notify mode: log but don't retry further
						this.ctx.client.app.log?.({
							body: formatAriseMsgLogBody({
								label: "Auto-resume",
								message: `Task ${task.id} failed with error: ${task.error}. Waiting for manual intervention.`,
								level: EnumLogLevel.Warn,
							}),
						});
					}
					else if (autoResumeCfg?.on_error === EnumAutoResumeOnError.Retry)
					{
						// 遞迴嘗試 auto-resume（會再次檢查 shouldAutoResume）
						// Recursively attempt auto-resume (will check shouldAutoResume again)
						this.ctx.client.app.log?.({
							body: formatAriseMsgLogBody({
								label: "Auto-resume",
								message: `Task ${task.id} retry failed: ${task.error}. Will retry again...`,
								level: EnumLogLevel.Warn,
							}),
						});
						this.performAutoResume(task).catch((e) =>
						{
							this.ctx.client.app.log?.({
								body: formatAriseMsgLogBody({
									label: "Auto-resume",
									message: `Failed to retry task ${task.id}: ${getErrorMessage(e)}`,
									level: EnumLogLevel.Error,
								}),
							});
						});
					}
				});
		}
		catch (error)
		{
			/**
			 * 處理 session 建立失敗
			 * Handle session creation failure
			 */
			task.status = BackgroundTaskStatus.Error;
			task.error = getErrorMessage(error);
			task.completedAt = Date.now();

			logArise2WithLevel("error", () => [
				`[background-manager]`,
				`performAutoResume: failed to create retry session for taskId=${task.id}, error=${task.error}`,
			]);

			this.ctx.client.app.log?.({
				body: formatAriseMsgLogBody({
					label: "Auto-resume",
					message: `Failed to create retry session for task ${task.id}: ${task.error}`,
					level: EnumLogLevel.Error,
				}),
			});
		}
	}

	/**
	 * 產生唯一的任務 ID
	 * Generate unique task ID
	 *
	 * 格式：arise_{timestamp}_{random}
	 * 使用 base36 編碼以保持 ID 簡潔
	 * Uses base36 encoding to keep ID compact
	 */
	generateTaskId(): string
	{
		return `arise_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
	}

	/**
	 * 啟動背景任務
	 * Launch background task
	 *
	 * 建立新 session 並非同步執行 prompt
	 * Creates new session and executes prompt asynchronously
	 *
	 * @param opts - 任務選項
	 * @param opts.existingSessionId - 可選的現有 session ID（如果傳入則跳過建立新 session）
	 * @returns 建立的任務物件
	 */
	async launch(opts: {
		shadow: string;
		prompt: string;
		description: string;
		parentSessionId: string;
		model?: string;
		existingSessionId?: string;
	}): Promise<BackgroundTask>
	{
		const taskId = this.generateTaskId();

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`launch: generated taskId=${taskId}, shadow=${opts.shadow}, parentSessionId=${opts.parentSessionId}, existingSessionId=${opts.existingSessionId ?? "none"}`,
		]);

		/**
		 * 如果傳入了 existingSessionId，則重用該 session；否則建立新 session
		 * If existingSessionId is provided, reuse it; otherwise create new session
		 *
		 * Session title 包含 taskId 以便識別
		 * Session title includes taskId for identification
		 */
		let sessionId = opts.existingSessionId;
		if (!sessionId)
		{
			const session = await this.ctx.client.session.create({
				body: { title: formatAriseMsgSessionTitle(taskId, opts.description) },
			});

			sessionId = session.data?.id;
			if (!sessionId)
			{
				throw new Error("Failed to create background session");
			}
		}

		/**
		 * 记录 session 资讯
		 * Record session information
		 *
		 * 在 Shadow 任务创建时，记录 shadow、parentSessionId 等资讯
		 */
		const sessionRecord: ISessionRecord = {
			sessionID: sessionId,
			_arise: {
				shadow: opts.shadow as IAllShadowAgentsName,
				parentSessionId: opts.parentSessionId,
				createdAt: Date.now(),
				status: BackgroundTaskStatus.Running,
			},
		};
		runtimeCache.cacheSessionRecord(sessionRecord);

		/**
		 * 建立任務物件
		 * Create task object
		 */
		const task: BackgroundTask = {
			id: taskId,
			sessionId,
			parentSessionId: opts.parentSessionId,
			shadow: opts.shadow,
			description: opts.description,
			status: BackgroundTaskStatus.Running,
			startedAt: Date.now(),
			retryCount: 0,
		};

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`launch: task created, id=${task.id}, status=${task.status}, startedAt=${task.startedAt}`,
		]);

		/** 註冊任務到管理器 / Register task to manager */
		this.tasks.set(taskId, task);

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`launch: registered task ${taskId}, total tasks: ${this.tasks.size}`,
		]);

		/**
		 * 解析模型上下文
		 * Resolve model context
		 *
		 * 優先順序：用戶指定 > Config 模型 > Shadow 預設 > AUTO 使用父模型
		 * Priority: User specified > Config model > Shadow default > AUTO use parent model
		 */
		const parentModelIModel = runtimeCache.getSessionModel(opts.parentSessionId);
		/**
		 * 將 IModelBody 轉換為 string 格式
		 * Convert IModelBody to string format
		 */
		const parentModelStr = parentModelIModel
			? `${parentModelIModel.providerID}/${parentModelIModel.modelID}`
			: undefined;
		const modelBody = resolveModelContext(
			parentModelStr,
			opts.shadow as IAllShadowAgentsName,
			this.config,
			opts.model,
		);

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`launch: resolved model, parentModel=${parentModelStr ?? "none"}, finalModelBody=${JSON.stringify(modelBody)}`,
		]);

		/**
		 * 輸出背景任務啟動日誌
		 * Output background task launch log
		 *
		 * 報告啟動的模型名稱和任務描述，無視 logLevel 限制
		 * Report the launched model name and task description, ignore logLevel limit
		 *
		 * 模型資訊說明：
		 * - parentModel: 父 session 使用的模型（若存在）
		 * - resolvedModel: 解析後的模型（providerID/modelID 格式）
		 */
		logArise2WithLevel("info", () => [
			`[Arise] Background launch: ${opts.shadow} with model: ${formatModelBodyDescription(modelBody)} (parent: ${parentModelStr ?? "none"}), description: ${opts.description}`,
		], {
			force: true,
		});

		/**
		 * 非同步執行 prompt（fire and forget）
		 * Execute prompt asynchronously (fire and forget)
		 *
		 * promptAsync 不會等待完成，完成後自動排程輪詢
		 * promptAsync doesn't wait for completion, schedules polling after completion
		 */
		this.ctx.client.session
			.promptAsync({
				path: { id: sessionId },
				body: {
					agent: opts.shadow,
					model: modelBody,
					parts: [{ type: "text", text: opts.prompt }],
				},
			})
			.then(() =>
			{
				logArise2WithLevel("debug", () => [
					`[background-manager]`,
					`launch: promptAsync succeeded, taskId=${taskId}, scheduling polling`,
				]);
				this.schedulePolling(taskId, opts.shadow as IAllShadowAgentsName);
			})
			.catch((err) =>
			{
				task.status = BackgroundTaskStatus.Error;
				task.error = getErrorMessage(err);
				task.completedAt = Date.now();

				const resumeCheck = this.checkAutoResume(task);

				logArise2WithLevel("error", () => [
					`[background-manager]`,
					`launch: promptAsync error, taskId=${taskId}, error=${getErrorMessage(err)}, shouldAutoResume=${resumeCheck.should}${resumeCheck.reason
						? `, reason: ${resumeCheck.reason}`
						: ""}`,
				]);

				/**
				 * 檢查是否需要執行 auto-resume
				 * Check if auto-resume should be executed
				 */
				if (resumeCheck.should)
				{
					this.performAutoResume(task).catch((e) =>
					{
						this.ctx.client.app.log?.({
							body: formatAriseMsgLogBody({
								label: "Auto-resume",
								message: `Unexpected error in performAutoResume: ${getErrorMessage(e)}`,
								level: EnumLogLevel.Error,
							}),
						});
					});
				}
				else
				{
					this.notifyAutoResumeSkipped(task, resumeCheck.reason);
				}
			});

		return task;
	}

	/**
	 * 排程輪詢檢查任務狀態
	 * Schedule polling to check task status
	 *
	 * 計算下次輪詢的間隔時間
	 * Calculates the next polling interval
	 *
	 * 設定值透過公開 getter 方法取得，自動支援 per-agent 覆寫。
	 * Config values obtained via public getter methods, automatically supporting per-agent overrides.
	 *
	 * @param taskId - 任務 ID
	 * @param agentName - Shadow 名稱
	 */
	private schedulePolling(taskId: string, agentName?: IAllShadowAgentsName): void
	{
		const task = this.tasks.get(taskId);
		if (!task) return;

		/**
		 * 計算基本輪詢間隔
		 * Calculate base polling interval
		 *
		 * 透過公開方法取得 per-agent 設定值
		 * Get per-agent setting via public method
		 */
		const baseInterval = this.getPollInterval(agentName);

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`schedulePolling: taskId=${taskId}, baseInterval=${baseInterval}ms, agentName=${agentName ?? "default"}`,
		]);

		/**
		 * 計算重試延遲（從第二次失敗開始）
		 * Calculate retry delay (starts from second failure)
		 *
		 * 隨著重試次數增加，輪詢間隔會漸進式延長
		 * As retry count increases, polling interval progressively extends
		 *
		 * 計算方式：
		 * additionalDelay = min(retryCount * increment, maxDelay)
		 * interval = baseInterval + additionalDelay
		 */
		let interval = baseInterval;
		if (task.retryCount > 0)
		{
			const increment = this.getRetryDelayIncrement(agentName);
			const maxDelay = this.getRetryDelayMax(agentName);

			/**
			 * 計算額外延遲
			 * Calculate additional delay
			 *
			 * 遞增量 = retryCount * increment，但最多不超過 maxDelay
			 * Additional delay = retryCount * increment, capped at maxDelay
			 */
			const additionalDelay = Math.min(task.retryCount * increment, maxDelay);
			interval = baseInterval + additionalDelay;

			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`schedulePolling: retryCount=${task.retryCount}, delay=${additionalDelay}ms, interval=${interval}ms`,
			]);
		}
		else
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`schedulePolling: taskId=${taskId}, interval=${interval}ms`,
			]);
		}

		setTimeout(() => this.pollTaskCompletion(taskId), interval);
	}

	/**
	 * 輪詢檢查任務完成狀態
	 * Poll to check task completion status
	 *
	 * 檢查 session 狀態，根據結果更新任務狀態
	 * Checks session status and updates task status accordingly
	 *
	 * @param taskId - 任務 ID
	 */
	private async pollTaskCompletion(taskId: string): Promise<void>
	{
		const task = this.tasks.get(taskId);
		if (!task || task.status !== BackgroundTaskStatus.Running) return;

		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`pollTaskCompletion: taskId=${taskId}, currentStatus=${task.status}`,
		]);

		try
		{
			/**
			 * 檢查 session 狀態
			 * Check session status
			 */
			const statusResult = await this.ctx.client.session.status({});
			const statuses = statusResult.data;

			if (statuses && task.sessionId in statuses)
			{
				const status = statuses[task.sessionId];

				/**
				 * Session idle = 任務完成
				 * Session idle = task completed
				 */
				if (status.type === EnumSessionStatusType.Idle)
				{
					await this.extractResult(task);
					task.status = BackgroundTaskStatus.Completed;
					task.completedAt = Date.now();

					logArise2WithLevel("debug", () => [
						`[background-manager]`,
						`pollTaskCompletion: taskId=${taskId} completed, result length: ${task.result?.length ?? 0}`,
					]);

					await this.notifyParent(task);

					/**
					 * 更新 session 状态为 completed
					 * Update session status to completed
					 */
					runtimeCache.updateSessionStatus(task.sessionId, BackgroundTaskStatus.Completed);
				}
				/**
				 * Session busy/retry = 任務仍在執行，增加重試次數並繼續輪詢
				 * Session busy/retry = task still running, increment retry count and continue polling
				 */
				else if (status.type === EnumSessionStatusType.Busy || status.type === EnumSessionStatusType.Retry)
				{
					task.retryCount++;
					this.schedulePolling(taskId, task.shadow as IAllShadowAgentsName);
				}
			}
			else
			{
				/**
				 * Session 不在狀態 map 中，假定為 idle
				 * Session not in status map, assume idle
				 *
				 * 這是一種容錯機制，避免因狀態查詢失敗而無法完成任務
				 * This is a fault tolerance mechanism to avoid tasks never completing due to status query failures
				 */
				await this.extractResult(task);
				task.status = BackgroundTaskStatus.Completed;
				task.completedAt = Date.now();
				await this.notifyParent(task);

				/**
				 * 更新 session 状态为 completed（容错路径）
				 * Update session status to completed (fault tolerance path)
				 */
				runtimeCache.updateSessionStatus(task.sessionId, BackgroundTaskStatus.Completed);
			}
		}
		catch (err)
		{
			task.status = BackgroundTaskStatus.Error;
			task.error = getErrorMessage(err);
			task.completedAt = Date.now();

			/**
			 * 更新 session 状态为 error
			 * Update session status to error
			 */
			runtimeCache.updateSessionStatus(task.sessionId, BackgroundTaskStatus.Error, task.error);

			const resumeCheck = this.checkAutoResume(task);

			logArise2WithLevel("error", () => [
				`[background-manager]`,
				`pollTaskCompletion: taskId=${taskId}, error=${getErrorMessage(err)}, shouldAutoResume=${resumeCheck.should}${resumeCheck.reason
					? `, reason: ${resumeCheck.reason}`
					: ""}`,
			]);

			/**
			 * 檢查是否需要執行 auto-resume
			 * Check if auto-resume should be executed
			 */
			if (resumeCheck.should)
			{
				/**
				 * 非同步執行 auto-resume，不阻塞當前流程
				 * Execute auto-resume asynchronously, don't block current flow
				 */
				this.performAutoResume(task).catch((e) =>
				{
					this.ctx.client.app.log?.({
						body: formatAriseMsgLogBody({
							label: "Auto-resume",
							message: `Unexpected error in performAutoResume: ${getErrorMessage(e)}`,
							level: EnumLogLevel.Error,
						}),
					});
				});
			}
			else
			{
				this.notifyAutoResumeSkipped(task, resumeCheck.reason);
			}
		}
	}

	/**
	 * 提取任務結果
	 * Extract task result
	 *
	 * 從 session messages 中取得最後的 assistant 回應
	 * Gets last assistant response from session messages
	 *
	 * @param task - 任務物件
	 */
	private async extractResult(task: BackgroundTask): Promise<void>
	{
		try
		{
			const messages = await this.ctx.client.session.messages({
				path: { id: task.sessionId },
			});

			/**
			 * 取得最後一個 assistant 訊息
			 * Get last assistant message
			 *
			 * 過濾 role === "assistant" 的訊息，取最後一條
			 * Filter messages with role === "assistant", take the last one
			 */
			const lastAssistant = messages.data
				?.filter((m) => m.info.role === "assistant")
				.pop();

			if (lastAssistant)
			{
				/**
				 * 從訊息 parts 中提取文字內容
				 * Extract text content from message parts
				 *
				 * 支援多個 text parts，使用換行連接
				 * Supports multiple text parts, joined with newlines
				 */
				const textContent = lastAssistant.parts
					?.filter((p) => p.type === "text")
					.map((p) => (p as { type: "text"; text: string }).text ?? "")
					.join("\n");

				task.result = textContent || "(No response)";
			}
			else
			{
				task.result = "(No assistant response)";
			}
		}
		catch
		{
			task.result = "(Failed to retrieve result)";
		}
	}

	/**
	 * 通知父 session 任務完成
	 * Notify parent session of task completion
	 *
	 * 顯示 toast 通知使用者任務已完成
	 * Shows toast notification to user that task is complete
	 *
	 * @param task - 任務物件
	 */
	private async notifyParent(task: BackgroundTask): Promise<void>
	{
		/**
		 * 計算任務執行時長
		 * Calculate task execution duration
		 */
		const duration = task.completedAt
			? Math.round((task.completedAt - task.startedAt) / 1000)
			: 0;

		try
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`notifyParent: showing toast, task=${task.shadow} finished: ${task.description} (${duration}s)`,
			]);

			await this.ctx.client.tui.showToast({
				body: {
					title: "Shadow Complete",
					message: `${task.shadow} finished: ${task.description} (${duration}s)`,
					variant: "success",
					duration: 3000,
				},
			});
		}
		catch
		{
		}
	}

	/** 取得指定任務 / Get specific task */
	getTask(taskId: string): BackgroundTask | undefined
	{
		return this.tasks.get(taskId);
	}

	/**
	 * 透過 sessionId 取得任務
	 * Get task by session ID
	 *
	 * 用於支援 arise_summon(true) 建立的 session（ID 格式為 ses_xxx）
	 * Used to support sessions created by arise_summon(true) (ID format: ses_xxx)
	 *
	 * @param sessionId - Session ID (ses_xxx)
	 * @returns 任務或 undefined
	 */
	getTaskBySessionId(sessionId: string): BackgroundTask | undefined
	{
		return Array.from(this.tasks.values()).find((t) => t.sessionId === sessionId);
	}

	/** 取得所有任務 / Get all tasks */
	getAllTasks(): BackgroundTask[]
	{
		return Array.from(this.tasks.values());
	}

	/**
	 * 取得特定父 session 的所有任務
	 * Get all tasks for a specific parent session
	 *
	 * @param sessionId - 父 session ID
	 */
	getTasksForSession(sessionId: string): BackgroundTask[]
	{
		return Array.from(this.tasks.values()).filter(
			(t) => t.parentSessionId === sessionId,
		);
	}

	/**
	 * 取消任務
	 * Cancel task
	 *
	 * @param taskId - 任務 ID
	 * @returns 是否成功取消
	 */
	async cancelTask(taskId: string): Promise<boolean>
	{
		const task = this.tasks.get(taskId);
		if (!task || task.status !== BackgroundTaskStatus.Running) return false;

		try
		{
			await this.ctx.client.session.abort({ path: { id: task.sessionId } });
		}
		catch (error)
		{
			this.ctx.client.app.log?.({
				body: formatAriseMsgLogBody({
					label: "Auto-resume",
					message: `Failed to abort session ${task.sessionId}: ${getErrorMessage(error)}`,
					level: EnumLogLevel.Warn,
				}),
			});
		}

		task.status = BackgroundTaskStatus.Error;
		task.error = "Cancelled";
		task.completedAt = Date.now();
		return true;
	}

	/**
	 * 處理事件
	 * Handle events
	 *
	 * 監聽 session.idle 事件以標記任務完成
	 * Listen for session.idle events to mark tasks as complete
	 *
	 * @param event - 事件物件
	 */
	handleEvent(event: Event): void
	{
		if (event.type === EnumOpenCodeEventType.SessionIdle)
		{
			const sessionId = event.properties?.sessionID;
			if (sessionId)
			{
				/**
				 * 找出對應的任務並觸發輪詢檢查
				 * Find corresponding task and trigger polling check
				 *
				 * 這確保即使主動事件觸發，任務也能正確完成
				 * This ensures tasks are correctly completed even when triggered by active events
				 */
				for (const task of this.tasks.values())
				{
					if (task.sessionId === sessionId && task.status === BackgroundTaskStatus.Running)
					{
						this.pollTaskCompletion(task.id);
					}
				}
			}
		}
	}

	/**
	 * 手動重試任務
	 * Manual retry task
	 *
	 * 允許 agents 主動觸發任務重試，而非等待被動 auto-resume
	 * Allows agents to actively trigger task retry, instead of waiting for passive auto-resume
	 *
	 * @param taskId - 要重試的任務 ID
	 * @param force - 是否強制重試（即使任務不在 error 狀態）
	 * @param autoResume - 覆寫 foreground tasks 的 auto-resume 設定
	 * @param backgroundAutoResume - 覆寫 background tasks 的 auto-resume 設定
	 * @returns 重試結果訊息
	 */
	async manualRetry(
		taskId: string,
		force: boolean = false,
		autoResume?: boolean,
		backgroundAutoResume?: boolean,
	): Promise<string>
	{
		logArise2WithLevel("debug", () => [
			`[background-manager]`,
			`manualRetry called: taskId=${taskId}, force=${force}, autoResume=${autoResume}, backgroundAutoResume=${backgroundAutoResume}`,
		]);

		const task = this.tasks.get(taskId);

		/** 任務不存在 / Task not found */
		if (!task)
		{
			return formatAriseMsgError(`Task not found: ${taskId}`);
		}

		/** 檢查任務是否處於 error 狀態 / Check if task is in error state */
		if (task.status !== BackgroundTaskStatus.Error && !force)
		{
			return formatAriseMsgError(`Task ${taskId} is not in error state (status: ${task.status}). Use force=true to retry anyway.`);
		}

		/** 檢查是否正在等待 auto-resume 重試 / Check if waiting for auto-resume retry */
		if (task.resumePending)
		{
			return formatAriseMsgError(`Task ${taskId} is already pending auto-resume retry. Please wait for the current retry to complete.`);
		}

		/**
		 * 執行手動重試
		 * Perform manual retry
		 *
		 * 建立新的 session 並重新執行任務
		 * Create new session and re-execute task
		 */
		try
		{
			const session = await this.ctx.client.session.create({
				body: { title: formatAriseMsgTitleCustom(task.description, formatAriseMsgPrefixId(task.id, "manual retry")) },
			});

			const newSessionId = session.data?.id;
			if (!newSessionId)
			{
				throw new Error("Failed to create retry session");
			}

			/** 更新任務資訊 / Update task info */
			task.sessionId = newSessionId;
			task.status = BackgroundTaskStatus.Running;
			task.startedAt = Date.now();
			task.error = undefined;
			task.completedAt = undefined;
			task.resumeRetryCount = (task.resumeRetryCount ?? 0) + 1;

			/** 處理 runtime 參數覆寫 / Handle runtime parameter overrides */
			let autoResumeStatus = "unchanged";
			let backgroundAutoResumeStatus = "unchanged";

			if (autoResume !== undefined)
			{
				// 記錄覆寫日誌 / Log override (使用 info 等級讓使用者能看到)
				// Use info level so users can see the runtime setting change
				logArise2WithLevel("info", () => [
					`[background-manager]`,
					`manualRetry: autoResume runtime override: ${autoResume}`,
				]);
				// 臨時存儲覆寫值 / Temporarily store override value
				task.overrideAutoResume = autoResume;
				autoResumeStatus = autoResume ? "enabled" : "disabled";
			}

			if (backgroundAutoResume !== undefined)
			{
				// 記錄覆寫日誌 / Log override (使用 info 等級讓使用者能看到)
				// Use info level so users can see the runtime setting change
				logArise2WithLevel("info", () => [
					`[background-manager]`,
					`manualRetry: backgroundAutoResume runtime override: ${backgroundAutoResume}`,
				]);
				// 臨時存儲覆寫值 / Temporarily store override value
				task.overrideBackgroundAutoResume = backgroundAutoResume;
				backgroundAutoResumeStatus = backgroundAutoResume ? "enabled" : "disabled";
			}

			/** 執行 prompt / Execute prompt */
			this.ctx.client.session
				.promptAsync({
					path: { id: newSessionId },
					body: {
						agent: task.shadow,
						model: undefined,
						parts: [{ type: "text", text: task.description }],
					},
				})
				.then(() => this._publicSchedulePolling(task.id))
				.catch((err) =>
				{
					task.status = BackgroundTaskStatus.Error;
					task.error = getErrorMessage(err);
					task.completedAt = Date.now();
				});

			/** 建構 auto-resume 設定狀態訊息 / Build auto-resume setting status message */
			const autoResumeInfo: string[] = [];
			if (autoResume !== undefined)
			{
				autoResumeInfo.push(`Auto-resume (foreground): ${autoResumeStatus}`);
			}
			if (backgroundAutoResume !== undefined)
			{
				autoResumeInfo.push(`Auto-resume (background): ${backgroundAutoResumeStatus}`);
			}
			const autoResumeStatusMsg =
				autoResumeInfo.length > 0 ? `\n${autoResumeInfo.join(", ")}` : "";

			return formatAriseMsgSuccessMultiLine(
				`Manual retry initiated for task ${taskId}.`,
				`Attempt: ${task.resumeRetryCount}
Description: ${task.description}
Shadow: ${task.shadow}${autoResumeStatusMsg}

Use arise_background_output("${task.id}") to check the result.`,
			);
		}
		catch (error)
		{
			const msg = getErrorMessage(error);
			return formatAriseMsgError(`Failed to initiate manual retry: ${msg}`);
		}
	}

	/**
	 * 公開的排程輪詢方法（供外部使用）
	 * Public schedule polling method (for external use)
	 *
	 * @param taskId - 任務 ID
	 */
	private _publicSchedulePolling(taskId: string): void
	{
		/**
		 * 狀態日誌：開始公開輪詢
		 * Status log: starting public polling
		 */
		const task = this.tasks.get(taskId);
		if (task)
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`_publicSchedulePolling: taskId=${taskId}, shadow=${task.shadow}, status=${task.status}`,
			]);

			this.schedulePolling(taskId, task.shadow as IAllShadowAgentsName);
		}
		else
		{
			logArise2WithLevel("debug", () => [
				`[background-manager]`,
				`_publicSchedulePolling: task not found for taskId=${taskId}`,
			]);
		}
	}

	/**
	 * 取得 plugin 上下文（供外部工具使用）
	 * Get plugin context (for external tools)
	 *
	 * @returns Plugin 上下文
	 */
	getContext(): PluginInput
	{
		return this.ctx;
	}
}
