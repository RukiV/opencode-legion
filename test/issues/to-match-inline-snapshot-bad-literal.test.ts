/**
 * Bun Test BUG Reports - toMatchInlineSnapshot with bad string literal
 * Bun Test BUG Reports - toMatchInlineSnapshot with bad string literal
 *
 * @see docs/BUN_TEST_BUGS.md
 *
 * Related GitHub Issues:
 * - https://github.com/oven-sh/bun/issues/3521
 * - https://github.com/oven-sh/bun/issues/24551
 */

import { describe, expect, it } from "bun:test";

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
describe("toMatchInlineSnapshot with bad string literal", () =>
{
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
		const _s003 = `"{"foo":"foo","bar":"bar"}"`;

		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(_s003);
*/

		console.log(`a-020-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		const _s004 = `{"foo":"foo","bar":"bar"}`;

		expect({
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(_s004);
*/

		console.log(`a-021`);

		expect({
			label: "a-021",
			foo: "foo",
			bar: "bar",
		}).toMatchSnapshot();

		console.log(`a-022-next-code-will-bug`);

		// ❌ BUG: Argument must be a string literal

/*
		expect({
			label: "a-022",
			foo: "foo",
			bar: "bar",
		}).toMatchInlineSnapshot(JSON.stringify({
			label: "a-022",
			foo: "foo",
			bar: "bar",
		}));
*/

		expect(() => {

			expect({
				label: "a-023-01",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot(`
				{
				  "bar": "bar",
				  "foo": "foo",
				  "label": "a-023-01",
				}
			`);

		}).toThrowErrorMatchingSnapshot();

		expect(() => {

			expect({
				label: "a-023-02",
				foo: "foo",
				bar: "bar",
			}).toMatchInlineSnapshot({} as any);

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
