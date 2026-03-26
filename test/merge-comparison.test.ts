/**
 * Deep Merge vs Config Merge Deep 比較測試
 * Comparison Tests for deepMerge vs configMergeDeep
 *
 * 驗證兩種合併函式的行為差異
 * Verifies behavioral differences between the two merge functions
 *
 * 注意：兩個函數的結果不一定完全相同，特別是在陣列處理上
 * Note: The two functions may not produce exactly the same results, especially in array handling
 */

// @noUnusedLocals:false
/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { deepMerge } from "../src/config/io";
import { configMergeDeep, _arrayMergeLeftTargetWins } from "../src/utils/config-merge";

describe("deepMerge vs configMergeDeep comparison", () => {

	describe("basic object merging", () => {
		it("both merge simple objects correctly", () => {
			const base = { a: 1, b: 2 };
			const override = { b: 3, c: 4 };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			// 期望值 / Expected values
			const expected = { a: 1, b: 3, c: 4 };

			expect({
				explain: "✅ 簡單物件合併：deepMerge(base, override) 與 configMergeDeep([base, override]) 產生相同結果\nSimple object merge: both functions produce the same result",
				tags: "basic, object-merge, same-result",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expected,
				resultConfigMerge: expected,
			});
		});

		it("both handle nested object merging", () => {
			const base = { nested: { a: 1, b: 2 } };
			const override = { nested: { b: 3, c: 4 } };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedNested = { nested: { a: 1, b: 3, c: 4 } };

			expect({
				explain: "✅ 巢狀物件合併：兩者都遞迴合併嵌套物件\nNested object merge: both recursively merge nested objects",
				tags: "nested, object-merge, recursive",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedNested,
				resultConfigMerge: expectedNested,
			});
		});
	});

	describe("array merging behavior", () => {
		it("deepMerge and configMergeDeep both replace arrays with source array", () => {
			const base = { items: [1, 2, 3] };
			const override = { items: [4, 5] };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedArray = { items: [4, 5] };

			expect({
				explain: "✅ 陣列處理相同 - 兩者都使用來源陣列\nArray handling same - both functions use source array",
				tags: "array, replace, same",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedArray,
				resultConfigMerge: expectedArray,
			});
		});

		it("configMergeDeep and deepMerge both use source array for merging", () => {
			const base = { items: [1, 2, 3] };
			const override = { items: [4, 5] };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedArray = { items: [4, 5] };

			expect({
				explain: "✅ 陣列處理相同 - 兩者都使用來源陣列（override）\nArray handling same - both functions use source array (override)",
				tags: "array, source, same",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedArray,
				resultConfigMerge: expectedArray,
			});
		});

		it("_arrayMergeLeftTargetWins returns target unchanged", () => {
			const target = [1, 2, 3];
			const source = [4, 5, 6];

			const result = _arrayMergeLeftTargetWins(target, source);

			const expectedResult = [1, 2, 3];

			expect({
				explain: "✅ _arrayMergeLeftTargetWins：回傳 target 不變（相同參考）\n_arrayMergeLeftTargetWins: returns target unchanged (same reference)",
				tags: "array, helper-function, unchanged",
				input: { target, source },
				result,
			}).toMatchSnapshot({
				result: expectedResult,
			});
		});
	});

	describe("multiple object merging", () => {
		it("deepMerge only handles two objects", () => {
			const a = { x: 1 };
			const b = { y: 2 };
			const c = { z: 3 };

			// deepMerge requires chaining for multiple objects
			const result1 = deepMerge(a, b);
			const result2 = deepMerge(result1, c);

			const resultDeepMerge = result2;
			const resultConfigMerge = configMergeDeep([a, b, c]);

			const expectedMulti = { x: 1, y: 2, z: 3 };

			expect({
				explain: "⚠️ 函式簽章差異 - deepMerge：需要鏈式呼叫處理多個物件\nFunction signature difference - deepMerge: requires chaining for multiple objects",
				tags: "signature, multiple-objects, chaining",
				input: { a, b, c },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedMulti,
				resultConfigMerge: expectedMulti,
			});
		});

		it("configMergeDeep handles multiple objects in one call", () => {
			const a = { x: 1 };
			const b = { y: 2 };
			const c = { z: 3 };

			const resultDeepMerge = deepMerge(deepMerge(a, b), c);
			const resultConfigMerge = configMergeDeep([a, b, c]);

			const expectedMulti = { x: 1, y: 2, z: 3 };

			expect({
				explain: "✅ 函式簽章差異 - configMergeDeep：一次呼叫處理多個物件\nFunction signature difference - configMergeDeep: handles multiple objects in one call",
				tags: "signature, multiple-objects, single-call",
				input: { a, b, c },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedMulti,
				resultConfigMerge: expectedMulti,
			});
		});

		it("configMergeDeep merges multiple with left-to-right precedence", () => {
			const defaults = { a: 1, b: 1, c: 1 };
			const user = { b: 2, c: 2 };
			const override = { c: 3 };

			const resultDeepMerge = deepMerge(deepMerge(defaults, user), override);
			const resultConfigMerge = configMergeDeep([override, user, defaults]);

			const expectedPrecedence = { a: 1, b: 2, c: 3 };

			expect({
				explain: "✅ 多物件優先順序：左側優先（override > user > defaults）\nMultiple objects precedence: leftmost wins (override > user > defaults)",
				tags: "precedence, left-to-right, priority",
				input: { defaults, user, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedPrecedence,
				resultConfigMerge: expectedPrecedence,
			});
		});
	});

	describe("null and special value handling", () => {
		it("deepMerge handles null in override", () => {
			const base = { value: "original" };
			const override = { value: null };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedNull = { value: null };

			expect({
				explain: "✅ null 處理：deepMerge 保留 override 中的 null\nNull handling: deepMerge preserves null in override",
				tags: "null, special-value, preserve",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedNull,
				resultConfigMerge: expectedNull,
			});
		});

		it("configMergeDeep [base, override] keeps leftmost null", () => {
			const base = { value: "original" };
			const override = { value: null };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedNull = { value: null };

			expect({
				explain: "✅ null 處理：configMergeDeep 保留左側（override）null\nNull handling: configMergeDeep keeps leftmost (override) null",
				tags: "null, special-value, left-wins",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedNull,
				resultConfigMerge: expectedNull,
			});
		});

		it("deepMerge treats null in base as non-object", () => {
			const base = { nested: null };
			const override = { nested: { a: 1 } };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedNested = { nested: { a: 1 } };

			expect({
				explain: "✅ base 中的 null：null 不被視為物件，因此被覆蓋\nNull in base: null is not treated as object, so it gets overwritten",
				tags: "null, nested, overwrite",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedNested,
				resultConfigMerge: expectedNested,
			});
		});
	});

	describe("edge cases", () => {
		it("deepMerge with empty objects", () => {
			const base = {};
			const override = { a: 1 };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedEmpty = { a: 1 };

			expect({
				explain: "✅ 空物件處理：override 值被保留\nEmpty object handling: override values are preserved",
				tags: "edge-case, empty-object",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedEmpty,
				resultConfigMerge: expectedEmpty,
			});
		});

		it("configMergeDeep with empty array", () => {
			const resultDeepMerge = deepMerge({}, {});
			const resultConfigMerge = configMergeDeep([]);

			const expectedEmptyObj = {};

			expect({
				explain: "⚠️ 空陣列處理：configMergeDeep([]) 回傳空物件（與 deepMerge({}, {}) 不同）\nEmpty array handling: configMergeDeep([]) returns empty object (different from deepMerge({}, {}))",
				tags: "edge-case, empty-array, difference",
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedEmptyObj,
				resultConfigMerge: expectedEmptyObj,
			});
		});

		it("configMergeDeep with single object", () => {
			const input = { a: 1, b: 2 };

			const resultDeepMerge = deepMerge({}, input);
			const resultConfigMerge = configMergeDeep([input]);

			const expectedSingle = { a: 1, b: 2 };

			expect({
				explain: "✅ 單一物件：configMergeDeep([input]) 回傳單一物件\nSingle object: configMergeDeep([input]) returns the single object",
				tags: "edge-case, single-object",
				input: { input },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedSingle,
				resultConfigMerge: expectedSingle,
			});
		});

		it("deepMerge does not mutate original objects", () => {
			const base = { a: 1, nested: { x: 1 } };
			const override = { b: 2 };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedMutate = { a: 1, b: 2, nested: { x: 1 } };

			expect({
				explain: "✅ 不可變性：deepMerge 不會修改原始物件\nImmutability: deepMerge does not mutate original objects",
				tags: "immutable, mutation, not-mutate",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedMutate,
				resultConfigMerge: expectedMutate,
			});
		});
	});

	describe("deep nested merging", () => {
		it("configMergeDeep left-priority differs from deepMerge at deep nesting", () => {
			const base = {
				level1: {
					level2: {
						level3: { a: 1, b: 2 }
					}
				}
			};
			const override = {
				level1: {
					level2: {
						level3: { b: 3, c: 4 }
					}
				}
			};

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([base, override]);

			const expectedDeepNested = {
				level1: {
					level2: {
						level3: { a: 1, b: 3, c: 4 }
					}
				}
			};

			expect({
				explain: "✅ 深層巢狀合併：兩者都在深層巢狀處遞迴合併\nDeep nested merge: both recursively merge at deep nesting",
				tags: "nested, deep, recursive",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedDeepNested,
				resultConfigMerge: expectedDeepNested,
			});
		});

		it("nested array behavior shows both functions use source array", () => {
		const base = {
			config: {
				items: ["a", "b"]
			}
		};
		const override = {
			config: {
				items: ["c"]
			}
		};

		const resultDeepMerge = deepMerge(base, override);
		const resultConfigMerge = configMergeDeep([base, override]);

		const expectedNestedArray = { config: { items: ["c"] } };

		expect({
			explain: "✅ 巢狀陣列行為相同 - 兩者都使用來源陣列\nNested array behavior same - both functions use source array",
			tags: "nested-array, array, same",
			input: { base, override },
			resultDeepMerge,
			resultConfigMerge,
		}).toMatchSnapshot({
			resultDeepMerge: expectedNestedArray,
			resultConfigMerge: expectedNestedArray,
		});
	});
	});

	describe("function signature differences", () => {
		it("deepMerge takes (base, override) while configMergeDeep takes array", () => {
			const obj1 = { a: 1 };
			const obj2 = { b: 2 };
			const obj3 = { c: 3 };

			// deepMerge signature: (base, override) - two objects
			const resultDeepMerge = deepMerge(deepMerge(obj1, obj2), obj3);

			// configMergeDeep signature: (objects[]) - array of objects
			const resultConfigMerge = configMergeDeep([obj1, obj2, obj3]);

			const expectedSignature = { a: 1, b: 2, c: 3 };

			expect({
				explain: "✅ 函式簽章差異總結：deepMerge(base, override) vs configMergeDeep([objects...])\nFunction signature summary: deepMerge(base, override) vs configMergeDeep([objects...])",
				tags: "signature, comparison, summary",
				input: { obj1, obj2, obj3 },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot({
				resultDeepMerge: expectedSignature,
				resultConfigMerge: expectedSignature,
			});
		});
	});
});