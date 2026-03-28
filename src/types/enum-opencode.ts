/**
 * OpenCode 列舉類型定義
 * OpenCode enumeration type definitions
 *
 * 本檔案包含 OpenCode 外掛程式使用的列舉類型
 * This file contains enumeration types used by the OpenCode plugin
 */

import { ITSTypeAndStringLiteral } from "ts-type";

/**
 * 會話事件類型列舉
 * Session event types enumeration
 *
 * 定義我們處理的會話事件類型
 * Defines the session event types we handle
 */
export enum EnumSessionEventType
{
	/** 會話創建 / Session created */
	SessionCreated = "session.created",
	/** 會話閒置 / Session idle */
	SessionIdle = "session.idle",
	/** 會話刪除 / Session deleted */
	SessionDeleted = "session.deleted",
}

export const SUPPORTED_SESSION_EVENT_TYPES = [
	EnumSessionEventType.SessionCreated,
	EnumSessionEventType.SessionIdle,
	EnumSessionEventType.SessionDeleted,
] as const;

/**
 * 會話事件類型
 * Session event types
 *
 * 定義我們處理的會話事件類型
 * Defines the session event types we handle
 */
export type ISessionEventType = ITSTypeAndStringLiteral<EnumSessionEventType>;

/**
 * Shadow Agent 模式
 * Shadow Agent mode
 *
 * - PRIMARY: 主代理（Monarch 使用）
 * - SUBAGENT: 子代理（其他 Shadow 使用）
 * - ALL: 所有模式
 */
export enum EnumOpencodeAgentMode {
	/** 主代理模式 - 唯一的主要協調者 / Primary mode - the only main coordinator */
	PRIMARY = "primary",
	/** 子代理模式 - 被 Monarch 召喚的 Shadow / Subagent mode - Shadows summoned by Monarch */
	SUBAGENT = "subagent",
	/** 所有模式 - 可同時作為主代理和子代理 / All modes - can be both primary and subagent */
	ALL = "all",
}

/**
 * Shadow Agent 權限等級
 * Shadow Agent permission level
 *
 * 控制 Shadow 代理對特定操作的權限
 * Controls Shadow agent permissions for specific operations
 *
 * - ALLOW: 允許執行
 * - DENY: 拒絕執行
 * - ASK: 詢問使用者
 */
export enum EnumOpencodeAgentPermission {
	/** 允許執行 / Allow execution */
	ALLOW = "allow",
	/** 拒絕執行 / Deny execution */
	DENY = "deny",
	/** 詢問使用者 / Ask user */
	ASK = "ask",
}
