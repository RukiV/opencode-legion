/**
 * OpenCode 列舉類型定義
 * OpenCode enumeration type definitions
 *
 * 本檔案包含 OpenCode 外掛程式使用的列舉類型
 * This file contains enumeration types used by the OpenCode plugin
 */

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
