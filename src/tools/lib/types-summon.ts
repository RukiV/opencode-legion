import { BackgroundTaskStatus, EnumCollaborateMode, EnumShadowSubAgentsName } from '../../types/enums';
import { IAriseCollaborateOptionsInput } from '../../config/schema/entry';

/**
 * 背景任務結構定義
 * Background task structure definition
 *
 * 追蹤每個背景 Shadow 任務的狀態和結果
 * Tracks the status and result of each background Shadow task
 */
export interface IBackgroundTask
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
	/** 工具權限配置（控制子代理可用工具）/ Tools permission config (controls sub-agent available tools) */
	tools?: Record<string, boolean>;
}

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

export interface IBackgroundTaskLaunchParams
{
	shadow: string;
	prompt: string;
	description: string;
	parentSessionId: string;
	model?: string;
	existingSessionId?: string;
	/** 工具權限配置 / Tools permission config */
	tools?: Record<string, boolean>;
}

/**
 * Collaborate 工具參數類型
 * Collaborate tool arguments type
 */
export interface ICollaborateArgs extends IAriseCollaborateOptionsInput
{
	/** 協作模式 / Collaboration mode */
	mode: EnumCollaborateMode;
	/** 參與的 Shadow Agent 列表 / List of participating Shadow agents */
	shadows: {
		/** Shadow agent 名稱 / Shadow agent name */
		agent: EnumShadowSubAgentsName;
		/** 模型名稱，預設 "AUTO" / Model name, default "AUTO" */
		model?: string;
		/** 自訂標籤，選填 / Custom label, optional */
		label?: string;
	}[];
	/** 任務提示 / Task prompt */
	prompt: string;
	/** 任務描述（可選）/ Task description (optional) */
	description?: string;
	/** 總回合數（可選）/ Total rounds (optional) */
	total_rounds?: number;
	/** 最大並行數（可選）/ Max concurrent (optional) */
	max_concurrent?: number;
	/** 回合超時（毫秒，可選）/ Round timeout in ms (optional) */
	round_timeout_ms?: number;
	/** 每個 agent 回合數（可選）/ Per-agent rounds (optional) */
	per_agent_rounds?: number;
	/** 是否創建持久化 session / Whether to create persistent session */
	persistent?: boolean;
	/** 現有 session ID（繼續協作）/ Existing session ID (continue collaboration) */
	session_id?: string;
	/** 結束 session / End session */
	end_session?: boolean;
	/** 暫停 session / Pause session */
	pause_session?: boolean;
	/** 是否重用子代理 session（可選）/ Whether to reuse sub-agent session (optional) */
	reuse_agent_session?: boolean;
	/** 是否禁止子代理使用召喚工具（可選）/ Whether to block sub-agent summoning tools (optional) */
	block_subagent_tools?: boolean;
}
