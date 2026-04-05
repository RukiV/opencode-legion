/**
 * 執行期全域緩存類別
 * Runtime global cache class
 *
 * 集中管理所有執行期間的資料共享
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
	 * 用戶在 config 中設定為 AUTO 的 agent 集合（protected）
	 * Set of agents where user config model is AUTO
	 *
	 * 在 config 初始化階段記錄，呼叫階段會還原為 AUTO 以取得父會話模型
	 * Recorded during config initialization, restored to AUTO during call phase to get parent model
	 */
	protected _userConfigModelIsAuto = new Set<string>();

	/**
	 * session 模型緩存（protected）
	 * Session model cache
	 */
	protected _sessionModels = new Map<string, string>();

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
	// Session Model API
	// ============================================================

	/**
	 * 緩存會話使用的模型
	 */
	cacheSessionModel(sessionId: string, providerId: string, modelId: string): void
	{
		this._sessionModels.set(sessionId, `${providerId}/${modelId}`);
	}

	/**
	 * 取得會話使用的模型
	 */
	getSessionModel(sessionId: string): string | undefined
	{
		return this._sessionModels.get(sessionId);
	}

	// ============================================================
	// Clear API
	// ============================================================

	/**
	 * 清除所有緩存
	 */
	clear(): void
	{
		this._userConfigModelIsAuto.clear();
		this._sessionModels.clear();
	}

	/**
	 * 清除指定 session 的模型緩存
	 */
	clearSessionModel(sessionId: string): void
	{
		this._sessionModels.delete(sessionId);
	}

	/**
	 * 清除所有 session 模型緩存
	 */
	clearAllSessionModels(): void
	{
		this._sessionModels.clear();
	}

	// ============================================================
	// Debug API
	// ============================================================

	/**
	 * 取得除錯資訊
	 */
	debugInfo(): Record<string, unknown>
	{
		return {
			userConfigModelIsAuto: Array.from(this._userConfigModelIsAuto),
			sessionModels: Object.fromEntries(this._sessionModels),
		};
	}
}

/**
 * 執行期全域緩存單例
 * Runtime global cache singleton
 */
export const runtimeCache = new RuntimeCache();
