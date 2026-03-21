/**
 * 模型緩存管理器
 * Model cache manager
 *
 * 用於緩存每個會話使用的模型，實現 <auto> 模型自動取值功能
 * Caches the model used by each session for <auto> model inheritance
 *
 * 使用場景：
 * 當 Monarch 召喚 Shadow 時，Shadow 可以使用 <auto> 作為模型
 * 這時會自動沿用 Monarch 所在會話的模型
 *
 * Usage scenario:
 * When Monarch summons Shadow, Shadow can use <auto> as model
 * This will automatically inherit the model from Monarch's session
 */

/**
 * 會話模型緩存 Map
 * Session model cache Map
 *
 * Key: sessionId - 會話唯一識別符
 * Value: 模型字串 - 格式為 provider/modelID，如 "anthropic/claude-sonnet-4"
 *
 * Key: sessionId - unique session identifier
 * Value: model string - format provider/modelID, e.g., "anthropic/claude-sonnet-4"
 */
const sessionModelCache = new Map<string, string>();

/**
 * 緩存會話使用的模型
 * Cache session model
 *
 * 在會話開始時調用，將模型資訊存入緩存
 * Called at session start, stores model info in cache
 *
 * @param sessionId - 會話 ID
 * @param providerId - 模型提供者 ID（如 "anthropic"）
 * @param modelId - 模型 ID（如 "claude-sonnet-4"）
 */
export function cacheSessionModel(sessionId: string, providerId: string, modelId: string): void {
  /** 組合為標準格式 provider/modelID / Combine into standard format provider/modelID */
  const modelString = `${providerId}/${modelId}`;
  sessionModelCache.set(sessionId, modelString);
}

/**
 * 取得會話使用的模型
 * Get session model
 *
 * 根據 sessionId 取得之前緩存的模型字串
 * Gets previously cached model string based on sessionId
 *
 * @param sessionId - 會話 ID
 * @returns 模型字串，如 "anthropic/claude-sonnet-4"，若無則回傳 undefined
 */
export function getSessionModel(sessionId: string): string | undefined {
  return sessionModelCache.get(sessionId);
}

/**
 * 清除會話的模型緩存
 * Clear session model cache
 *
 * 當會話結束時調用，釋放記憶體
 * Called when session ends to free memory
 *
 * @param sessionId - 會話 ID
 */
export function clearSessionModel(sessionId: string): void {
  sessionModelCache.delete(sessionId);
}

/**
 * 清除所有模型緩存
 * Clear all session models
 *
 * 用於測試或完全重置
 * Used for testing or complete reset
 */
export function clearAllSessionModels(): void {
  sessionModelCache.clear();
}
