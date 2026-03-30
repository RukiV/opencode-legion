/**
 * 除錯控制模組
 * Debug control module
 *
 * 控制 consoleLogger 的開關和日誌級別，支援等級過濾與鏈式呼叫
 * Controls consoleLogger enable/disable and log level, supporting level filtering and chain calls
 *
 * 預設狀態：
 * - debug.enabled = false（預設關閉）
 * - debug.level = EnumLogLevel.Warn（預設 Warn 等級）
 *
 * @module debug-control
 * @see {@link https://github.com/...} for more details
 */

import { consoleLogger } from 'debug-color2/logger';
import { EnumLogLevel, type ILogLevel } from '../types/enum-opencode';
import type { IAriseConfig } from '../config/schema';

/**
 * 日誌級別優先級（數字越大越詳細）
 * Log level priority (higher number = more verbose)
 *
 * 等級順序：Error(0) < Warn(1) < Info(2) < Debug(3)
 *
 * 等級過濾邏輯：
 * - 當 currentLogLevel = Warn 時
 * - canLog(Error) = true  (0 <= 1)
 * - canLog(Warn)  = true  (1 <= 1)
 * - canLog(Info)  = false (2 > 1)
 * - canLog(Debug) = false (3 > 1)
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
 *
 * 預設值為 Warn，等級優先級為 1
 * 只允許輸出 Error 和 Warn 等級的日誌
 */
let currentLogLevel: ILogLevel = EnumLogLevel.Warn;

/**
 * 初始化除錯控制
 * Initialize debug control
 *
 * 根據配置設定 consoleLogger.enabled 和預設級別
 * 注意：日誌包裝已在模組載入時套用至 consoleLoggerWithLevel
 * Sets consoleLogger.enabled and default level based on config
 *
 * 預設啟用/關閉判定流程：
 * ```
 * config.debug?.enabled ?? false
 * ```
 * - 如果 config.debug 存在且 enabled 為 true → 啟用
 * - 如果 config.debug 存在但 enabled 為 false → 停用
 * - 如果 config.debug 不存在 → 停用（預設 false）
 *
 * @param config - Arise 配置物件，包含 debug 設定
 *
 * @example
 * import { initDebugControl, consoleLoggerWithLevel } from './debug-control';
 *
 * const config = { debug: { enabled: true, level: 'debug' } };
 * initDebugControl(config);
 *
 * // 使用 consoleLoggerWithLevel 輸出日誌（支援鏈式呼叫）
 * consoleLoggerWithLevel.yellow.log("Hello!");
 */
export function initDebugControl(config: IAriseConfig): void
{
	// 根據 debug.enabled 設定 consoleLogger（預設 false）
	// 預設關閉是因為生產環境不需要詳細除錯輸出
	// Default to false because production doesn't need verbose debug output
	consoleLogger.enabled = config.debug?.enabled ?? false;

	// 設定預設日誌級別（預設 Warn）
	// 如果 config.debug.level 存在則使用，否則使用 Warn
	if (config.debug?.level)
	{
		currentLogLevel = config.debug.level;
	}

	// wrapConsoleLogger 已在模組載入時套用於 consoleLoggerWithLevel
	// 如需直接使用，請 import { consoleLoggerWithLevel } from './debug-control'
	// wrapConsoleLogger is applied at module load time to consoleLoggerWithLevel
	// To use, import { consoleLoggerWithLevel } from './debug-control'
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
 * 取得目前除錯模式狀態
 * Get current debug mode status
 *
 * @returns 目前是否啟用除錯模式
 */
export function getDebugEnabled(): boolean
{
	return consoleLogger.enabled;
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
export function canLog(level: ILogLevel): boolean
{
	// 如果 consoleLogger 未啟用，則不輸出任何日誌
	// If consoleLogger is not enabled, don't output any logs
	if (!consoleLogger.enabled)
	{
		return false;
	}

	// 檢查當前日誌級別是否允許輸出
	// Check if current log level allows output
	return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * 取得除錯狀態資訊
 * Get debug status information
 *
 * @returns 除錯狀態物件
 */
export function getDebugStatus():
	{
		enabled: boolean;
		level: ILogLevel;
	}
{
	return {
		enabled: consoleLogger.enabled,
		level: currentLogLevel,
	};
}

/**
 * 重置除錯控制狀態（主要用於測試）
 * Reset debug control state (primarily for testing)
 *
 * 將 currentLogLevel 重置為預設值 Warn，並停用 consoleLogger
 * Resets currentLogLevel to default Warn and disables consoleLogger
 */
export function resetDebugControl(): void
{
	currentLogLevel = EnumLogLevel.Warn;
	consoleLogger.enabled = false;
}

// ==================== 日誌方法包裝 / Log Method Wrapping ====================

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

/**
 * 包裝 consoleLogger 的日誌方法，支援鏈式調用（如 consoleLogger.yellow.log）
 * Wrap consoleLogger log methods with level filtering, supporting chain calls (e.g., consoleLogger.yellow.log)
 *
 * ✅ 這是預設使用的包裝方式
 * ✨ 支援完整的鏈式呼叫語法
 *
 * @param target - 要包裝的 console 物件（可能是主 logger 或顏色分支）
 * @returns 包裝後的 proxy 物件
 *
 * @example
 * // 支援以下用法：
 * consoleLogger.log("msg");           // 基本日誌，Info 等級
 * consoleLogger.yellow.log("msg");    // 黃色日誌，Info 等級 ✅
 * consoleLogger.red.error("msg");     // 紅色錯誤，Error 等級 ✅
 * consoleLogger.green.debug("msg");   // 綠色除錯，Debug 等級 ✅
 */
function wrapConsoleLogger<T extends object>(target: T): T
{
	return new Proxy(target, {
		get(obj, prop, receiver)
		{
			const value = Reflect.get(obj, prop, receiver);

			// 如果是函數（方法），則包裝
			if (typeof value === "function")
			{
				// 檢查是否為已包裝過的方法（避免重複包裝）
				if ((value as unknown as { __wrapped?: boolean }).__wrapped)
				{
					return value;
				}

				// 檢查是否為日誌方法
				if (prop in LOG_METHOD_LEVELS)
				{
					return function (...args: unknown[]): void
					{
						const level = getMethodLogLevel(String(prop));
						if (canLog(level))
						{
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(value as (...args: unknown[]) => void).apply(obj, args);
						}
					};
				}

				// 其他方法直接返回（保持原樣，包括顏色方法如 .yellow）
				return value;
			}

			// 如果是物件（如顏色分支 .yellow），則遞迴包裝
			if (typeof value === "object" && value !== null)
			{
				return wrapConsoleLogger(value as object);
			}

			return value;
		},
	});
}

/**
 * 包裝後的 consoleLogger（支援鏈式調用和等級控制）
 * Wrapped consoleLogger (supports chain calls and level control)
 *
 * ✅ 這是推荐的匯出，預設使用 wrapConsoleLogger 包裝
 * ✨ 支援完整的鏈式呼叫語法
 *
 * 支援的用法：
 * - consoleLoggerWithLevel.log("msg") - 基本日誌，Info 等級
 * - consoleLoggerWithLevel.yellow.log("msg") - 黃色日誌，Info 等級
 * - consoleLoggerWithLevel.red.error("msg") - 紅色錯誤，Error 等級
 * - consoleLoggerWithLevel.green.debug("msg") - 綠色除錯，Debug 等級
 *
 * @example
 * import { consoleLoggerWithLevel, setLogLevel, setDebugEnabled } from './debug-control';
 *
 * setDebugEnabled(true);
 * setLogLevel(EnumLogLevel.Debug);
 * consoleLoggerWithLevel.yellow.log("Hello!");  // ✅ 輸出黃色文字
 * consoleLoggerWithLevel.green.debug("Debug info");  // ✅ 輸出綠色文字
 */
export const consoleLoggerWithLevel: typeof consoleLogger = wrapConsoleLogger(consoleLogger);