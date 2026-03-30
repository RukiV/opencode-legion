/**
 * patchConsoleLogger 實作參考
 * patchConsoleLogger implementation reference
 *
 * ⚠️ 已棄用 - 此為歷史參考實作
 * ⚠️ Deprecated - This is a historical reference implementation
 *
 * 此函式使用 `as any` 來繞過 frozen 保護，直接修改 consoleLogger
 * This function uses `as any` to bypass frozen protection and directly modify consoleLogger
 *
 * 限制：
 * - 不支援鏈式呼叫（如 consoleLogger.yellow.log）
 * - 需要使用 `as any` 來繞過 TypeScript 類型檢查
 *
 * 限制說明：
 * - consoleLogger 物件是 frozen/sealed，無法直接替換方法
 * - 必須使用 `as any` 才能修改 frozen 物件的屬性
 * - 由於直接修改方法，鏈式呼叫（.yellow.log）無法正常工作
 *
 * @deprecated 建議使用 wrapConsoleLogger（支援鏈式呼叫）
 * @see test/impl/patch-console-logger-reference.test.ts
 *
 * 原始實作位置：src/utils/debug-control.ts
 */

import { consoleLogger } from "debug-color2/logger";
import { EnumLogLevel, type ILogLevel } from "../../../src/types/enum-opencode";

// ==================== 內部常數 / Internal Constants ====================

/**
 * 日誌級別優先級（數字越大越詳細）
 * Log level priority (higher number = more verbose)
 */
const LOG_LEVEL_PRIORITY: Record<ILogLevel, number> = {
	[EnumLogLevel.Error]: 0,
	[EnumLogLevel.Warn]: 1,
	[EnumLogLevel.Info]: 2,
	[EnumLogLevel.Debug]: 3,
};

/**
 * 當前日誌級別
 * Current log level
 */
let currentLogLevel: ILogLevel = EnumLogLevel.Warn;

/**
 * 日誌方法與等級的對應關係
 * Mapping of log methods to their default levels
 */
const LOG_METHOD_LEVELS: Record<string, ILogLevel> = {
	error: EnumLogLevel.Error,
	exception: EnumLogLevel.Error,
	fail: EnumLogLevel.Error,
	warn: EnumLogLevel.Warn,
	info: EnumLogLevel.Info,
	log: EnumLogLevel.Info,
	success: EnumLogLevel.Info,
	ok: EnumLogLevel.Info,
	debug: EnumLogLevel.Debug,
	dir: EnumLogLevel.Debug,
	trace: EnumLogLevel.Debug,
};

// ==================== 內部函式 / Internal Functions ====================

/**
 * 檢查是否可以輸出指定級別的日誌
 * Check if can output log of specified level
 *
 * @param level - 要檢查的日誌級別
 * @returns 是否可以輸出
 */
function canLog(level: ILogLevel): boolean
{
	// 如果 consoleLogger 未啟用，則不輸出任何日誌
	if (!consoleLogger.enabled)
	{
		return false;
	}

	// 檢查當前日誌級別是否允許輸出
	return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * 取得日誌方法對應的等級
 * Get log level for a console method
 *
 * @param methodName - console 方法名稱
 * @returns 對應的日誌等級，若未知則預設為 Info
 */
function getMethodLogLevel(methodName: string): ILogLevel
{
	return LOG_METHOD_LEVELS[methodName] ?? EnumLogLevel.Info;
}

// ==================== 棄用實作 / Deprecated Implementation ====================

/**
 * 已包裝的函式類型（帶有 __wrapped 標記）
 * Wrapped function type with __wrapped marker
 */
interface IWrappedFunction extends Function
{
	__wrapped?: boolean;
}

/**
 * 修補 consoleLogger 以支援等級控制（保留供參考）
 * Patch consoleLogger to support level control (kept for reference)
 *
 * ⚠️ 注意：此函式保留供參考，相容舊版使用方式
 * ⚠️ 預設使用 wrapConsoleLogger 版本（consoleLoggerWithLevel）
 *
 * 這會直接修改 consoleLogger，使其所有方法都支援等級過濾
 * This directly modifies consoleLogger so all its methods support level filtering
 *
 * @deprecated 建議使用 consoleLoggerWithLevel（wrapConsoleLogger 版本）
 * @see consoleLoggerWithLevel
 *
 * 支援的用法：
 * - consoleLogger.log("msg") - 基本日誌，Info 等級
 * - consoleLogger.red.error("msg") - 紅色錯誤，Error 等級
 *
 * 不支援的用法（❌）：
 * - consoleLogger.yellow.log("msg") - 黃色日誌（❌ 不支援鏈式呼叫）
 * - consoleLogger.green.debug("msg") - 綠色除錯（❌ 不支援鏈式呼叫）
 *
 * @example
 * import { consoleLogger, setLogLevel } from './debug-control';
 *
 * setLogLevel(EnumLogLevel.Debug);  // 設定為 Debug 等級
 * consoleLogger.log("info msg");     // 會輸出（Info 等級 >= Debug）
 * consoleLogger.debug("debug msg");  // 會輸出（Debug 等級 == Debug）
 *
 * setLogLevel(EnumLogLevel.Error);  // 設定為 Error 等級
 * consoleLogger.warn("warn msg");    // 不會輸出（Warn 等級 < Error）
 * consoleLogger.error("err msg");    // 會輸出（Error 等級 == Error）
 */
export function patchConsoleLogger(): void
{
	// 取得所有需要包裝的方法
	const methodsToWrap = Object.keys(LOG_METHOD_LEVELS);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const loggerAsAny = consoleLogger as any;

	for (const methodName of methodsToWrap)
	{
		const originalMethod = loggerAsAny[methodName] as IWrappedFunction;

		// 確保方法存在且尚未包裝
		if (typeof originalMethod === "function" && !originalMethod.__wrapped)
		{
			const level = getMethodLogLevel(methodName);

			// 用包裝後的方法替換原方法
			loggerAsAny[methodName] = function (...args: unknown[]): void
			{
				if (canLog(level))
				{
					originalMethod.apply(consoleLogger, args);
				}
			};

			// 標記為已包裝
			loggerAsAny[methodName].__wrapped = true;
		}
	}
}

/**
 * 設定日誌級別
 * Set log level
 *
 * @param level - 日誌級別
 */
export function setLogLevel(level: ILogLevel): void
{
	currentLogLevel = level;
}

/**
 * 設定除錯模式開關
 * Set debug mode enable/disable
 *
 * @param enabled - 是否啟用除錯模式
 */
export function setDebugEnabled(enabled: boolean): void
{
	consoleLogger.enabled = enabled;
}

/**
 * 取得目前日誌級別
 * Get current log level
 *
 * @returns 目前日誌級別
 */
export function getLogLevel(): ILogLevel
{
	return currentLogLevel;
}

/**
 * 檢查是否可以輸出指定級別的日誌
 * Check if can output log of specified level
 *
 * @param level - 要檢查的日誌級別
 * @returns 是否可以輸出
 */
export { canLog };

/**
 * 重置除錯控制狀態（主要用於測試）
 * Reset debug control state (primarily for testing)
 */
export function resetDebugControl(): void
{
	currentLogLevel = EnumLogLevel.Warn;
	consoleLogger.enabled = false;
}
