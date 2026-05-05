/** @noUnusedParameters:false */
/// <reference types="bun" />
/// <reference types="bun-types" />
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
	createProcessingSet,
	withProcessingGuard,
	createCallbackRegistrar,
	once,
	debounce,
	throttle,
	delay,
	retryWithBackoff,
	sequential,
	parallelLimit,
	type IProcessingSet,
	type ICallbackRegistrar,
} from "./queue-utils";

describe("Queue Utils", () =>
{
	describe("createProcessingSet", () =>
	{
		let processing: IProcessingSet;

		beforeEach(() =>
		{
			processing = createProcessingSet();
		});

		it("應該能夠添加和檢查項目 / should be able to add and check items", () =>
		{
			expect(processing.has("item-1")).toBe(false);

			processing.add("item-1");

			expect(processing.has("item-1")).toBe(true);
			expect(processing.size).toBe(1);
		});

		it("應該能夠刪除項目 / should be able to delete items", () =>
		{
			processing.add("item-1");
			processing.add("item-2");

			processing.delete("item-1");

			expect(processing.has("item-1")).toBe(false);
			expect(processing.has("item-2")).toBe(true);
			expect(processing.size).toBe(1);
		});

		it("應該能夠清空集合 / should be able to clear set", () =>
		{
			processing.add("item-1");
			processing.add("item-2");
			processing.add("item-3");

			processing.clear();

			expect(processing.size).toBe(0);
			expect(processing.has("item-1")).toBe(false);
		});

		it("刪除不存在的項目不應該出錯 / deleting non-existent item should not error", () =>
		{
			expect(() => processing.delete("non-existent")).not.toThrow();
		});
	});

	describe("withProcessingGuard", () =>
	{
		it("應該只執行一次相同 ID 的任務 / should only execute task with same ID once", async () =>
		{
			let callCount = 0;
			const task = async (id: string, data: string) =>
			{
				callCount++;
				await delay(50);
				return { id, data, count: callCount };
			};

			const safeTask = withProcessingGuard(task);

			const result1 = safeTask("task-1", "data-1");
			const result2 = safeTask("task-1", "data-2"); // 應該被忽略
			const result3 = safeTask("task-1", "data-3"); // 應該被忽略

			const [r1, r2, r3] = await Promise.all([result1, result2, result3]);

			expect(callCount).toBe(1);
			expect(r1).toMatchObject({ id: "task-1", data: "data-1", count: 1 });
			expect(r2).toBeNull();
			expect(r3).toBeNull();
		});

		it("不同 ID 的任務應該可以並行執行 / different ID tasks should be able to execute in parallel", async () =>
		{
			let callCount = 0;
			const task = async (id: string) =>
			{
				callCount++;
				await delay(50);
				return id;
			};

			const safeTask = withProcessingGuard(task);

			const result1 = safeTask("task-1");
			const result2 = safeTask("task-2");

			const [r1, r2] = await Promise.all([result1, result2]);

			expect(callCount).toBe(2);
			expect(r1).toBe("task-1");
			expect(r2).toBe("task-2");
		});

		it("任務完成後應該允許重新執行 / should allow re-execution after task completes", async () =>
		{
			let callCount = 0;
			const task = async (id: string) =>
			{
				callCount++;
				return callCount;
			};

			const safeTask = withProcessingGuard(task);

			await safeTask("task-1");
			const result = await safeTask("task-1");

			expect(callCount).toBe(2);
			expect(result).toBe(2);
		});

		it("任務失敗時應該移除處理中標記 / should remove processing flag when task fails", async () =>
		{
			let shouldFail = true;
			const task = async (id: string) =>
			{
				if (shouldFail)
				{
					shouldFail = false;
					throw new Error("Task failed");
				}
				return "success";
			};

			const safeTask = withProcessingGuard(task);

			try
			{
				await safeTask("task-1");
			}
			catch
			{
				// 忽略錯誤
			}

			// 第一次失敗後應該能夠再次執行
			const result = await safeTask("task-1");
			expect(result).toBe("success");
		});
	});

	describe("createCallbackRegistrar", () =>
	{
		let registrar: ICallbackRegistrar<(msg: string) => void>;

		beforeEach(() =>
		{
			registrar = createCallbackRegistrar<(msg: string) => void>();
		});

		it("應該註冊和執行回調 / should register and execute callbacks", () =>
		{
			const messages: string[] = [];

			registrar.register((msg) => messages.push(`cb1: ${msg}`));
			registrar.register((msg) => messages.push(`cb2: ${msg}`));

			registrar.execute("test");

			expect(messages).toEqual(["cb1: test", "cb2: test"]);
		});

		it("應該能夠清除所有回調 / should clear all callbacks", () =>
		{
			let called = false;

			registrar.register(() =>
			{
				called = true;
			});

			registrar.clear();
			registrar.execute("test");

			expect(called).toBe(false);
		});

		it("執行時的錯誤不應該影響其他回調 / errors in execution should not affect other callbacks", () =>
		{
			const messages: string[] = [];

			registrar.register(() =>
			{
				throw new Error("Error 1");
			});
			registrar.register((msg) => messages.push(`cb2: ${msg}`));

			// 不應該拋出錯誤
			expect(() => registrar.execute("test")).not.toThrow();
			expect(messages).toEqual(["cb2: test"]);
		});
	});

	describe("once", () =>
	{
		it("回調應該只執行一次 / callback should only execute once", () =>
		{
			let count = 0;
			const fn = () =>
			{
				count++;
			};

			const onceFn = once(fn);

			onceFn();
			onceFn();
			onceFn();

			expect(count).toBe(1);
		});

		it("應該正確傳遞參數 / should pass arguments correctly", () =>
		{
			const results: string[] = [];
			const fn = (a: string, b: string) =>
			{
				results.push(`${a}-${b}`);
			};

			const onceFn = once(fn);

			onceFn("hello", "world");
			onceFn("foo", "bar"); // 應該被忽略

			expect(results).toEqual(["hello-world"]);
		});
	});

	describe("debounce", () =>
	{
		it("應該延遲執行函式 / should delay function execution", async () =>
		{
			let count = 0;
			const fn = () =>
			{
				count++;
			};

			const debouncedFn = debounce(fn, { delay: 100 });

			debouncedFn();
			debouncedFn();
			debouncedFn();

			expect(count).toBe(0); // 還未執行

			await delay(150);

			expect(count).toBe(1); // 只執行了一次
		});

		it("應該使用最新的參數 / should use latest arguments", async () =>
		{
			const results: string[] = [];
			const fn = (msg: string) =>
			{
				results.push(msg);
			};

			const debouncedFn = debounce(fn, { delay: 50 });

			debouncedFn("first");
			debouncedFn("second");
			debouncedFn("third");

			await delay(100);

			expect(results).toEqual(["third"]);
		});

		it("領先邊緣執行應該在第一次調用時執行 / leading edge execution should execute on first call", async () =>
		{
			let count = 0;
			const fn = () =>
			{
				count++;
			};

			const debouncedFn = debounce(fn, { delay: 50, leading: true });

			debouncedFn();
			expect(count).toBe(1); // 立即執行

			debouncedFn();
			debouncedFn();
			expect(count).toBe(1); // 還未再次執行

			await delay(100);
			expect(count).toBe(2); // 尾隨執行
		});

		it("尾隨邊緣執行可以禁用 / trailing edge execution can be disabled", async () =>
		{
			let count = 0;
			const fn = () =>
			{
				count++;
			};

			const debouncedFn = debounce(fn, { delay: 50, leading: true, trailing: false });

			debouncedFn();
			debouncedFn();
			debouncedFn();

			expect(count).toBe(1);

			await delay(100);

			expect(count).toBe(1); // 沒有尾隨執行
		});
	});

	describe("throttle", () =>
	{
		it("應該限制函式執行頻率 / should limit function execution frequency", async () =>
		{
			let count = 0;
			const fn = () =>
			{
				count++;
			};

			const throttledFn = throttle(fn, { interval: 100 });

			throttledFn();
			throttledFn();
			throttledFn();

			expect(count).toBe(1); // 只執行一次

			await delay(150);

			throttledFn();
			expect(count).toBe(2);
		});

		it("禁用領先邊緣時應該延遲執行 / should delay execution when leading is disabled", async () =>
		{
			let count = 0;
			const fn = () =>
			{
				count++;
			};

			const throttledFn = throttle(fn, { interval: 100, leading: false });

			throttledFn();
			expect(count).toBe(0); // 沒有立即執行

			await delay(150);
			expect(count).toBe(1); // 延遲執行
		});
	});

	describe("delay", () =>
	{
		it("應該延遲指定的時間 / should delay for specified time", async () =>
		{
			const start = Date.now();

			await delay(50);

			const elapsed = Date.now() - start;
			expect(elapsed).toBeGreaterThanOrEqual(45); // 允許小誤差
		});
	});

	describe("retryWithBackoff", () =>
	{
		it("應該成功執行函式 / should execute function successfully", async () =>
		{
			let count = 0;
			const fn = async () =>
			{
				count++;
				return "success";
			};

			const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 10 });

			expect(result).toBe("success");
			expect(count).toBe(1);
		});

		it("應該在失敗時重試 / should retry on failure", async () =>
		{
			let count = 0;
			const fn = async () =>
			{
				count++;
				if (count < 3)
				{
					throw new Error("Failed");
				}
				return "success";
			};

			const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelay: 10 });

			expect(result).toBe("success");
			expect(count).toBe(3);
		});

		it("應該在達到最大重試次數時拋出錯誤 / should throw error when max retries reached", async () =>
		{
			let count = 0;
			const fn = async () =>
			{
				count++;
				throw new Error(`Failed ${count}`);
			};

			await expect(
				retryWithBackoff(fn, { maxRetries: 2, baseDelay: 10 }),
			).rejects.toThrow("Failed 3");

			expect(count).toBe(3);
		});

		it("應該調用 onRetry 回調 / should call onRetry callback", async () =>
		{
			const retries: number[] = [];
			let count = 0;

			const fn = async () =>
			{
				count++;
				if (count < 3)
				{
					throw new Error("Failed");
				}
				return "success";
			};

			await retryWithBackoff(fn, {
				maxRetries: 3,
				baseDelay: 10,
				onRetry: (attempt) =>
				{
					retries.push(attempt);
				},
			});

			expect(retries).toEqual([1, 2]);
		});

		it("應該遵從最大延遲限制 / should respect max delay", async () =>
		{
			let count = 0;
			const fn = async () =>
			{
				count++;
				throw new Error("Failed");
			};

			const start = Date.now();

			try
			{
				await retryWithBackoff(fn, {
					maxRetries: 3,
					baseDelay: 1000,
					maxDelay: 50,
				});
			}
			catch
			{
				// 忽略錯誤
			}

			const elapsed = Date.now() - start;
			// 如果沒有 maxDelay 限制，會等待很久
			expect(elapsed).toBeLessThanOrEqual(300);
		});
	});

	describe("sequential", () =>
	{
		it("應該依序執行非同步函式 / should execute async functions sequentially", async () =>
		{
			const delays = [30, 20, 10];
			const startTimes: number[] = [];
			const endTimes: number[] = [];

			const results = await sequential(delays, async (ms, i) =>
			{
				startTimes[i] = Date.now();
				await delay(ms);
				endTimes[i] = Date.now();
				return ms;
			});

			expect(results).toEqual([30, 20, 10]);

			// 驗證依序執行（後一個的開始時間應該在前一個結束之後）
			expect(startTimes[1]).toBeGreaterThanOrEqual(endTimes[0]);
			expect(startTimes[2]).toBeGreaterThanOrEqual(endTimes[1]);
		});

		it("應該處理空陣列 / should handle empty array", async () =>
		{
			const results = await sequential([], async (item) => item);

			expect(results).toEqual([]);
		});
	});

	describe("parallelLimit", () =>
	{
		it("應該限制並行數量 / should limit concurrent executions", async () =>
		{
			const items = [1, 2, 3, 4];
			let running = 0;
			let maxRunning = 0;

			const results = await parallelLimit(
				items,
				async () =>
				{
					running++;
					maxRunning = Math.max(maxRunning, running);
					await delay(50);
					running--;
					return running;
				},
				2,
			);

			expect(maxRunning).toBeLessThanOrEqual(2);
			expect(results).toHaveLength(4);
		});

		it("應該保持結果順序 / should maintain result order", async () =>
		{
			const items = ["a", "b", "c"];

			const results = await parallelLimit(
				items,
				async (item, i) =>
				{
					await delay((3 - i) * 10); // 不同的延遲
					return item;
				},
				2,
			);

			expect(results).toEqual(["a", "b", "c"]);
		});

		it("應該處理空陣列 / should handle empty array", async () =>
		{
			const results = await parallelLimit(
				[],
				async (item) => item,
				2,
			);

			expect(results).toEqual([]);
		});
	});
});
