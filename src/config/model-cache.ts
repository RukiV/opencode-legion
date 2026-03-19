/**
 * 模型緩存管理器
 * 用於緩存每個會話使用的模型，實現 <auto> 模型自動取值功能
 * 
 * Model cache manager
 * Caches the model used by each session for <auto> model inheritance
 */

/**
 * 會話模型緩存 Map
 * key: sessionId, value: 模型字串 (provider/modelID format)
 */
const sessionModelCache = new Map<string, string>();

/**
 * 緩存會話使用的模型
 * @param sessionId - 會話 ID
 * @param providerId - 模型提供者 ID
 * @param modelId - 模型 ID
 */
export function cacheSessionModel(sessionId: string, providerId: string, modelId: string): void {
  const modelString = `${providerId}/${modelId}`;
  sessionModelCache.set(sessionId, modelString);
}

/**
 * 取得會話使用的模型
 * @param sessionId - 會話 ID
 * @returns 模型字串，如 "anthropic/claude-sonnet-4"，若無則回傳 undefined
 */
export function getSessionModel(sessionId: string): string | undefined {
  return sessionModelCache.get(sessionId);
}

/**
 * 清除會話的模型緩存（當會話結束時調用）
 * @param sessionId - 會話 ID
 */
export function clearSessionModel(sessionId: string): void {
  sessionModelCache.delete(sessionId);
}

/**
 * 清除所有模型緩存（用於測試或重置）
 */
export function clearAllSessionModels(): void {
  sessionModelCache.clear();
}
