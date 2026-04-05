import type { ISessionRecord } from "../../types/session";
import type { IModelBody } from "../../types/types-opencode";
import { BackgroundTaskStatus } from "../../types/enums";

/**
 * Session 记录缓存上限
 * Maximum session records cache size
 */
const SESSION_RECORDS_MAX = 100;

/**
 * Session 记录缓存保留数量
 * Session records to keep after cleanup
 */
const SESSION_RECORDS_KEEP = 50;

/**
 * 执行期全域缓存类别
 * Runtime global cache class
 *
 * 集中管理所有执行期间的资料共享
 * Centralized management of all runtime data sharing
 *
 * 使用方法：
 * ```typescript
 * import { runtimeCache } from './session-cache';
 *
 * runtimeCache.userConfigModelIsAuto.add('beru');
 * runtimeCache.userConfigModelIsAuto.has('beru');
 * ```
 */
class RuntimeCache
{
	/**
	 * 用户在 config 中设定为 AUTO 的 agent 集合（protected）
	 * Set of agents where user config model is AUTO
	 *
	 * 在 config 初始化阶段记录，呼叫阶段会还原为 AUTO 以取得父会话模型
	 * Recorded during config initialization, restored to AUTO during call phase to get parent model
	 */
	protected _userConfigModelIsAuto = new Set<string>();

	/**
	 * session 记录缓存（protected）
	 * Session records cache
	 *
	 * 存储完整的 session 记录资讯
	 * Stores complete session record information
	 */
	protected _sessionRecords = new Map<string, ISessionRecord>();

	// ============================================================
	// User Config Model Is AUTO API
	// ============================================================

	/**
	 * 記錄 agent 的 user config 模型為 AUTO
	 * Record agent's user config model is AUTO
	 */
	addUserConfigModelIsAuto(agentName: string): void
	{
		this._userConfigModelIsAuto.add(agentName);
	}

	/**
	 * 檢查 agent 的 user config 模型是否為 AUTO
	 * Check if agent's user config model is AUTO
	 */
	hasUserConfigModelIsAuto(agentName: string): boolean
	{
		return this._userConfigModelIsAuto.has(agentName);
	}

	/**
	 * 取得所有 user config 模型為 AUTO 的 agent
	 * Get all agents where user config model is AUTO
	 */
	getUserConfigModelIsAuto(): string[]
	{
		return Array.from(this._userConfigModelIsAuto);
	}

	// ============================================================
	// Session Model API (delegates to Session Records)
	// ============================================================

	/**
	 * 缓存会话使用的模型
	 * Cache session model
	 *
	 * @param sessionId - session ID
	 * @param providerId - provider ID
	 * @param modelId - model ID
	 */
	cacheSessionModel(sessionId: string, providerId: string, modelId: string): void
	{
		const modelBody: IModelBody = {
			providerID: providerId,
			modelID: modelId,
		};

		const existing = this._sessionRecords.get(sessionId);
		if (existing)
		{
			existing.model = modelBody;
		}
		else
		{
			const record: ISessionRecord = {
				sessionID: sessionId,
				model: modelBody,
			};
			this._sessionRecords.set(sessionId, record);
		}
	}

	/**
	 * 取得会话使用的模型
	 * Get session model
	 *
	 * @param sessionId - session ID
	 * @returns IModelBody，若无则返回 undefined
	 */
	getSessionModel(sessionId: string): IModelBody | undefined
	{
		const record = this._sessionRecords.get(sessionId);
		return record?.model;
	}

	// ============================================================
	// Session Record API
	// ============================================================

	/**
	 * 缓存 session 记录
	 * Cache session record
	 *
	 * @param record - session 记录 / Session record
	 */
	cacheSessionRecord(record: ISessionRecord): void
	{
		this._sessionRecords.set(record.sessionID, record);

		// 如果超过上限，进行清理
		if (this._sessionRecords.size > SESSION_RECORDS_MAX)
		{
			this.pruneSessionRecords();
		}
	}

	/**
	 * 清理旧的 session 记录
	 * Prune old session records
	 *
	 * 当记录数量超过 SESSION_RECORDS_MAX 时，保留最新的 SESSION_RECORDS_KEEP 条记录
	 */
	pruneSessionRecords(): void
	{
		if (this._sessionRecords.size <= SESSION_RECORDS_MAX)
		{
			return;
		}

		// 按创建时间排序（从旧到新）
		const sorted = Array.from(this._sessionRecords.entries())
			.sort((a, b) => (a[1]._arise?.createdAt ?? 0) - (b[1]._arise?.createdAt ?? 0));

		// 保留最新的 SESSION_RECORDS_KEEP 条
		const toKeep = sorted.slice(-SESSION_RECORDS_KEEP);
		const toKeepSet = new Set(toKeep.map(([id]) => id));

		// 删除旧的记录
		for (const sessionId of this._sessionRecords.keys())
		{
			if (!toKeepSet.has(sessionId))
			{
				this._sessionRecords.delete(sessionId);
			}
		}
	}

	/**
	 * 取得 session 记录
	 * Get session record
	 *
	 * @param sessionId - session ID
	 * @returns session 记录，若无则返回 undefined
	 */
	getSessionRecord(sessionId: string): ISessionRecord | undefined
	{
		return this._sessionRecords.get(sessionId);
	}

	/**
	 * 更新 session 状态
	 * Update session status
	 *
	 * @param sessionId - session ID
	 * @param status - 新状态 / New status
	 * @param error - 错误讯息（可选）/ Error message (optional)
	 * @param completedAt - 完成时间戳（可选，未传入时自动设置）/ Completion timestamp (optional, auto-set if not provided)
	 */
	updateSessionStatus(
		sessionId: string,
		status: BackgroundTaskStatus,
		error?: string,
		completedAt?: number
	): void
	{
		const record = this._sessionRecords.get(sessionId);
		if (record)
		{
			if (!record._arise)
			{
				record._arise = {};
			}
			record._arise.status = status;

			/** 当状态为完成时，自动设置完成时间戳（除非调用方已显式指定）/ Auto-set completion timestamp when status is completed (unless caller explicitly specified) */
			if (status === BackgroundTaskStatus.Completed)
			{
				record._arise.completedAt = completedAt ?? Date.now();
			}

			if (error)
			{
				record._arise.error = error;
			}
		}
	}

	/**
	 * 取得所有 session 记录
	 * Get all session records
	 *
	 * @returns 所有 session 记录的数组
	 */
	getAllSessionRecords(): ISessionRecord[]
	{
		return Array.from(this._sessionRecords.values());
	}

	// ============================================================
	// Clear API
	// ============================================================

	/**
	 * 清除所有缓存
	 * Clear all caches
	 */
	clear(): void
	{
		this._userConfigModelIsAuto.clear();
		this._sessionRecords.clear();
	}

	/**
	 * 清除指定 session 的模型缓存
	 * Clear session model cache
	 *
	 * @param sessionId - session ID
	 */
	clearSessionModel(sessionId: string): void
	{
		this._sessionRecords.delete(sessionId);
	}

	/**
	 * 清除所有 session 模型缓存
	 * Clear all session model caches
	 */
	clearAllSessionModels(): void
	{
		this._sessionRecords.clear();
	}

	// ============================================================
	// Debug API
	// ============================================================

	/**
	 * 取得除错资讯
	 * Get debug information
	 *
	 * @returns 包含所有缓存状态的物件
	 */
	debugInfo(): Record<string, unknown>
	{
		return {
			userConfigModelIsAuto: Array.from(this._userConfigModelIsAuto),
			sessionRecords: Object.fromEntries(this._sessionRecords),
		};
	}
}

/**
 * 執行期全域緩存單例
 * Runtime global cache singleton
 */
export const runtimeCache = new RuntimeCache();
