/**
 * Shadow Agent 相關型別定義
 * Shadow Agent type definitions
 */

/**
 * Shadow Agent 模式
 * - PRIMARY: 主代理（ Monarch 使用）
 * - SUBAGENT: 子代理（其他 Shadow 使用）
 * - ALL: 所有模式
 */
export enum EnumOpencodeAgentMode {
  PRIMARY = "primary",
  SUBAGENT = "subagent",
  ALL = "all",
}

/**
 * Shadow Agent 權限等級
 * - ALLOW: 允許執行
 * - DENY: 拒絕執行
 * - ASK: 詢問使用者
 */
export enum EnumOpencodeAgentPermission {
  ALLOW = "allow",
  DENY = "deny",
  ASK = "ask",
}
