/**
 * 終止標記解析工具
 * Termination marker parsing utility
 *
 * 解析 Shadow Agent 回應中的終止標記，實現提前停止討論
 * Parse termination markers in Shadow Agent responses to enable early termination
 */

import { escapeRegExp } from "regexp-helper-core";
import {
	EnumCollaborateTermination,
	ALLOWED_COLLABORATE_TERMINATIONS,
} from "../../types/enums";

/**
 * 終止結果介面
 * Termination result interface
 */
export interface ITerminationResult
{
	/** 是否應該停止討論 / Whether discussion should stop */
	shouldStop: boolean;
	/** 終止類型 / Termination type */
	terminationType: EnumCollaborateTermination | null;
	/** 標記之前的內容 / Content before the marker */
	preMarkerContent: string;
	/** 標記之後的內容（可選）/ Content after the marker (optional) */
	postMarkerContent: string | null;
	/** 最終回應內容 / Final response content */
	finalResponse: string;
}

/**
 * 終止標記映射表（使用 escapeRegExp 處理特殊字元）
 * Termination marker mapping (special characters escaped via escapeRegExp)
 */
const TERMINATION_MARKER_MAP: Record<EnumCollaborateTermination, string> = {
	[EnumCollaborateTermination.STOP]: "[STOP]",
	[EnumCollaborateTermination.DEADLOCK]: "[DEADLOCK]",
	[EnumCollaborateTermination.ENOUGH]: "[ENOUGH]",
};

/**
 * 取得所有終止標記的正規表達式（使用 escapeRegExp 處理 [] 字元）
 * Get regex for all termination markers (escaping [] via escapeRegExp)
 */
const TERMINATION_REGEX = new RegExp(
	`(${ALLOWED_COLLABORATE_TERMINATIONS.map(m => escapeRegExp(TERMINATION_MARKER_MAP[m])).join("|")})`,
	"g",
);

/**
 * 檢查回應是否包含終止標記
 * Check if response contains termination marker
 *
 * @param response - Agent 回應內容 / Agent response content
 * @returns 終止結果 / Termination result
 *
 * @example
 * const result = checkTermination("我認為火鍋最好吃[STOP]");
 * // result.shouldStop = true
 * // result.terminationType = "STOP"
 * // result.finalResponse = "我認為火鍋最好吃"
 */
export function checkTermination(response: string): ITerminationResult
{
	// 快速路徑：沒有 [ 字符不可能有終止標記
	if (!response.includes("["))
	{
		return createNoTerminationResult(response);
	}

	// 搜尋終止標記
	const match = response.match(TERMINATION_REGEX);

	if (!match)
	{
		return createNoTerminationResult(response);
	}

	const foundMarker = match[1] as EnumCollaborateTermination;
	const markerStr = TERMINATION_MARKER_MAP[foundMarker];
	const markerIndex = response.indexOf(markerStr);

	// 分割內容
	const preMarkerContent = response.substring(0, markerIndex).trim();
	const postMarkerContent = response.substring(markerIndex + markerStr.length).trim();

	// 最終回應：優先使用標記前內容，若為空則使用標記後內容
	const finalResponse = preMarkerContent || postMarkerContent || preMarkerContent;

	return {
		shouldStop: true,
		terminationType: foundMarker,
		preMarkerContent,
		postMarkerContent: postMarkerContent || null,
		finalResponse,
	};
}

/**
 * 建立無終止的結果
 * Create no-termination result
 */
function createNoTerminationResult(response: string): ITerminationResult
{
	return {
		shouldStop: false,
		terminationType: null,
		preMarkerContent: response,
		postMarkerContent: null,
		finalResponse: response,
	};
}

/**
 * 檢查是否包含特定終止類型
 * Check if contains specific termination type
 */
export function hasTerminationType(
	response: string,
	type: EnumCollaborateTermination,
): boolean
{
	return response.includes(TERMINATION_MARKER_MAP[type]);
}
