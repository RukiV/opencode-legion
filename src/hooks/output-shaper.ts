import type { IAriseConfig } from "../config/schema";
import { formatAriseMsgInfo } from "../utils/string/arise-message";

/** 預設最大輸出字元數 / Default max output characters */
const DEFAULT_MAX_CHARS = 12000;
/** 頭部保留比例（70%）/ Head preservation ratio (70%) */
const HEAD_RATIO = 0.7;
/** 尾部保留比例（20%）/ Tail preservation ratio (20%) */
const TAIL_RATIO = 0.2;

/**
 * 建立輸出格式化 Hook
 * Create output shaping hook
 *
 * 攔截工具輸出，根據配置進行截斷或保留
 * Intercepts tool outputs, truncates or preserves based on configuration
 *
 * @param config - Arise 配置物件
 * @returns 輸出格式化 Hook 物件
 */
export function createOutputShaperHook(config: IAriseConfig)
{
	/** 從配置取得最大字元數 / Get max chars from config */
	const maxChars = config.output_shaping?.max_chars ?? DEFAULT_MAX_CHARS;
	/** 是否保留錯誤輸出 / Whether to preserve error outputs */
	const preserveErrors = config.output_shaping?.preserve_errors ?? true;
	/** 頭部保留字元數（70%）/ Head preservation chars (70%) */
	const headChars = Math.floor(maxChars * HEAD_RATIO);
	/** 尾部保留字元數（20%）/ Tail preservation chars (20%) */
	const tailChars = Math.floor(maxChars * TAIL_RATIO);

	return {
		/**
		 * 格式化工具輸出
		 * Shape tool output
		 *
		 * 根據長度和錯誤狀態決定是否截斷輸出
		 * Decides whether to truncate output based on length and error status
		 *
		 * @param toolName - 工具名稱
		 * @param output - 原始輸出
		 * @param metadata - 額外元數據（如 exitCode）
		 * @returns 格式化後的輸出
		 */
		async shapeOutput(
			toolName: string,
			output: string,
			metadata?: Record<string, unknown>,
		): Promise<string>
		{
			if (typeof output !== "string") return output;
			if (output.length <= maxChars) return output;

			/**
			 * 錯誤保留邏輯
			 * Error preservation logic
			 *
			 * 如果啟用錯誤保留，檢查是否應該保留完整輸出
			 * If error preservation is enabled, check if full output should be preserved
			 */
			if (preserveErrors)
			{
				/**
				 * 檢查 exit code 是否表示錯誤
				 * Check if exit code indicates an error
				 *
				 * 支援多种 exit code 欄位名稱
				 * Supports multiple exit code field names
				 */
				const exitCode = metadata?.exitCode ?? metadata?.code ?? metadata?.status;
				if (typeof exitCode === "number" && exitCode !== 0)
				{
					/** 非零 exit code 表示錯誤，保留完整輸出 / Non-zero exit code means error, preserve full output */
					return output;
				}

				/**
				 * 檢查輸出是否包含錯誤模式
				 * Check if output contains error patterns
				 *
				 * 這確保即使 exit code 為 0，也能保留錯誤訊息
				 * This ensures error messages are preserved even when exit code is 0
				 */
				/**
				 * 錯誤模式偵測列表
				 * Error pattern detection list
				 *
				 * 用途：在截斷輸出前，先檢查是否包含錯誤關鍵字
				 * Purpose: Before truncating, check if output contains error keywords
				 *
				 * @patternMap
				 *   error:/exception:/failed: - 通用錯誤關鍵字
				 *   traceback/stack trace - 堆疊追蹤格式
				 *   ENOENT/EACCES - 系統錯誤碼
				 *   TypeError/ReferenceError/SyntaxError - JS 執行期錯誤
				 */
				const errorPatterns = [
					/error:/i,
					/exception:/i,
					/failed:/i,
					/traceback/i,
					/stack trace/i,
					/ENOENT/,
					/EACCES/,
					/TypeError/,
					/ReferenceError/,
					/SyntaxError/,
				];

				if (errorPatterns.some((p) => p.test(output)))
				{
					/**
					 * 發現錯誤模式時，放寬截斷限制
					 * When error pattern found, relax truncation limit
					 *
					 * 允許最多 2x maxChars 的錯誤輸出（以便看到完整錯誤）
					 * Allow up to 2x maxChars of error output (to see full error)
					 */
					if (output.length <= maxChars * 2) return output;
				}
			}

			/**
			 * 執行截斷
			 * Perform truncation
			 *
			 * 保留頭部 70% + 尾部 20%，中間部分被移除
			 * Preserves head 70% + tail 20%, middle part is removed
			 */
			const head = output.slice(0, headChars);
			const tail = output.slice(-tailChars);
			/** 被移除的字元數 / Number of characters removed */
			const truncatedChars = output.length - headChars - tailChars;

			return `${head}

${formatAriseMsgInfo(`Output truncated (${output.length.toLocaleString()} chars, ${truncatedChars.toLocaleString()} removed).
Use a more specific query or read a targeted file section if needed.`)}

${tail}`;
		},
	};
}

