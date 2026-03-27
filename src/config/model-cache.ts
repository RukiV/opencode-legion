/**
 * 模型緩存管理器
 * Model cache manager
 *
 * 用於緩存每個會話使用的模型，實現 AUTO 模型自動取值功能
 * Caches the model used by each session for AUTO model inheritance
 *
 * 使用場景：
 * 當 Monarch 召喚 Shadow 時，Shadow 可以使用 AUTO 作為模型
 * 這時會自動沿用 Monarch 所在會話的模型
 *
 * Usage scenario:
 * When Monarch summons Shadow, Shadow can use AUTO as model
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

// ============================================================
// Providers Cache / 提供者緩存
// ============================================================

/**
 * 提供者資料結構
 * Provider data structure
 *
 * 從 OpenCode SDK config.providers() 取得
 * Obtained from OpenCode SDK config.providers()
 */
export interface CachedProvider {
  /** 提供者 ID（如 "anthropic"、"openai"） */
  id: string;
  /** 提供者名稱 */
  name?: string;
  /** 模型映射（key 為模型 ID） */
  models?: Record<string, {
    /** 模型 ID */
    id?: string;
    /** 模型名稱 */
    name?: string;
    /** 模型限制 */
    limit?: {
      /** 上下文窗口大小 */
      context?: number;
      /** 輸出限制 */
      output?: number;
    };
  }>;
  /** 是否為預設提供者 */
  default?: boolean;
}

/**
 * 提供者緩存資料結構
 * Provider cache data structure
 */
export interface ProvidersCache {
  /** 緩存的提供者列表 */
  providers: CachedProvider[];
  /** 緩存時間戳 */
  timestamp: number;
  /** 過期時間（毫秒），預設 5 分鐘 */
  expiresIn: number;
}

/** 提供者緩存（模組級別單例） */
let providersCache: ProvidersCache | null = null;

/**
 * 預設緩存過期時間（毫秒）
 * Default cache expiration time (ms)
 *
 * 5 分鐘 = 300000 毫秒
 */
export const DEFAULT_PROVIDERS_CACHE_TTL = 5 * 60 * 1000;

/**
 * 設定提供者緩存
 * Set providers cache
 *
 * @param providers - 提供者列表
 * @param expiresIn - 過期時間（毫秒），預設 5 分鐘
 */
export function setProvidersCache(
  providers: CachedProvider[],
  expiresIn: number = DEFAULT_PROVIDERS_CACHE_TTL
): void {
  providersCache = {
    providers,
    timestamp: Date.now(),
    expiresIn,
  };
}

/**
 * 取得提供者緩存
 * Get providers cache
 *
 * @param forceRefresh - 是否強制刷新，忽略緩存
 * @returns 提供者緩存，若過期或不存在則回傳 null
 */
export function getProvidersCache(forceRefresh: boolean = false): ProvidersCache | null {
  if (!providersCache) {
    return null;
  }

  // 如果強制刷新，直接返回 null
  if (forceRefresh) {
    return null;
  }

  // 檢查是否過期
  const now = Date.now();
  const age = now - providersCache.timestamp;

  if (age > providersCache.expiresIn) {
    return null;
  }

  return providersCache;
}

/**
 * 檢查提供者緩存是否存在且有效
 * Check if providers cache exists and is valid
 *
 * @returns 是否有效
 */
export function hasValidProvidersCache(): boolean {
  return getProvidersCache() !== null;
}

/**
 * 清除提供者緩存
 * Clear providers cache
 */
export function clearProvidersCache(): void {
  providersCache = null;
}
