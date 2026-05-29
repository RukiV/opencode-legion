import { CONTINUATION_PATTERN, HIGH_LOAD_PATTERN, PERMANENT_ERROR_PATTERN, STEP_LIMIT_REACHED_PATTERN, STEP_LIMIT_REMAINING_PATTERN } from "../../types/regexp";

/**
 * 截取字串結尾 / Extract string tail
 *
 * 若字串長度超過 maxLength，只取最後 maxLength 個字元
 * If string length exceeds maxLength, return only the last maxLength characters
 *
 * 用於避免對過長回應進行全文掃描
 * Used to avoid full-text scanning of overly long responses
 *
 * @param str - 輸入字串 / Input string
 * @param maxLength - 最大長度（預設 300）/ Maximum length (default 300)
 * @returns 截取後的字串 / Truncated string
 */
export function tailOf(str: string | undefined | null, maxLength: number = 300): string
{
	if (!str?.length) return '';
	return str.length > maxLength ? str.slice(-maxLength) : str;
}

/**
 * 偵測錯誤訊息是否為高負載類型
 * Detect if error message indicates high load
 *
 * @param error - 錯誤訊息 / Error message
 * @returns 是否匹配高負載模式 / Whether it matches high load pattern
 */

export function isHighLoadError(error: string | undefined | null): boolean
{
	if (!error) return false;
	return HIGH_LOAD_PATTERN.test(error);
}

/**
 * 偵測錯誤訊息是否為永久性錯誤（無法透過重試解決）
 * Detect if error message is a permanent error (cannot be resolved by retrying)
 *
 * 永久性錯誤如語法錯誤、認證失敗、資源不存在等，重試無意義
 * Permanent errors like syntax errors, auth failures, not found — retrying is pointless
 *
 * @param error - 錯誤訊息 / Error message
 * @returns 是否為永久性錯誤 / Whether it's a permanent error
 */
export function isPermanentError(error: string | undefined | null): boolean
{
	if (!error) return false;
	return PERMANENT_ERROR_PATTERN.test(error);
}

/**
 * 偵測 agent 回應是否包含「需要繼續嗎？」提示
 * Detect if agent response contains "should I continue?" prompt
 *
 * 只檢查最後一段 assistant 回應（由 pollTaskCompletion 的 extractResult 截取），
 * 不掃描完整訊息歷史，也不檢查子代理訊息
 * Only checks the last assistant response (extracted by pollTaskCompletion's extractResult),
 * does not scan full message history or child agent messages
 *
 * @param result - extractResult 截取的最後 assistant 文字 / Last assistant text from extractResult
 * @returns 是否匹配繼續提示 / Whether it matches continuation prompt
 */
export function isContinuationPrompt(result: string | undefined | null): boolean
{
	if (!result) return false;

	/** 只檢查結尾（避免全文掃描誤判）/ Only check tail (avoid full-text false positives) */
	const tail = tailOf(result, 300);

	return CONTINUATION_PATTERN.test(tail);
}

/**
 * 偵測 agent 回應是否因達到步驟限制而被系統截斷
 * Detect if agent response was cut off by the system due to step limit
 *
 * 雙條件位置感知檢查 / Two-condition position-aware check:
 * 1. 截斷訊號：系統宣告「已達最大步驟」等 /
 *    Cutoff signal: system announces "Maximum Steps Reached" etc.
 * 2. 剩餘提示：列出「剩餘未完成工作」等 — 必須在截斷訊號之後 /
 *    Remaining indication: lists "Remaining unfinished work" etc. — MUST appear after cutoff signal
 *
 * ⚠️ 兩個條件必須同時滿足，且剩餘提示必須在截斷訊號之後
 * ⚠️ BOTH conditions must be met, AND remaining must come AFTER cutoff
 *
 * 只檢查結尾 500 字
 * Only checks the last 500 characters
 *
 * @param result - extractResult 截取的最後 assistant 文字
 * @returns 是否為步驟截斷（兩個條件都滿足，且順序正確）
 */
export function isStepLimitCutoff(result: string | undefined | null): boolean
{
	if (!result) return false;

	/** 只檢查結尾（步驟截斷訊息在回應末尾）/ Only check tail (step cutoff at response end) */
	const tail = tailOf(result, 500);

	/**
	 * 條件 A：找出截斷宣告的位置
	 * Condition A: find cutoff announcement position
	 *
	 * 使用 exec() 取得 match.index，而非 test()，以便定位
	 * Use exec() to get match.index instead of test() for position tracking
	 */
	const cutoffMatch = STEP_LIMIT_REACHED_PATTERN.exec(tail);
	if (!cutoffMatch)
	{
		return false;
	}

	/**
	 * 條件 B：剩餘提示必須在截斷宣告之後
	 * Condition B: remaining must appear after cutoff
	 *
	 * 只檢查截斷位置之後的子字串
	 * Only check the substring after the cutoff position
	 */
	const afterCutoff = tail.slice(cutoffMatch.index);

	if (!STEP_LIMIT_REMAINING_PATTERN.test(afterCutoff))
	{
		return false;
	}

	return true;
}
