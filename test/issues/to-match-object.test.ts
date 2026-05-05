/**
 * Bun toMatchObject 功能測試
 * Bun toMatchObject functionality tests
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
describe("toMatchObject 功能測試 / toMatchObject functionality", () =>
{
	describe("基本類型 / Basic types", () =>
	{
		it("string", () =>
		{
			expect({ name: "test" }).toMatchObject({ name: "test" });
		});

		it("number", () =>
		{
			expect({ count: 42 }).toMatchObject({ count: 42 });
		});

		it("boolean", () =>
		{
			expect({ active: true }).toMatchObject({ active: true });
		});
	});

	describe("巢狀物件 / Nested objects", () =>
	{
		it("巢狀 / Nested", () =>
		{
			expect({ user: { name: "John", age: 30 } }).toMatchObject({
				user: { name: "John" },
			});
		});

		it("深層巢狀 / Deep nested", () =>
		{
			expect({ a: { b: { c: { d: 1 } } } }).toMatchObject({
				a: { b: { c: { d: 1 } } },
			});
		});
	});

	describe("expect.any() / expect.any()", () =>
	{
		it("expect.any(String)", () =>
		{
			expect({ name: "anything" }).toMatchObject({
				name: expect.any(String),
			});
		});

		it("expect.any(Number)", () =>
		{
			expect({ count: 123 }).toMatchObject({
				count: expect.any(Number),
			});
		});

		it("expect.any(Object)", () =>
		{
			expect({ data: { foo: "bar" } }).toMatchObject({
				data: expect.any(Object),
			});
		});

		it("expect.any(Array)", () =>
		{
			expect({ items: [1, 2, 3] }).toMatchObject({
				items: expect.any(Array),
			});
		});

		it("混合使用 / Mixed", () =>
		{
			expect({ name: "test", count: 42, active: true }).toMatchObject({
				name: expect.any(String),
				count: expect.any(Number),
				active: expect.any(Boolean),
			});
		});

		it("expect.any() 與額外屬性 / with extra properties", () =>
		{
			expect({ name: "John", age: 30, extra: "ignored" }).toMatchObject({
				name: "John",
				age: expect.any(Number),
			});
		});
	});

	describe("expect.anything() / expect.anything()", () =>
	{
		it("expect.anything() 不為 null/undefined / not null/undefined", () =>
		{
			expect({ value: 0 }).toMatchObject({ value: expect.anything() });
			expect({ value: "" }).toMatchObject({ value: expect.anything() });
			expect({ value: false }).toMatchObject({ value: expect.anything() });
		});
	});

	describe("expect.arrayContaining() / expect.arrayContaining()", () =>
	{
		it("部分陣列匹配 / Partial array match", () =>
		{
			expect({ tags: ["a", "b", "c"] }).toMatchObject({
				tags: expect.arrayContaining(["a", "b"]),
			});
		});

		it("空陣列 / Empty array", () =>
		{
			expect({ tags: [] }).toMatchObject({
				tags: expect.arrayContaining([]),
			});
		});
	});

	describe("expect.objectContaining() / expect.objectContaining()", () =>
	{
		it("部分物件匹配 / Partial object match", () =>
		{
			expect({ a: 1, b: 2, c: 3 }).toMatchObject(
				expect.objectContaining({ a: 1, b: 2 }),
			);
		});
	});

	describe("展開運算子 / Spread operator", () =>
	{
		it("物件展開 / Object spread", () =>
		{
			const base = { a: 1, b: 2 };
			expect({ ...base, c: 3 }).toMatchObject({
				...base,
				c: 3,
			});
		});

		it("動態展開物件 / Dynamic spread", () =>
		{
			const hasExtra = true;
			expect({ a: 1, b: 2, ...(hasExtra && { c: 3 }) }).toMatchObject({
				a: 1,
				b: 2,
				...(hasExtra && { c: 3 }),
			});
		});

		it("三元展開 / Ternary spread", () =>
		{
			const condition = true;
			expect({ a: 1, b: 2 }).toMatchObject({
				a: 1,
				...(condition ? { b: 2 } : {}),
			});
		});
	});

	describe("陣列 / Arrays", () =>
	{
		it("陣列相等 / Array equality", () =>
		{
			expect([1, 2, 3]).toMatchObject([1, 2, 3]);
		});

		/**
		 * Bun 對陣列是嚴格匹配（不像 Jest 部分匹配）
		 * Bun requires strict array matching (unlike Jest partial matching)
		 */
		it("Bun 對陣列是嚴格匹配 / Bun requires strict array match", () =>
		{
			expect([{ id: 1 }, { id: 2 }]).not.toMatchObject([{ id: 1 }]);
		});
	});

	describe("錯誤情況 / Error cases", () =>
	{
		it("屬性不匹配應失敗 / Should fail on property mismatch", () =>
		{
			expect(() =>
			{
				expect({ name: "test" }).toMatchObject({ name: "wrong" });
			}).toThrow();
		});

		it("缺少屬性應失敗 / Should fail on missing property", () =>
		{
			expect(() =>
			{
				expect({ name: "test" }).toMatchObject({
					name: "test",
					missing: 1,
				});
			}).toThrow();
		});
	});
});
