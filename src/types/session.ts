import type { IAllShadowAgentsName } from "./enums";
import { BackgroundTaskStatus } from "./enums";

/**
 * Session 记录资讯
 * Session record information
 *
 * 混合了 SDK 原生资讯（从 chat.params hook 取得）+ Arise 追加的资讯
 *
 * @see chat.params hook input: { sessionID, agent, model: { providerID, modelID } }
 */
export interface ISessionRecord {
	// ========== SDK 原生栏位（从 chat.params input 取得）==========

	/** 会话 ID / Session ID */
	sessionID: string;
	/** 使用的代理 / Agent used */
	agent?: string;
	/** 使用的模型（provider/model 格式）/ Model used */
	model?: string;

	// ========== Arise 追加栏位 ==========

	/** Arise 追加的资讯 / Arise additional info */
	_arise?: {
		/** Shadow 名称（若由 Shadow 建立）/ Shadow name */
		shadow?: IAllShadowAgentsName;
		/** 解析后的模型（优先于 model）/ Resolved model */
		resolvedModel?: string;
		/** 父 Session ID / Parent session ID */
		parentSessionId?: string;
		/** 建立时间戳 / Created timestamp */
		createdAt?: number;
		/** 完成时间戳 / Completed timestamp */
		completedAt?: number;
		/** 任务状态 / Task status */
		status?: BackgroundTaskStatus;
		/** 错误讯息 / Error message */
		error?: string;
	};
}