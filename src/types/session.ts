import type { IAllShadowAgentsName } from "./enums";
import type { IModelBody } from "./types-opencode";
import { BackgroundTaskStatus } from "./enums";

/**
 * Session 记录资讯
 * Session record information
 *
 * 混合了 SDK 原生资讯（从 chat.params hook 取得）+ Arise 追加的资讯
 *
 * @see chat.params hook input: { sessionID, agent, model: { providerID, modelID } }
 * @see SDK Message types: UserMessage (role: "user") | AssistantMessage (role: "assistant")
 */
export interface ISessionRecord
{
	// ========== SDK 原生栏位（从 chat.params input 取得）==========

	/** 会话 ID / Session ID */
	sessionID: string;
	/** 使用的代理 / Agent used */
	agent?: string;
	/** 使用的模型 / Model used */
	model?: IModelBody;
	/** 消息角色 / Message role (SDK: UserMessage.role = "user" | AssistantMessage.role = "assistant") */
	role?: "user" | "assistant";

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
