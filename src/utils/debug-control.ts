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
 */

import { consoleLogger } from 'debug-color2/logger';
import { EnumLogLevel, type ILogLevel } from '../types/enum-opencode';
import type { IAriseConfig } from '../config/schema';
import { formatAriseMsg } from './string/arise-message';
import { Console2 } from 'debug-color2';
import { ITSExtractKeyof, ITSMemberMethods } from 'ts-type';
import { ICrossConsole } from 'debug-color2/lib/types/CrossConsole';

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
	/**
	 * 根據 debug.enabled 設定 consoleLogger（預設 false）
	 * 預設關閉是因為生產環境不需要詳細除錯輸出
	 * Default to false because production doesn't need verbose debug output
	 */
	consoleLogger.enabled = config.debug?.enabled ?? false;

	/**
	 * 設定預設日誌級別（預設 Warn）
	 * 如果 config.debug.level 存在則使用，否則使用 Warn
	 */
	if (config.debug?.level)
	{
		currentLogLevel = config.debug.level;
	}

	/**
	 * wrapConsoleLogger 已在模組載入時套用於 consoleLoggerWithLevel
	 * 如需直接使用，請 import { consoleLoggerWithLevel } from './debug-control'
	 * wrapConsoleLogger is applied at module load time to consoleLoggerWithLevel
	 * To use, import { consoleLoggerWithLevel } from './debug-control'
	 */
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
	/**
	 * 如果 consoleLogger 未啟用，則不輸出任何日誌
	 * If consoleLogger is not enabled, don't output any logs
	 */
	if (!consoleLogger.enabled)
	{
		return false;
	}

	/**
	 * 檢查當前日誌級別是否允許輸出
	 * Check if current log level allows output
	 */
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

/** ==================== 日誌方法包裝 / Log Method Wrapping ==================== */

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
function wrapConsoleLogger<T extends Console2>(target: T): T
{
	return new Proxy(target, {
		get(obj, prop, receiver)
		{
			const value = Reflect.get(obj, prop, receiver);

			/**
			 * 如果是函數（方法），則包裝
			 * If the value is a function, wrap it
			 */
			if (typeof value === "function")
			{
				/**
				 * 檢查是否為已包裝過的方法（避免重複包裝）
				 * Check if already wrapped to avoid double wrapping
				 */
				if ((value as unknown as { __wrapped?: boolean }).__wrapped)
				{
					return value;
				}

				/**
				 * 檢查是否為日誌方法
				 * Check if it's a log method
				 */
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

				/**
				 * 其他方法直接返回（保持原樣，包括顏色方法如 .yellow）
				 * Return other methods as-is (including color methods like .yellow)
				 */
				return value;
			}

			/**
			 * 如果是物件（如顏色分支 .yellow），則遞迴包裝
			 * If it's an object (e.g., color branch like .yellow), recursively wrap
			 */
			if (typeof value === "object" && value !== null)
			{
				return wrapConsoleLogger(value as any);
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
export const consoleLoggerWithLevel: Console2 = wrapConsoleLogger(consoleLogger);

type IMethods2 = Exclude<ITSExtractKeyof<ITSMemberMethods<ICrossConsole>, string>, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>;

type IConsoleLogFunction = ICrossConsole[IMethods2] & {
	blue?: never
};

export function logArise<T extends IConsoleLogFunction>(consoleLog: T, ...argv: Parameters<T>)
{
	if (typeof argv[0] === 'string')
	{
		argv[0] = formatAriseMsg(argv[0]);
	}

	/** @ts-ignore */
	consoleLog(...argv);
}

/**
 * 格式化並輸出 Arise 訊息（陣列參數版本）
 * Format and output Arise message (array parameter version)
 *
 * 與 logArise 的差異：
 * - logArise 使用展開參數 (...argv)
 * - logArise2 使用陣列參數 (argv)
 *
 * Difference from logArise:
 * - logArise uses spread parameters (...argv)
 * - logArise2 uses array parameter (argv)
 *
 * @param consoleLog - console 日誌函式 / Console log function
 * @param argv - 參數陣列 / Parameter array
 *
 * @example
 * // 基本用法：格式化 Arise 訊息
 * logArise2(console.log, ["Hello World"]);
 * logArise2(console.yellow.log, ["Hello World"]);
 *
 * // 多參數用法
 * logArise2(console.warn, ["Warning:", "disk space low"]);
 *
 * // 非字串首參數（不格式化）
 * logArise2(console.log, [123, "data"]);
 */
export function logArise2<T extends IConsoleLogFunction>(consoleLog: T, argv: Parameters<T>)
{
	if (typeof argv[0] === 'string')
	{
		argv[0] = formatAriseMsg(argv[0]);
	}

	/** @ts-ignore */
	consoleLog(...argv);
}

export interface ILogArise2Options
{
	/** console 物件，預設為 consoleLoggerWithLevel / Console object, default is consoleLoggerWithLevel */
	consoleLog?: Console2;
	/** 強制輸出，無視 logLevel 限制 / Force output, ignore logLevel limit */
	force?: boolean;

	/**
	 * 日誌等級 / Log level
	 *
	 * @internal
	 */
	level?: ILogLevel;
	/**
	 * 是否輸出 / Whether to output
	 *
	 * @internal
	 */
	doLog?: boolean;

	/**
	 * 方法名稱 / Method name
	 *
	 * @internal
	 */
	methodName?: IMethods2;
}

function _logArise2OptionsCore(methodName: IMethods2 | ILogArise2Options,
	opts?: ILogArise2Options,
): Required<ILogArise2Options>
{
	if (typeof methodName === 'object')
	{
		([opts, methodName] = [methodName ?? {}, void 0 as any]);
	}

	let { consoleLog, force, methodName: _methodName } = (opts ??= {} as ILogArise2Options);

	methodName ??= (_methodName as IMethods2);

	if (typeof methodName !== 'string' || !methodName.length)
	{
		throw new Error('methodName must be a non-empty string');
	}

	let doLog: boolean;
	const level = getMethodLogLevel(methodName);

	if (force)
	{
		consoleLog ??= consoleLogger;
		doLog = true;
	}
	else
	{
		consoleLog ??= consoleLoggerWithLevel;
		doLog = canLog(level);
	}

	return {
		...opts,
		consoleLog,
		doLog,
		level,
		force,
		methodName,
	} satisfies ILogArise2Options as any;
}

/**
 * 依日誌等級條件輸出 Arise 訊息 / Output Arise message with log level condition
 *
 * 此函式會先檢查日誌等級是否允許輸出，通過時才執行 fn() 取得參數並格式化輸出
 * This function first checks if the log level allows output, then executes fn() to get parameters and format output
 *
 * 延遲執行優勢 / Lazy execution advantage:
 * - fn() 僅在 canLog 通過時才執行，避免不必要的字串拼接或計算
 * - 適用於昂貴的日誌訊息建構（如 JSON.stringify 大型物件）
 *
 * @param methodName - console 方法名稱（如 'log', 'error', 'debug'）
 * @param fn - 回傳參數陣列的函式（延遲執行）
 * @param opts - 選項物件
 * @param opts.consoleLog - console 物件，預設為 consoleLoggerWithLevel
 * @param opts.force - 強制輸出，無視 logLevel 限制
 *
 * @example
 * import { logArise2WithLevel, setDebugEnabled, setLogLevel } from './debug-control';
 *
 * setDebugEnabled(true);
 * setLogLevel(EnumLogLevel.Debug);
 *
 * // 基本用法
 * logArise2WithLevel('log', () => ["Server started on port 3000"]);
 *
 * // 錯誤等級
 * logArise2WithLevel('error', () => ["Connection failed:", error.message]);
 *
 * // 除錯等級（僅在 Debug 等級時輸出）
 * logArise2WithLevel('debug', () => ["User data:", JSON.stringify(user)]);
 *
 * // 延遲執行範例
 * logArise2WithLevel('debug', () => {
 *   const expensiveData = computeExpensiveDebugInfo(); // 僅在 Debug 等級時執行
 *   return ["Debug info:", expensiveData];
 * });
 *
 * // 使用自訂 console 物件
 * logArise2WithLevel('log', () => ["Custom output"], { consoleLog: consoleLoggerWithLevel.blue });
 *
 * // 強制輸出
 * logArise2WithLevel('debug', () => ["Always output this"], { force: true });
 *
 * // 組合使用
 * logArise2WithLevel('debug', () => ["Output with custom console and force"], { consoleLog: consoleLoggerWithLevel.blue, force: true });
 */
export function logArise2WithLevel<M extends IMethods2>(
	methodName: M,
	fn: () => Parameters<Console2[M]>,
	opts?: ILogArise2Options,
): void
{

	const { consoleLog, doLog, level, force } = _logArise2OptionsCore(methodName, opts);

	/**
	 * force 模式下無視 logLevel，直接使用原始 consoleLogger 輸出
	 * In force mode, ignore logLevel and use original consoleLogger directly
	 */
	if (force)
	{
		const args = fn();
		/**
		 * 使用未被包裝的原始 consoleLogger，繞過等級過濾
		 * Use unwrapped original consoleLogger to bypass level filtering
		 */
		/** @ts-ignore */
		consoleLogger[methodName](...args);
		return;
	}

	if (doLog)
	{
		const args = fn();
		logArise2(consoleLog[methodName], args);
	}
}

/**
 * 多行版本的 logArise2WithLevel
 * Multi-line version of logArise2WithLevel
 *
 * 自動將多個字串參數連接成一行輸出，適用於需要輸出多個欄位的場景
 * Automatically joins multiple string parameters into a single line output, suitable for scenarios that need to output multiple fields
 *
 * @param methodName - console 方法名稱（如 'log', 'error', 'debug'）
 * @param lines - 回傳多行字串陣列的函式（延遲執行）
 * @param opts - 選項物件
 * @param opts.consoleLog - console 物件，預設為 consoleLoggerWithLevel
 * @param opts.force - 強制輸出，無視 logLevel 限制
 *
 * @example
 * import { logArise2WithLevelMulti } from './debug-control';
 *
 * // 基本用法 - 自動連接多行
 * logArise2WithLevelMulti('info', () => [
 *   `Shadow: ${shadow}`,
 *   `Model: ${model}`,
 *   `Description: ${desc}`
 * ], { force: true });
 *
 * // 輸出: [Arise] Shadow: beru | Model: openai/gpt-4o | Description: Search files
 */
export function logArise2WithLevelMulti<M extends IMethods2>(
	methodName: M,
	lines: () => string[],
	opts?: ILogArise2Options,
): void
{
	/**
	 * 使用 any 類型繞過 TypeScript 推導限制
	 * Use any type to bypass TypeScript inference limitation
	 *
	 * 由於 logArise2WithLevel 使用 M extends IMethods2 進行推導
	 * 直接傳入字串陣列會導致類型不相容
	 */
	logArise2WithLevel(methodName, () =>
	{
		/**
		 * 將多行字串連接成一行
		 * Join multiple lines into a single line
		 *
		 * 使用 "\n" 作為分隔符號，方便閱讀
		 * Use "\n" as separator for better readability
		 */
		const combinedMessage = lines().join('\n');
		return [combinedMessage] as any
	}, opts);
}
