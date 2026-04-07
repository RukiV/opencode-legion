/**
 * 協作 Session 管理器
 * Collaboration Session Manager
 *
 * 管理持久化的協作 session 生命週期
 * Manages the lifecycle of persistent collaboration sessions
 */

import type { ToolContext } from "@opencode-ai/plugin";
import type { IAriseConfig } from "../../config/schema";
import { EnumCollaborateMode, EnumCollaborateTermination, EnumCollaborationSessionStatus } from "../../types/enums";
import type { INormalizedCollaborateShadowEntry } from "./arise-collaborate-normalizer";

/**
 * 協作 Session 物件
 * Collaboration session object
 */
export interface ICollaborationSession
{
	/** Session 唯一識別符 / Session unique identifier */
	id: string;
	/** 協作模式 / Collaboration mode */
	mode: EnumCollaborateMode;
	/** 正規化的 Shadows 列表 / Normalized shadows list */
	shadows: INormalizedCollaborateShadowEntry[];
	/** 任務提示 / Task prompt */
	prompt: string;
	/** 任務描述 / Task description */
	description?: string;
	/** 狀態 / Status */
	status: EnumCollaborationSessionStatus;
	/** 目前回合數 / Current round number */
	currentRound: number;
	/** 總回合數 / Total rounds */
	totalRounds: number;
	/** 最大並行數 / Max concurrent */
	maxConcurrent: number;
	/** 回合超時（毫秒）/ Round timeout (ms) */
	roundTimeoutMs: number;
	/** 每個 agent 回合數 / Per-agent rounds */
	perAgentRounds?: number;
	/** 每個 agent 已執行回合數 / Per-agent executed rounds */
	perAgentRoundCount: Map<string, number>;
	/** 所有回應歷史 / All response history */
	allResponses: string[];
	/** 回合回應記錄（round → agent label → response）/ Round responses */
	roundResponses: Map<number, Map<string, string>>;
	/** 每個 agent 的 session ID 映射 / Per-agent session ID mapping */
	agentSessionIds: Map<string, string>;
	/** 父 Session ID / Parent session ID */
	parentSessionId: string;
	/** 工具上下文 / Tool context */
	context: ToolContext;
	/** Arise 配置 / Arise config */
	config: IAriseConfig;
	/** 指定模型 / Specified model */
	model?: string;
	/** 創建時間 / Created timestamp */
	createdAt: number;
	/** 最後活動時間 / Last activity timestamp */
	lastActivityAt: number;
	/** 終止標記列表 / Termination markers detected */
	terminationMarkers: EnumCollaborateTermination[];
	/** 是否被終止 / Whether terminated */
	terminated: boolean;
	/** 終止類型 / Termination type */
	terminatedBy?: EnumCollaborateTermination;
	/** 終止時間 / Termination timestamp */
	terminatedAt?: number;
	/** 終止原因 / Termination reason */
	terminationReason?: string;
	/** 最終摘要 / Final summary */
	finalSummary?: string;
}

/**
 * 創建 session 的選項
 * Options for creating a session
 */
export interface ICreateCollaborationSessionOpts
{
	mode: EnumCollaborateMode;
	shadows: INormalizedCollaborateShadowEntry[];
	prompt: string;
	description?: string;
	totalRounds: number;
	maxConcurrent: number;
	roundTimeoutMs: number;
	perAgentRounds?: number;
	parentSessionId: string;
	context: ToolContext;
	config: IAriseConfig;
	model?: string;
}

/**
 * 協作 Session 管理器
 * Collaboration session manager
 *
 * 管理所有持久化協作 session 的生命週期
 * Manages the lifecycle of all persistent collaboration sessions
 */
export class CollaborationSessionManager
{
	/** Session 儲存 / Session storage */
	private sessions: Map<string, ICollaborationSession> = new Map();

	/**
	 * 產生唯一 session ID
	 * Generate unique session ID
	 */
	private generateSessionId(): string
	{
		return `collab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
	}

	/**
	 * 創建新的協作 session
	 * Create new collaboration session
	 *
	 * @param opts - 創建選項
	 * @returns 創建的 session
	 */
	create(opts: ICreateCollaborationSessionOpts): ICollaborationSession
	{
		const id = this.generateSessionId();
		const now = Date.now();

		const session: ICollaborationSession = {
			id,
			mode: opts.mode,
			shadows: opts.shadows,
			prompt: opts.prompt,
			description: opts.description,
			status: EnumCollaborationSessionStatus.Idle,
			currentRound: 0,
			totalRounds: opts.totalRounds,
			maxConcurrent: opts.maxConcurrent,
			roundTimeoutMs: opts.roundTimeoutMs,
			perAgentRounds: opts.perAgentRounds,
			perAgentRoundCount: new Map(),
			allResponses: [],
			roundResponses: new Map(),
			agentSessionIds: new Map(),
			parentSessionId: opts.parentSessionId,
			context: opts.context,
			config: opts.config,
			model: opts.model,
			createdAt: now,
			lastActivityAt: now,
			terminationMarkers: [],
			terminated: false,
		};

		this.sessions.set(id, session);

		return session;
	}

	/**
	 * 取得 session
	 * Get session
	 *
	 * @param sessionId - Session ID
	 * @returns session 或 undefined
	 */
	get(sessionId: string): ICollaborationSession | undefined
	{
		return this.sessions.get(sessionId);
	}

	/**
	 * 列出所有 session
	 * List all sessions
	 *
	 * @param filter - 可選的過濾器
	 * @returns session 列表
	 */
	list(filter?: { status?: EnumCollaborationSessionStatus }): ICollaborationSession[]
	{
		const sessions = Array.from(this.sessions.values());
		if (!filter) return sessions;
		if (filter.status) return sessions.filter(s => s.status === filter.status);
		return sessions;
	}

	/**
	 * 刪除 session
	 * Delete session
	 *
	 * @param sessionId - Session ID
	 * @returns 是否成功刪除
	 */
	delete(sessionId: string): boolean
	{
		return this.sessions.delete(sessionId);
	}

	/**
	 * 清理已完成的 session
	 * Clean up completed sessions
	 *
	 * @param maxAgeMs - 最大存活時間（毫秒），預設 1 小時
	 * @returns 清理的 session 數量
	 */
	cleanupOldSessions(maxAgeMs: number = 3600000): number
	{
		const now = Date.now();
		let count = 0;

		for (const [id, session] of this.sessions)
		{
			if (
				(session.status === EnumCollaborationSessionStatus.Completed ||
					session.status === EnumCollaborationSessionStatus.Cancelled) &&
				(now - session.lastActivityAt) > maxAgeMs
			)
			{
				this.sessions.delete(id);
				count++;
			}
		}

		return count;
	}

	/**
	 * 取得統計資訊
	 * Get statistics
	 */
	getStats(): {
		total: number;
		active: number;
		completed: number;
		cancelled: number;
	}
	{
		const sessions = Array.from(this.sessions.values());
		return {
			total: sessions.length,
			active: sessions.filter(s =>
				s.status === EnumCollaborationSessionStatus.Idle ||
				s.status === EnumCollaborationSessionStatus.Executing,
			).length,
			completed: sessions.filter(s => s.status === EnumCollaborationSessionStatus.Completed).length,
			cancelled: sessions.filter(s => s.status === EnumCollaborationSessionStatus.Cancelled).length,
		};
	}
}

/**
 * 全域單例
 * Global singleton
 */
export const collaborationSessionManager = new CollaborationSessionManager();
