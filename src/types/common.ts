/**
 * 公共类型定義（單一來源）
 * Common type definitions (Single Source of Truth)
 */

/**
 * JSON 物件類型
 * JSON object type
 *
 * 統一的 JsonObject 定義，避免重複定義
 * Unified JsonObject definition to avoid duplicate definitions
 */
export type JsonObject = Record<string, unknown>;
