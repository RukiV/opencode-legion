/**
 * OpenCode 事件類型列舉
 * OpenCode event types enumeration
 *
 * 定義所有 OpenCode SDK 支援的事件類型
 * Defines all event types supported by OpenCode SDK
 *
 * @see https://opencode.ai/docs/events/
 * @see node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts (Event 聯合類型)
 */

import { ITSTypeAndStringLiteral } from 'ts-type';

/**
 * OpenCode 事件類型列舉
 * OpenCode event types enumeration
 *
 * 對應 `import("@opencode-ai/sdk").Event["type"]` 的所有可能值
 * Corresponds to all possible values of `import("@opencode-ai/sdk").Event["type"]`
 *
 * @see https://opencode.ai/docs/events/
 * @see node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts (Event 聯合類型)
 * @see import("@opencode-ai/sdk").Event["type"]
 */
export enum EnumOpenCodeEventType
{
	/** 伺服器實例已處置 / Server instance disposed */
	ServerInstanceDisposed = "server.instance.disposed",
	/** 安裝已更新 / Installation updated */
	InstallationUpdated = "installation.updated",
	/** 安裝更新可用 / Installation update available */
	InstallationUpdateAvailable = "installation.update-available",
	/** LSP 客戶端診斷資訊 / LSP client diagnostics */
	LspClientDiagnostics = "lsp.client.diagnostics",
	/** LSP 已更新 / LSP updated */
	LspUpdated = "lsp.updated",
	/** 訊息已更新 / Message updated */
	MessageUpdated = "message.updated",
	/** 訊息已移除 / Message removed */
	MessageRemoved = "message.removed",
	/** 訊息部分已更新 / Message part updated */
	MessagePartUpdated = "message.part.updated",
	/** 訊息部分已移除 / Message part removed */
	MessagePartRemoved = "message.part.removed",
	/** 權限已更新 / Permission updated */
	PermissionUpdated = "permission.updated",
	/** 權限已回覆 / Permission replied */
	PermissionReplied = "permission.replied",
	/** 會話狀態 / Session status */
	SessionStatus = "session.status",
	/** 會話閒置 / Session idle */
	SessionIdle = "session.idle",
	/** 會話已壓縮 / Session compacted */
	SessionCompacted = "session.compacted",
	/** 檔案已編輯 / File edited */
	FileEdited = "file.edited",
	/** TODO 已更新 / Todo updated */
	TodoUpdated = "todo.updated",
	/** 命令已執行 / Command executed */
	CommandExecuted = "command.executed",
	/** 會話已創建 / Session created */
	SessionCreated = "session.created",
	/** 會話已更新 / Session updated */
	SessionUpdated = "session.updated",
	/** 會話已刪除 / Session deleted */
	SessionDeleted = "session.deleted",
	/** 會話差異 / Session diff */
	SessionDiff = "session.diff",
	/** 會話錯誤 / Session error */
	SessionError = "session.error",
	/** 檔案監視器已更新 / File watcher updated */
	FileWatcherUpdated = "file.watcher.updated",
	/** VCS 分支已更新 / VCS branch updated */
	VcsBranchUpdated = "vcs.branch.updated",
	/** TUI 提示附加 / TUI prompt append */
	TuiPromptAppend = "tui.prompt.append",
	/** TUI 命令執行 / TUI command execute */
	TuiCommandExecute = "tui.command.execute",
	/** TUI 通知顯示 / TUI toast show */
	TuiToastShow = "tui.toast.show",
	/** PTY 已創建 / Pty created */
	PtyCreated = "pty.created",
	/** PTY 已更新 / Pty updated */
	PtyUpdated = "pty.updated",
	/** PTY 已退出 / Pty exited */
	PtyExited = "pty.exited",
	/** PTY 已刪除 / Pty deleted */
	PtyDeleted = "pty.deleted",
	/** 伺服器已連線 / Server connected */
	ServerConnected = "server.connected",
}

/**
 * 所有 OpenCode 事件類型陣列
 * All OpenCode event types array
 *
 * 用於建立 Zod schema 或驗證
 * Used for Zod schema creation or validation
 */
export const ALL_OPENCODE_EVENT_TYPES = [
	EnumOpenCodeEventType.ServerInstanceDisposed,
	EnumOpenCodeEventType.InstallationUpdated,
	EnumOpenCodeEventType.InstallationUpdateAvailable,
	EnumOpenCodeEventType.LspClientDiagnostics,
	EnumOpenCodeEventType.LspUpdated,
	EnumOpenCodeEventType.MessageUpdated,
	EnumOpenCodeEventType.MessageRemoved,
	EnumOpenCodeEventType.MessagePartUpdated,
	EnumOpenCodeEventType.MessagePartRemoved,
	EnumOpenCodeEventType.PermissionUpdated,
	EnumOpenCodeEventType.PermissionReplied,
	EnumOpenCodeEventType.SessionStatus,
	EnumOpenCodeEventType.SessionIdle,
	EnumOpenCodeEventType.SessionCompacted,
	EnumOpenCodeEventType.FileEdited,
	EnumOpenCodeEventType.TodoUpdated,
	EnumOpenCodeEventType.CommandExecuted,
	EnumOpenCodeEventType.SessionCreated,
	EnumOpenCodeEventType.SessionUpdated,
	EnumOpenCodeEventType.SessionDeleted,
	EnumOpenCodeEventType.SessionDiff,
	EnumOpenCodeEventType.SessionError,
	EnumOpenCodeEventType.FileWatcherUpdated,
	EnumOpenCodeEventType.VcsBranchUpdated,
	EnumOpenCodeEventType.TuiPromptAppend,
	EnumOpenCodeEventType.TuiCommandExecute,
	EnumOpenCodeEventType.TuiToastShow,
	EnumOpenCodeEventType.PtyCreated,
	EnumOpenCodeEventType.PtyUpdated,
	EnumOpenCodeEventType.PtyExited,
	EnumOpenCodeEventType.PtyDeleted,
	EnumOpenCodeEventType.ServerConnected,
] as const satisfies EnumOpenCodeEventType[];

/**
 * 會話事件類型列舉
 * Session event types enumeration
 *
 * 定義我們處理的會話事件類型
 * Defines the session event types we handle
 */
export enum EnumOpenCodeEventTypeWithSession
{
	/** 會話創建 / Session created */
	SessionCreated = EnumOpenCodeEventType.SessionCreated,
	/** 會話閒置 / Session idle */
	SessionIdle = EnumOpenCodeEventType.SessionIdle,
	/** 會話刪除 / Session deleted */
	SessionDeleted = EnumOpenCodeEventType.SessionDeleted,
}

export const SUPPORTED_SESSION_EVENT_TYPES = [
	EnumOpenCodeEventTypeWithSession.SessionCreated,
	EnumOpenCodeEventTypeWithSession.SessionIdle,
	EnumOpenCodeEventTypeWithSession.SessionDeleted,
] as const;
/**
 * 會話事件類型
 * Session event types
 *
 * 定義我們處理的會話事件類型
 * Defines the session event types we handle
 */
export type IOpenCodeEventTypeWithSession = ITSTypeAndStringLiteral<EnumOpenCodeEventTypeWithSession>;

/**
 * 檢查是否為會話事件
 * Check if event is a session event
 *
 * @param eventType - 事件類型 / Event type
 * @returns 是否為會話事件 / Whether it's a session event
 */
export function isSessionEvent(eventType: string | EnumOpenCodeEventTypeWithSession | EnumOpenCodeEventType): eventType is IOpenCodeEventTypeWithSession
{
	return SUPPORTED_SESSION_EVENT_TYPES.includes(eventType as EnumOpenCodeEventTypeWithSession);
}
