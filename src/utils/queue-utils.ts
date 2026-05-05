/**
 * 佇列與集合處理工具函式集合
 * Queue and set processing utility functions
 *
 * 提供背景任務管理、重複處理預防等工具
 * Provides utilities for background task management, duplicate processing prevention, etc.
 *
 * 參考來源 / Reference:
 * - https://github.com/code-yeongyu/oh-my-openagent
 */

/* ============ 類型定義 / Type Definitions ============ */

/**
 * 處理中項目集合
 * Processing items set
 */
export interface IProcessingSet
{
	/** 檢查項目是否正在處理中 / Check if item is being processed */
	has(item: string): boolean;

	/** 添加項目到處理中集合 / Add item to processing set */
	add(item: string): void;

	/** 從處理中集合移除項目 / Remove item from processing set */
	delete(item: string): void;

	/** 清空處理中集合 / Clear processing set */
	clear(): void;

	/** 獲取處理中項目數量 / Get number of processing items */
	size: number;
}

/**
 * 回調函式註冊器
 * Callback registrar
 */
export interface ICallbackRegistrar<T extends (...args: unknown[]) => void>
{
	/** 註冊回調函式 / Register callback function */
	register(callback: T): void;

	/** 執行所有註冊的回調 / Execute all registered callbacks */
	execute(...args: Parameters<T>): void;

	/** 清除所有回調 / Clear all callbacks */
	clear(): void;
}

/**
 * 防抖配置介面
 * Debounce configuration interface
 */
export interface IDebounceOptions
{
	/** 延遲時間（毫秒）/ Delay time in milliseconds */
	delay: number;
	/** 是否在領先邊緣執行 / Execute on leading edge */
	leading?: boolean;
	/** 是否在尾隨邊緣執行 / Execute on trailing edge */
	trailing?: boolean;
}

/**
 * 節流配置介面
 * Throttle configuration interface
 */
export interface IThrottleOptions
{
	/** 節流時間間隔（毫秒）/ Throttle interval in milliseconds */
	interval: number;
	/** 是否在領先邊緣執行 / Execute on leading edge */
	leading?: boolean;
}

/* ============ 處理中集合管理 / Processing Set Management ============ */

/**
 * 建立處理中項目集合
 * Create processing items set
 *
 * 用於追蹤目前正在處理的項目 ID，防止重複處理
 * Used to track currently processing item IDs to prevent duplicate processing
 *
 * @returns 處理中項目集合 / Processing items set
 *
 * @example
 * ```typescript
 * const processing = createProcessingSet();
 *
 * if (!processing.has("task-123")) {
 *   processing.add("task-123");
 *   try {
 *     await processTask("task-123");
 *   } finally {
 *     processing.delete("task-123");
 *   }
 * }
 * ```
 */
export function createProcessingSet(): IProcessingSet
{
	const set = new Set<string>();

	return {
		has(item: string): boolean
		{
			return set.has(item);
		},
		add(item: string): void
		{
			set.add(item);
		},
		delete(item: string): void
		{
			set.delete(item);
		},
		clear(): void
		{
			set.clear();
		},
		get size(): number
		{
			return set.size;
		},
	};
}

/**
 * 使用處理中集合包裝非同步函式
 * Wrap async function with processing set
 *
 * 確保同一 ID 的任務不會被重複執行
 * Ensures tasks with the same ID are not executed repeatedly
 *
 * @param fn - 要包裝的非同步函式 / Async function to wrap
 * @returns 包裝後的函式 / Wrapped function
 *
 * @example
 * ```typescript
 * const recoverTask = async (id: string, data: unknown) => { ... };
 * const safeRecover = withProcessingGuard(recoverTask);
 *
 * // 即使同時調用多次，也只會執行一次
 * safeRecover("task-123", data);
 * safeRecover("task-123", data); // 被忽略
 * ```
 */
export function withProcessingGuard<T extends (id: string, ...args: unknown[]) => Promise<unknown>>(
	fn: T,
): (id: string, ...args: Parameters<T> extends [string, ...infer R] ? R : never[]) => Promise<ReturnType<T> | null>
{
	const processing = createProcessingSet();

	return async (id: string, ...args: unknown[]): Promise<ReturnType<T> | null> =>
	{
		if (processing.has(id))
		{
			return null;
		}

		processing.add(id);

		try
		{
			return await fn(id, ...args) as ReturnType<T>;
		}
		finally
		{
			processing.delete(id);
		}
	};
}

/* ============ 回調管理 / Callback Management ============ */

/**
 * 建立回調註冊器
 * Create callback registrar
 *
 * 管理一組回調函式，提供註冊、執行、清除功能
 * Manages a set of callback functions with register, execute, and clear functionality
 *
 * @returns 回調註冊器 / Callback registrar
 *
 * @example
 * ```typescript
 * const onComplete = createCallbackRegistrar<(sessionId: string) => void>();
 *
 * onComplete.register((id) => console.log("Completed:", id));
 * onComplete.register((id) => console.log("Cleanup:", id));
 *
 * // 執行所有回調
 * onComplete.execute("session-123");
 * // Output: "Completed: session-123"
 * // Output: "Cleanup: session-123"
 * ```
 */
export function createCallbackRegistrar<T extends (...args: unknown[]) => void>(): ICallbackRegistrar<T>
{
	const callbacks: T[] = [];

	return {
		register(callback: T): void
		{
			callbacks.push(callback);
		},
		execute(...args: Parameters<T>): void
		{
			callbacks.forEach((cb) =>
			{
				try
				{
					cb(...args);
				}
				catch
				{
					// 忽略回調執行錯誤 / Ignore callback execution errors
				}
			});
		},
		clear(): void
		{
			callbacks.length = 0;
		},
	};
}

/**
 * 建立一次性回調
 * Create one-time callback
 *
 * 回調只會被執行一次，之後會自動清除
 * Callback will only execute once and then automatically clear
 *
 * @param callback - 原始回調函式 / Original callback function
 * @returns 包裝後的一次性回調 / Wrapped one-time callback
 */
export function once<T extends (...args: unknown[]) => void>(callback: T): T
{
	let executed = false;

	return ((...args: Parameters<T>) =>
	{
		if (executed) return;
		executed = true;
		callback(...args);
	}) as T;
}

/* ============ 防抖與節流 / Debounce and Throttle ============ */

/**
 * 建立防抖函式
 * Create debounced function
 *
 * 延遲執行函式，直到指定的延遲時間內沒有新的調用
 * Delays function execution until no new calls within the specified delay
 *
 * @param fn - 要防抖的函式 / Function to debounce
 * @param options - 防抖配置 / Debounce configuration
 * @returns 防抖後的函式 / Debounced function
 *
 * @example
 * ```typescript
 * const search = debounce((query: string) => {
 *   console.log("Searching:", query);
 * }, { delay: 300 });
 *
 * search("a");
 * search("ab");  // 重置計時器
 * search("abc"); // 重置計時器
 * // 300ms 後才會執行: "Searching: abc"
 * ```
 */
export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	options: IDebounceOptions,
): (...args: Parameters<T>) => void
{
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Parameters<T> | null = null;

	const { delay, leading = false, trailing = true } = options;

	return (...args: Parameters<T>) =>
	{
		lastArgs = args;

		const shouldCallLeading = leading && !timeoutId;

		if (timeoutId)
		{
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() =>
		{
			if (trailing && lastArgs)
			{
				fn(...lastArgs);
			}
			timeoutId = null;
			lastArgs = null;
		}, delay);

		if (shouldCallLeading)
		{
			fn(...args);
		}
	};
}

/**
 * 建立節流函式
 * Create throttled function
 *
 * 限制函式在指定時間間隔內只執行一次
 * Limits function execution to once per specified time interval
 *
 * @param fn - 要節流的函式 / Function to throttle
 * @param options - 節流配置 / Throttle configuration
 * @returns 節流後的函式 / Throttled function
 *
 * @example
 * ```typescript
 * const log = throttle((msg: string) => {
 *   console.log("Log:", msg);
 * }, { interval: 1000 });
 *
 * log("1"); // 立即執行
 * log("2"); // 被忽略
 * log("3"); // 被忽略
 * // 1000ms 後才能再次執行
 * ```
 */
export function throttle<T extends (...args: unknown[]) => void>(
	fn: T,
	options: IThrottleOptions,
): (...args: Parameters<T>) => void
{
	let lastTime = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const { interval, leading = true } = options;

	return (...args: Parameters<T>) =>
	{
		const now = Date.now();

		if (leading && now - lastTime >= interval)
		{
			lastTime = now;
			fn(...args);
		}
		else if (!timeoutId)
		{
			timeoutId = setTimeout(() =>
			{
				lastTime = Date.now();
				timeoutId = null;
				fn(...args);
			}, interval - (now - lastTime));
		}
	};
}

/* ============ 延遲與重試 / Delay and Retry ============ */

/**
 * 延遲指定時間
 * Delay for specified time
 *
 * @param ms - 延遲毫秒數 / Delay in milliseconds
 * @returns Promise，延遲後解析 / Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await delay(1000); // 等待 1 秒
 * console.log("1 second passed");
 * ```
 */
export function delay(ms: number): Promise<void>
{
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 帶指數退避的重試
 * Retry with exponential backoff
 *
 * 失敗時自動重試，每次重試間隔時間成指數增長
 * Automatically retries on failure with exponentially increasing intervals
 *
 * @param fn - 要執行的函式 / Function to execute
 * @param options - 重試配置 / Retry configuration
 * @returns 執行結果 / Execution result
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetchData(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: {
		/** 最大重試次數 / Maximum retry count */
		maxRetries: number;
		/** 基礎延遲（毫秒）/ Base delay in milliseconds */
		baseDelay: number;
		/** 最大延遲（毫秒）/ Maximum delay in milliseconds */
		maxDelay?: number;
		/** 重試前的回調 / Callback before retry */
		onRetry?: (attempt: number, error: unknown) => void;
	},
): Promise<T>
{
	const { maxRetries, baseDelay, maxDelay = 30000, onRetry } = options;

	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++)
	{
		try
		{
			return await fn();
		}
		catch (error)
		{
			lastError = error;

			if (attempt >= maxRetries)
			{
				throw lastError;
			}

			/**
			 * 指數退避計算
			 * Exponential backoff calculation
			 */
			const delayMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

			if (onRetry)
			{
				onRetry(attempt + 1, error);
			}

			await delay(delayMs);
		}
	}

	throw lastError;
}

/* ============ 佇列處理 / Queue Processing ============ */

/**
 * 序列執行 Promise 陣列
 * Execute promises sequentially
 *
 * 依序執行非同步函式，避免並行執行
 * Executes async functions sequentially, avoiding parallel execution
 *
 * @param items - 要處理的項目 / Items to process
 * @param fn - 處理函式 / Processing function
 * @returns 結果陣列 / Results array
 *
 * @example
 * ```typescript
 * const urls = ["url1", "url2", "url3"];
 * const results = await sequential(urls, async (url) => {
 *   return await fetch(url);
 * });
 * ```
 */
export async function sequential<T, R>(
	items: T[],
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]>
{
	const results: R[] = [];

	for (let i = 0; i < items.length; i++)
	{
		results.push(await fn(items[i], i));
	}

	return results;
}

/**
 * 並行執行 Promise 陣列（限制並行數）
 * Execute promises in parallel with concurrency limit
 *
 * 控制同時執行的非同步函式數量
 * Controls the number of async functions executed simultaneously
 *
 * @param items - 要處理的項目 / Items to process
 * @param fn - 處理函式 / Processing function
 * @param concurrency - 最大並行數 / Maximum concurrency
 * @returns 結果陣列 / Results array
 *
 * @example
 * ```typescript
 * const urls = ["url1", "url2", "url3", "url4"];
 * const results = await parallelLimit(urls, async (url) => {
 *   return await fetch(url);
 * }, 2); // 最多同時執行 2 個
 * ```
 */
export async function parallelLimit<T, R>(
	items: T[],
	fn: (item: T, index: number) => Promise<R>,
	concurrency: number,
): Promise<R[]>
{
	const results: R[] = new Array(items.length);
	const executing: Promise<void>[] = [];
	const itemPromises: Promise<void>[] = [];

	for (let i = 0; i < items.length; i++)
	{
		const itemIndex = i;
		const promise = fn(items[i], i).then((result) =>
		{
			results[itemIndex] = result;
		});

		executing.push(promise);
		itemPromises.push(promise);

		if (executing.length >= concurrency)
		{
			const completedPromise = await Promise.race(
				executing.map((p, idx) => p.then(() => idx)),
			);
			executing.splice(completedPromise, 1);
		}
	}

	await Promise.all(itemPromises);
	return results;
}
