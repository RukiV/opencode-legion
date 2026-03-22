/**
 * 靜態使用 expect.any() 測試
 * Static expect.any() usage tests
 *
 * @see docs/BUN_TEST_BUGS.md
 */

import { describe, expect, it } from "bun:test";

/**
 * Bug 2: toMatchObject 與 spread operator 和 expect.any()
 * Bug 2: toMatchObject with spread operator and expect.any()
 *
 * @see https://github.com/oven-sh/bun/issues/3521
 */
describe("靜態 expect.any() 配合 toMatchObject / Static expect.any() with toMatchObject", () =>
{
	/**
	 * 直接使用 expect.any() 作為期望值
	 * Direct use of expect.any() as expected value
	 */
	it("直接內聯 / Inline", () =>
	{
		const actual = {
			name: "test",
			value: "hello",
		};

		expect(actual).toMatchObject({
			name: expect.any(String),
			value: expect.any(String),
		});
	});

	/**
	 * 使用 as const 定義 base
	 * Use as const to define base
	 */
	it("as const base", () =>
	{
		const base = {
			name: expect.any(String),
			value: expect.any(String),
		} as const;

		const actual = {
			name: "Hello",
			value: "World",
			extra: "ignored",
		};

		expect(actual).toMatchObject(base);
	});

	/**
	 * 巢狀物件使用 expect.any()
	 * Nested object with expect.any()
	 */
	it("巢狀物件 / Nested object", () =>
	{
		expect({
			user: {
				name: "test",
				age: 25,
			},
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
	 * expect.any(Number) 不接受 string
	 * expect.any(Number) doesn't accept string
	 */
	it("expect.any(Number) 不接受 string / doesn't accept string", () =>
	{
		expect(() =>
		{
			expect({ value: "not a number" }).toMatchObject({
				value: expect.any(Number),
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
	 * expect.any(Array) 不接受普通物件
	 * expect.any(Array) doesn't accept plain object
	 */
	it("expect.any(Array) 不接受普通物件 / doesn't accept plain object", () =>
	{
		expect(() =>
		{
			expect({ items: { foo: "bar" } }).toMatchObject({
				items: expect.any(Array),
			});
		}).toThrow();
	});
});
