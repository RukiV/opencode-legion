import type { PluginInput } from "@opencode-ai/plugin";
import { EnumSessionStatusType } from "../../types/enum-opencode";

/**
 * Session 狀態型別 / Session status type
 *
 * 對應 OpenCode 內部定義的 SessionStatus discriminated union
 * Maps to OpenCode's internal SessionStatus discriminated union
 *
 * @see packages/opencode/src/session/status.ts
 * @see packages/sdk/js/src/v2/gen/types.gen.ts SessionStatus
 */
export interface ISessionStatus
{
	/** 狀態類型：idle=閒置、busy=忙碌、retry=重試等待中 / Status type */
	type: EnumSessionStatusType;
	/** 重試次數（僅 retry 狀態）/ Retry attempt count (retry only) */
	attempt?: number;
	/** 錯誤訊息（僅 retry 狀態）/ Error message (retry only) */
	message?: string;
	/** 下次重試的 timestamp（僅 retry 狀態）/ Next retry timestamp in ms (retry only) */
	next?: number;
}

/**
 * 取得所有 session 的狀態 map / Get all sessions' status map
 *
 * 封裝 client.session.status() API，提供型別安全的回傳值
 * Wraps client.session.status() API with type-safe return value
 *
 * 注意 / Note:
 * - idle session 會被 OpenCode 內部自動從 map 移除，只回傳 busy/retry
 * - Idle sessions are auto-removed from the internal map, only busy/retry returned
 * - directory 參數用於**路由**（多 workspace 場景），不影響回傳結果的過濾
 * - directory param is for **routing** (multi-workspace), not result filtering
 *
 * @param client - Plugin 提供的 OpenCode client / Plugin-provided OpenCode client
 * @param directory - 目標目錄（路由用，可選）/ Target directory (for routing, optional)
 * @returns sessionId → status 的映射（型別安全）/ sessionId → status map (type-safe)
 */
export async function getSessionStatuses(
	client: PluginInput["client"],
	directory?: string,
): Promise<Record<string, ISessionStatus>>
{
	const result = await client.session.status({
		query: {
			directory,
		},
	});

	if (result.error)
	{
		return {};
	}

	/**
	 * 將 SDK 回傳的資料轉換為 ISessionStatus map
	 * Convert SDK response data to ISessionStatus map
	 *
	 * 由於 SDK SessionStatus 型別定義不完全 match OpenCode 內部實作，
	 * 此處進行輕量轉換確保型別一致性
	 * Since SDK SessionStatus type may not fully match OpenCode internals,
	 * a lightweight conversion ensures type consistency
	 */
	const data = result.data as Record<string, ISessionStatus> | undefined;
	return data ?? {};
}

/**
 * 取得單一 session 的狀態（從 client 查詢）/ Get a single session's status (query from client)
 *
 * @param client - Plugin 提供的 OpenCode client / Plugin-provided OpenCode client
 * @param sessionId - 目標 session ID / Target session ID
 * @returns session 狀態，若不在 map 中則為 undefined（表示 idle）/ Session status, undefined if not in map (idle)
 */
export async function getSessionStatus(
	client: PluginInput["client"],
	sessionId: string,
): Promise<ISessionStatus | undefined>;

/**
 * 從已取得的 status map 中查詢單一 session / Query single session from pre-fetched status map
 *
 * @param statuses - getSessionStatuses() 的回傳值 / Return value of getSessionStatuses()
 * @param sessionId - 目標 session ID / Target session ID
 * @returns session 狀態，若不在 map 中則為 undefined（表示 idle）/ Session status, undefined if not in map (idle)
 */
export function getSessionStatus(
	statuses: Record<string, ISessionStatus>,
	sessionId: string,
): ISessionStatus | undefined;

/** 實作 / Implementation */
export function getSessionStatus(
	clientOrStatuses: PluginInput["client"] | Record<string, ISessionStatus>,
	sessionId: string,
): Promise<ISessionStatus | undefined> | ISessionStatus | undefined
{
	/**
	 * 區分 client 與 record 的型別守衛
	 * Type guard to discriminate client vs record
	 *
	 * OpencodeClient 的 session.status 是 function，而 Record 的值是 ISessionStatus（object）
	 * OpencodeClient.session.status is a function, while Record values are ISessionStatus (object)
	 */
	const candidate = clientOrStatuses as PluginInput["client"];
	if (typeof candidate.session?.status === "function")
	{
		return getSessionStatuses(candidate).then((statuses) => statuses[sessionId]);
	}

	return (clientOrStatuses as Record<string, ISessionStatus>)[sessionId];
}
