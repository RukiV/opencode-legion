/**
 * Bun Test BUG Reports - toMatchObject 與 expect.any()
 * Bun Test BUG Reports - toMatchObject with expect.any()
 *
 * @see docs/BUN_TEST_BUGS.md
 *
 * Related GitHub Issues:
 * - https://github.com/oven-sh/bun/issues/3521 (主要 issue - 包含 mutation bug)
 * - https://github.com/oven-sh/bun/issues/24551 (toMatchObject changes actual object state)
 * - https://github.com/oven-sh/bun/issues/21136
 * - https://github.com/oven-sh/bun/issues/21393
 * - https://github.com/oven-sh/bun/issues/20129
 *
 * Related Pull Requests:
 * - https://github.com/oven-sh/bun/pull/23011
 */

import { describe, expect, it } from "bun:test";
import { inspect } from "util";

/**
 * expect.any() 的內部類型
 * Internal type of expect.any()
 */
describe("expect.any() 的內部類型 / Internal type of expect.any()", () =>
{
	it("expect.any(String) 返回的不是 string / returns object not string", () =>
	{
		const matcher = expect.any(String);
		expect(typeof matcher).not.toBe("string");
		expect(typeof matcher).toBe("object");
	});

	it("expect.any() 是特殊的 matcher 對象 / is a special matcher object", () =>
	{
		const anyString = expect.any(String);
		const anyNumber = expect.any(Number);
		const anyObject = expect.any(Object);

		expect(typeof anyString).toBe("object");
		expect(typeof anyNumber).toBe("object");
		expect(typeof anyObject).toBe("object");

		expect(anyString).not.toBe(anyNumber);
		expect(anyString).not.toBe(anyObject);
	});
});

/**
 * Bug 2: `toMatchObject` 與 spread operator 和 `expect.any()` 的問題
 * Bug 2: `toMatchObject` fails with spread operator and `expect.any()`
 *
 * @see https://github.com/oven-sh/bun/issues/3521
 */
describe("Bug 2: toMatchObject 與 spread operator 和 expect.any() / toMatchObject fails with spread operator", () =>
{
	/**
	 * 正常情況（不使用 `...`）/ Working case (without spread operator)
	 *
	 * 直接內聯使用 expect.any() 時正常運作
	 * Works when using expect.any() inline
	 */
	it("直接內聯 expect.any() 時成功 / Works with inline expect.any()", () =>
	{
		const actual = {
			name: "test name",
			extra: "test extra",
		};

		const expected = {
			name: expect.any(String),
			extra: expect.any(String),
		};

		expect(actual).toMatchObject(expected);  // ✅ 成功 / Works
	});

	/**
	 * 當 matcher 被提取到變數時也能正常運作
	 * Works when matcher is extracted to variable
	 */
	it("matcher 變數 / Works with matcher variable", () =>
	{
		const matcher = expect.any(String);
		const actual = {
			name: "test",
			value: "hello",
		};

		expect(actual).toMatchObject({
			name: matcher,
			value: expect.any(String),
		});
	});

	/**
	 * [FIXME] Bug: 使用三元展開 `...` 時失敗 / Fails with ternary spread operator `...`
	 *
	 * 預期：應成功（expected 中的 expect.any() 應匹配 actual 中的具體值）
	 * Expected: Should succeed
	 *
	 * 實際：失敗（Bun BUG）
	 * Actual: Fails (Bun BUG)
	 */
	it("[FIXME] 三元展開 expect.any() 時失敗 / [FIXME] Fails with ternary spread expect.any()", () =>
	{
		const hasExtra = true;

		const actual = {
			name: "test name",
			extra: "test extra",
		};

		const expected = {
			name: "test",
			...(hasExtra ? { extra: expect.any(String) } : {}),
		};

		// 透過三元展開使用 expect.any() / Uses expect.any() through ternary spread
		expect(() =>
		{
			expect(actual).toMatchObject(expected);
		}).toThrowErrorMatchingSnapshot();  // ❌ 失敗 / Fails
	});

	/**
	 * actual 和 expected 都使用三元展開時（expected 是具體值）
	 * Both use ternary spread (expected with concrete value)
	 */
	it("actual 和 expected 都三元展開時成功 / Works when both use ternary spread", () =>
	{
		const hasExtra = true;

		const actual = {
			name: "test",
			...(hasExtra && { extra: "test extra" }),
		};

		const expected = {
			name: "test",
			...(hasExtra && { extra: expect.any(String) }),
		};

		expect(actual).toMatchObject(expected);  // ✅ 成功 / Works
	});

	/**
	 * ✅ Workaround: 從另一個物件賦值
	 * ✅ Workaround: Assign from another existing object
	 *
	 * 當 expect.any() 來自另一個已經存在的物件時，
	 * 使用 `expected.xxx = other.xxx` 直接賦值可以繞過 Bug
	 *
	 * When expect.any() comes from an existing object,
	 * using `expected.xxx = other.xxx` direct assignment bypasses the bug
	 */
	it("✅ expected.xxx = other.xxx / ✅ Works with assignment from existing object", () =>
	{
		const actual = {
			name: "test name",
			extra: "test extra",
		};

		// 從另一個已經存在的物件取得 expect.any()
		const other = { extra: expect.any(String) };

		// 直接賦值 / Direct assignment from existing object
		const expected = { name: expect.any(String) };
		(expected as any).extra = other.extra;

		expect(actual).toMatchObject(expected);  // ✅ 成功 / Works
	});

	/**
	 * ✅ Object.assign({}, other) 可以正常工作
	 * ✅ Object.assign({}, other) works correctly
	 *
	 * 與直接展開不同，Object.assign 可以繞過 Bug
	 * Unlike direct spread, Object.assign bypasses the bug
	 *
	 * @see docs/BUN_TEST_BUGS.md - Assignment Workaround
	 */
	it("✅ Object.assign({}, other) / ✅ Object.assign({}, other) works", () =>
	{
		const actual = {
			name: "test",
			extra: "data",
		};

		const other = { extra: expect.any(String) };
		const expected = Object.assign({ name: expect.any(String) }, other);

		expect(actual).toMatchObject(expected);  // ✅ 成功 / Works
	});

	/**
	 * [FIXME] 展開現有物件 `{ ...other }` 仍會失敗
	 * [FIXME] Spread from existing object `{ ...other }` still fails
	 *
	 * @see docs/BUN_TEST_BUGS.md - Assignment Workaround
	 */
	it("[FIXME] { ...other } / [FIXME] Spread { ...other } fails", () =>
	{
		const actual = {
			name: "test",
			extra: "data",
		};

		const other = { extra: expect.any(String) };
		const expected = { name: expect.any(String), ...other };

		// ❌ 失敗（匹配失敗但不拋出錯誤）
		expect(actual).toMatchObject(expected);
	});
});

/**
 * Bug 3: Object.freeze(actual) 無法解決 Bug
 * Bug 3: Object.freeze(actual) cannot fix the Bug
 *
 * @see docs/BUN_TEST_BUGS.md - Object.freeze Tests
 */
describe("Bug 3: Object.freeze 無法解決 Bug / Object.freeze cannot fix the Bug", () =>
{
	/**
	 * 正常情況：直接使用 actual
	 * Normal case: direct use of actual
	 */
	it("✅ 直接使用 actual / ✅ Direct use of actual", () =>
	{
		const actual = { name: "test", extra: "data" };
		const expected = {
			...(true ? { name: expect.any(String), extra: expect.any(String) } : {}),
		};

		expect(actual).toMatchObject(expected);  // ✅ 成功 / Works
	});

	/**
	 * [FIXME] Object.freeze(actual) 會導致失敗
	 * [FIXME] Object.freeze(actual) causes failure
	 *
	 * 預期：應成功（freeze 不應影響 toMatchObject 的匹配行為）
	 * Expected: Should succeed (freeze shouldn't affect toMatchObject matching)
	 *
	 * 實際：失敗（Bun BUG）- 匹配失敗但不拋出錯誤
	 * Actual: Fails (Bun BUG) - Match fails but no error thrown
	 */
	it("[FIXME] Object.freeze(actual) / [FIXME] Object.freeze(actual) fails", () =>
	{
		const actual = { name: "test", extra: "data" };
		const expected = {
			...(true ? { name: expect.any(String), extra: expect.any(String) } : {}),
		};

		// ❌ 失敗（匹配失敗但不拋出錯誤）
		expect(Object.freeze(actual)).toMatchObject(expected);
	});

	/**
	 * [FIXME] spread actual `{ ...actual }` 會導致失敗
	 * [FIXME] Spread actual `{ ...actual }` causes failure
	 *
	 * 結論：任何對 actual 的 transformation 都會觸發 Bug
	 * Conclusion: Any transformation of actual triggers the Bug
	 */
	it("[FIXME] { ...actual } / [FIXME] Spread { ...actual } fails", () =>
	{
		const actual = { name: "test", extra: "data" };
		const expected = {
			...(true ? { name: expect.any(String), extra: expect.any(String) } : {}),
		};

		// ❌ 失敗（匹配失敗但不拋出錯誤）
		expect({ ...actual }).toMatchObject(expected);
	});

	/**
	 * [FIXME] Object.freeze({ ...actual }) 也會失敗
	 * [FIXME] Object.freeze({ ...actual }) also fails
	 */
	it("[FIXME] Object.freeze({ ...actual }) / [FIXME] Object.freeze({ ...actual }) fails", () =>
	{
		const actual = { name: "test", extra: "data" };
		const expected = {
			...(true ? { name: expect.any(String), extra: expect.any(String) } : {}),
		};

		// ❌ 失敗（匹配失敗但不拋出錯誤）
		expect(Object.freeze({ ...actual })).toMatchObject(expected);
	});
});

/**
 * 其他 toMatchObject 測試
 * Other toMatchObject tests
 */
describe("其他測試 / Other tests", () =>
{
	/**
	 * 巢狀物件使用 expect.any()
	 * Nested object with expect.any()
	 */
	it("巢狀物件 / Nested object", () =>
	{
		expect({
			user: { name: "test", age: 25 },
			items: [1, 2, 3],
		}).toMatchObject({
			user: expect.objectContaining({
				name: expect.any(String),
				age: expect.any(Number),
			}),
		});
	});

	/**
	 * expect.any(String) 不接受 number
	 * expect.any(String) doesn't accept number
	 */
	it("expect.any(String) 不接受 number / doesn't accept number", () =>
	{
		expect(() =>
		{
			expect({ value: 123 }).toMatchObject({
				value: expect.any(String),
			});
		}).toThrow();
	});

	/**
	 * expect.any(Object) 接受陣列
	 * expect.any(Object) accepts array
	 */
	it("expect.any(Object) 接受陣列 / accepts array", () =>
	{
		expect({
			data: [1, 2, 3],
		}).toMatchObject({
			data: expect.any(Object),
		});
	});

	/**
	 * [FIXME] toMatchObject 會修改 actual 物件
	 * [FIXME] toMatchObject mutates the actual object
	 *
	 * Bun 的 toMatchObject 會修改傳入的 actual 物件！
	 * 將匹配到的屬性替換為空的 matcher 物件 {}
	 *
	 * Bun's toMatchObject mutates the actual object!
	 * Replaces matched properties with an empty matcher object {}
	 *
	 * @see https://github.com/oven-sh/bun/issues/3521 (主要 issue - 包含 mutation bug)
	 * @see https://github.com/oven-sh/bun/issues/24551 (toMatchObject changes actual object state)
	 */
	it("[FIXME] toMatchObject 會修改 actual / [FIXME] toMatchObject mutates actual", () =>
	{
		const obj = {
			foo: "foo",
			bar: "bar",
		};

		// 記錄 mutation 前的狀態 / Record state before mutation
		expect({
			label: "before",
			obj,
		}).toMatchSnapshot();

		// 第一次 toMatchObject 後，obj.bar 會被替換成 {}
		// After first toMatchObject, obj.bar is replaced with {}
		expect(obj).toMatchObject({
			bar: expect.any(String),
		});

		// 記錄 mutation 後的狀態 / Record state after mutation
		expect({
			label: "after",
			obj,
		}).toMatchSnapshot();

		// 驗證 obj.bar 已變成 matcher 物件
		// Verify obj.bar has become a matcher object
		expect(() => expect(obj.bar).toBeString()).toThrowErrorMatchingSnapshot();
		expect(() => expect(obj.bar).not.toBeObject()).toThrowErrorMatchingSnapshot();

		expect(() => {

			// 這就是為什麼第二次 toMatchObject 會失敗
		// This is why the second toMatchObject fails
		expect(obj).toMatchObject({
			bar: expect.any(String),
		});

		}).toThrowErrorMatchingSnapshot();


	});

	/**
	 * [FIXME] ⚠️ toMatchInlineSnapshot with bad string literal
	 * 會導致測試框架崩潰 / Crashes the test framework
	 *
	 * ⚠️ 重要提醒 / Important reminder:
	 *    請勿刪除被註釋的代碼 / Do NOT delete commented code
	 *    請勿註釋或刪除使 log 不執行 / Do NOT comment out or delete console.log statements
	 *
	 * toMatchInlineSnapshot 必須傳入字面量字串，無法使用 JSON.stringify()
	 * toMatchInlineSnapshot requires a string literal, cannot use JSON.stringify()
	 *
	 * ⚠️ 這個 BUG 與其他 BUG 不同：
	 *    - "toMatchObject with expect.any": 可以被正常捕捉，不會崩潰 ✅
	 *    - "toMatchInlineSnapshot with bad string literal": 會導致 ELIFECYCLE Test failed ⚠️
	 *
	 * ⚠️ This BUG is different from others:
	 *    - "toMatchObject with expect.any": Can be caught, doesn't crash ✅
	 *    - "toMatchInlineSnapshot with bad string literal": Causes ELIFECYCLE Test failed ⚠️
	 *
	 * 解決方案：必須使用 it.skip 避免執行，否則框架會崩潰
	 * Solution: Must use it.skip to avoid execution, otherwise the framework crashes
	 *
	 * 測試方法：逐步解除註解，找出 BUG 發生的位置
	 * Test method: Uncomment step by step to find where the BUG occurs
	 *
	 * ⚠️ 這個 BUG 最奇怪的一點：後續的 log 仍然會輸出！
	 * ⚠️ The strangest part of this BUG: Subsequent logs still print!
	 *
	 * 執行結果 / Execution result:
	 *   a-001 ~ a-005    ✓ (正常印出)
	 *   a-006, a-007     ✓ (正常印出，屬於 toMatchSnapshot)
	 *   [start] a-008    ✓ (正常印出)
	 *   ❌ BUG happen!   ← 錯誤發生 (expect with toMatchInlineSnapshot)
	 *   [end] a-009      ✓ (仍然印出！BUG 後的 log 仍然執行)
	 *   [start] a-010    ✓ (正常印出)
	 *   ❌ BUG happen!   ← 錯誤發生 (第一個 expect with toMatchInlineSnapshot)
	 *   a-011            ✓ (仍然印出)
	 *   ❌ BUG happen!   ← 錯誤發生 (第二個 expect with toMatchInlineSnapshot)
	 *   [end] a-012      ✓ (仍然印出！BUG 後的 log 仍然執行)
	 *   a-013, a-014     ✓ (正常印出)
	 *
	 * BUG 位置總結 / BUG locations summary:
	 *   BUG 1: [start] a-008 之後 → expect({...}).toMatchInlineSnapshot(JSON.stringify({...}))
	 *   BUG 2: [start] a-010 之後 → expect(`"..."`).toMatchInlineSnapshot(JSON.stringify({...}))
	 *   BUG 3: a-011 之後 → expect(() => { expect(`"..."`).toMatchInlineSnapshot(JSON.stringify({...})) }).not.toThrow()
	 *
	 * ⚠️ BUG 3 的特殊之處 / Special behavior of BUG 3:
	 *    不論是 `).not.toThrow();` or `).toThrow();` or
	 *    不管有沒有在 `expect(() => { ... })` 裡面都會發生 BUG！
	 *
	 *    Whether it's `).not.toThrow();` or `).toThrow();` or
	 *    whether it's inside `expect(() => { ... })` or not, the BUG will occur!
	 *
	 * 結論 / Conclusion:
	 *   1. BUG 發生在 toMatchInlineSnapshot 使用 JSON.stringify() 作為參數時
	 *   2. BUG 發生時，測試框架進入錯誤狀態
	 *   3. 但奇怪的是，後續的 console.log() 仍然會執行！
	 *   4. 這表明 BUG 不是發生在 JavaScript 執行層面，而是在測試框架更新 snapshot 的層面
	 *
	 *   1. BUG occurs when toMatchInlineSnapshot uses JSON.stringify() as argument
	 *   2. When BUG occurs, test framework enters error state
	 *   3. But surprisingly, subsequent console.log() still executes!
	 *   4. This suggests the BUG is not at JavaScript execution level, but at test framework's snapshot update level
	 *
	 * @see docs/BUN_TEST_BUGS.md - toMatchInlineSnapshot with bad string literal
	 */
	it.skip("[FIXME] ⚠️ toMatchInlineSnapshot with bad string literal / [FIXME] ⚠️ toMatchInlineSnapshot only accepts literals", () =>
	{
		const actual = { foo: "foo", bar: "bar" };

		const output = JSON.stringify({
			foo: "foo",
			bar: "bar",
		});
		console.dir(output);

		expect(output).toEqual(`{"foo":"foo","bar":"bar"}`);
		expect(output).toEqual('{"foo":"foo","bar":"bar"}');
		expect(output).toEqual("{\"foo\":\"foo\",\"bar\":\"bar\"}");

		console.log(`a-001`);

/*
		expect({
			label: "label-001",
			typeof: typeof output,
			output,
		}).toMatchSnapshot();
 */

		console.log(`a-002`);

/*
		expect(JSON.stringify({
			foo: "foo",
			bar: "bar",
		})).toMatchInlineSnapshot(`"{"foo":"foo","bar":"bar"}"`);
 */

		console.log(`a-003`);

/*
		expect(output).toMatchInlineSnapshot(`"{"foo":"foo","bar":"bar"}"`);
 */

		console.log(`a-004`);

/*
		expect(actual).toMatchInlineSnapshot(`
		  {
		    "bar": "bar",
		    "foo": "foo",
		  }
		`);
 */

		console.log(`a-005`);

/*
		expect(JSON.stringify({
			label: "label-002",
			actual,
		})).toMatchSnapshot(JSON.stringify({
			label: "label-002",
			actual: {
				foo: "foo",
				bar: "bar",
			},
		}));
 */

		console.log(`a-006`);

/*
		expect({
			label: "label-003-0",
			actual,
		}).toMatchSnapshot();
 */

		console.log(`a-007`);

/*
		expect({
			label: "label-003",
			actual,
		}).toMatchSnapshot();
 */

		console.log(`[start] a-008-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		expect({
			label: "label-004",
			actual: {
				foo: "foo",
				bar: "bar",
			},
		}).toMatchInlineSnapshot(JSON.stringify({
			label: "label-004",
			actual: {
				foo: "foo",
				bar: "bar",
			},
		}));
 */

		console.log(`[end] a-009-after-bug-happen-but-still-print`);

		// ✅ 這個正常 / This works
/*
		expect(JSON.stringify({
			foo: "foo",
			bar: "bar",
		})).toMatchInlineSnapshot(`"{"foo":"foo","bar":"bar"}"`);
 */

		console.log(`[start] a-010-next-code-will-bug`);

		// ❌ BUG 2: Argument must be a string literal

/*
		expect(`"{"foo":"foo","bar":"bar"}"`).toMatchInlineSnapshot(JSON.stringify({
			foo: "foo",
			bar: "bar",
		}));
*/

		console.log(`a-011-next-code-will-bug`);

		// ❌ BUG 3: Argument must be a string literal
		// ⚠️ 即使在 expect(() => { ... }).not.toThrow() 裡面也會發生 BUG！
		// ⚠️ Even when inside expect(() => { ... }).not.toThrow(), the BUG still occurs!

/*
		expect(() => {


		expect(`"{"foo":"foo","bar":"bar"}"`).toMatchInlineSnapshot(JSON.stringify({
			foo: "foo",
			bar: "bar",
		}));


		}).not.toThrow();
 */

		console.log(`[end] a-012-after-bug-happen-but-still-print`);

		// ✅ 這個正常 / This works

/*
		expect(JSON.stringify({
			foo: "foo",
			bar: "bar",
		})).toMatchInlineSnapshot(`"{"foo":"foo","bar":"bar"}"`);
 */

		console.log(`a-013`);

		// ✅ 這個正常 / This works

/*
		expect({
			label: "end",
			actual,
		}).toMatchSnapshot();
 */

		console.log(`a-014`);

		// ✅ 這個正常 / This works

/*
		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(`
		  {
		    "bar": "bar",
		    "foo": "foo",
		  }
		`);
 */

		console.log(`a-015`);

		// ✅ 這個正常 / This works

/*
		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(`
		  {
		    "bar": "bar",
		    "foo": "foo",
		  }
		`);
 */

		console.log(`a-016`);

/*
		expect(JSON.stringify({
			foo: "foo",
			bar: "bar",
		})).toMatchInlineSnapshot('"{"foo":"foo","bar":"bar"}"');
 */

		console.log(`a-017-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		let _s001 = `"{"foo":"foo","bar":"bar"}"`;

		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(_s001);
 */

		console.log(`a-018-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		let _s002 = `{"foo":"foo","bar":"bar"}`;

		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(_s002);
 */

		console.log(`a-019-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		let _s003 = `'{"foo":"foo","bar":"bar"}'`;

		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(_s003);
 */

		console.log(`a-020-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(`${JSON.stringify({
			foo: "foo",
			bar: "bar",
		})}`);
 */

		console.log(`a-021-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(`'${JSON.stringify({
			foo: "foo",
			bar: "bar",
		})}'`);
 */

		console.log(`a-022-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(`"${JSON.stringify({
			foo: "foo",
			bar: "bar",
		})}"`);
 */

		console.log(`a-023`);

		expect(() => {

			expect({
				label: "a-023-01",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot(true as any);

		}).toThrowErrorMatchingSnapshot();

		expect(() => {

			expect({
				label: "a-023-03",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot([] as any);

		}).toThrowErrorMatchingSnapshot();

		expect(() => {

			expect({
				label: "a-023-04",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot(void 0 as any);

		}).toThrowErrorMatchingSnapshot();

		expect(() => {

			expect({
				label: "a-023-04",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot(null as any);

		}).toThrowErrorMatchingSnapshot();

		console.log(`a-024-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		expect(() => {

			const expected = '';

			expect({
				label: "a-024",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot(expected);

		}).not.toThrowError();
 */

		console.log(`a-025-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		expect(() => {

			const expected = {};

			expect({
				label: "a-023-02",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot(expected as any, null as any);

		}).toThrow();
 */

		console.log(`a-026-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		expect(() => {

			const expected = {};

			expect({
				label: "a-023-02",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot(expected as any, void 0);

		}).toThrowErrorMatchingSnapshot();
 */

		console.log(`[catched] a-027-next-code-can-be-catch`);

		expect(() => {

			expect(() => {

				const expected = {};

				expect({
					label: "a-023-02",
					foo: "foo",
					bar: "bar",
				}).toMatchInlineSnapshot(expected as any, `
					{
					  "bar": "bar",
					  "foo": "foo",
					  "label": "a-023-02",
					}
				`);

			}).toThrow();

		}).toThrowErrorMatchingSnapshot();

		console.log(`<test:end>`);

	});
});
