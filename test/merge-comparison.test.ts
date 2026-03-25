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
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "✅ 簡單物件合併：deepMerge(base, override) 與 configMergeDeep([override, base]) 產生相同結果\nSimple object merge: both functions produce the same result",
				tags: "basic, object-merge, same-result",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("both handle nested object merging", () => {
			const base = { nested: { a: 1, b: 2 } };
			const override = { nested: { b: 3, c: 4 } };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "✅ 巢狀物件合併：兩者都遞迴合併嵌套物件\nNested object merge: both recursively merge nested objects",
				tags: "nested, object-merge, recursive",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});
	});

	describe("array merging differences", () => {
		it("deepMerge replaces arrays entirely", () => {
			const base = { items: [1, 2, 3] };
			const override = { items: [4, 5] };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "⚠️ 陣列處理差異 - deepMerge：完全替換陣列\nArray handling difference - deepMerge: replaces entire array",
				tags: "array, replace, difference",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("configMergeDeep keeps first array (left wins)", () => {
			const base = { items: [1, 2, 3] };
			const override = { items: [4, 5] };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "⚠️ 陣列處理差異 - configMergeDeep：保留左側（override）陣列\nArray handling difference - configMergeDeep: keeps left (override) array",
				tags: "array, left-wins, difference",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("_arrayMergeLeftTargetWins returns target unchanged", () => {
			const target = [1, 2, 3];
			const source = [4, 5, 6];

			const result = _arrayMergeLeftTargetWins(target, source);

			expect({
				explain: "✅ _arrayMergeLeftTargetWins：回傳 target 不變（相同參考）\n_arrayMergeLeftTargetWins: returns target unchanged (same reference)",
				tags: "array, helper-function, unchanged",
				input: { target, source },
				result,
			}).toMatchSnapshot();
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

			expect({
				explain: "⚠️ 函式簽章差異 - deepMerge：需要鏈式呼叫處理多個物件\nFunction signature difference - deepMerge: requires chaining for multiple objects",
				tags: "signature, multiple-objects, chaining",
				input: { a, b, c },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("configMergeDeep handles multiple objects in one call", () => {
			const a = { x: 1 };
			const b = { y: 2 };
			const c = { z: 3 };

			const resultDeepMerge = deepMerge(deepMerge(a, b), c);
			const resultConfigMerge = configMergeDeep([a, b, c]);

			expect({
				explain: "✅ 函式簽章差異 - configMergeDeep：一次呼叫處理多個物件\nFunction signature difference - configMergeDeep: handles multiple objects in one call",
				tags: "signature, multiple-objects, single-call",
				input: { a, b, c },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("configMergeDeep merges multiple with left-to-right precedence", () => {
			const defaults = { a: 1, b: 1, c: 1 };
			const user = { b: 2, c: 2 };
			const override = { c: 3 };

			const resultDeepMerge = deepMerge(deepMerge(defaults, user), override);
			const resultConfigMerge = configMergeDeep([override, user, defaults]);

			expect({
				explain: "✅ 多物件優先順序：左側優先（override > user > defaults）\nMultiple objects precedence: leftmost wins (override > user > defaults)",
				tags: "precedence, left-to-right, priority",
				input: { defaults, user, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});
	});

	describe("null and special value handling", () => {
		it("deepMerge handles null in override", () => {
			const base = { value: "original" };
			const override = { value: null };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "✅ null 處理：deepMerge 保留 override 中的 null\nNull handling: deepMerge preserves null in override",
				tags: "null, special-value, preserve",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("configMergeDeep [override, base] keeps leftmost null", () => {
			const base = { value: "original" };
			const override = { value: null };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "✅ null 處理：configMergeDeep 保留左側（override）null\nNull handling: configMergeDeep keeps leftmost (override) null",
				tags: "null, special-value, left-wins",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("deepMerge treats null in base as non-object", () => {
			const base = { nested: null };
			const override = { nested: { a: 1 } };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "✅ base 中的 null：null 不被視為物件，因此被覆蓋\nNull in base: null is not treated as object, so it gets overwritten",
				tags: "null, nested, overwrite",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});
	});

	describe("edge cases", () => {
		it("deepMerge with empty objects", () => {
			const base = {};
			const override = { a: 1 };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "✅ 空物件處理：override 值被保留\nEmpty object handling: override values are preserved",
				tags: "edge-case, empty-object",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("configMergeDeep with empty array", () => {
			const resultDeepMerge = deepMerge({}, {});
			const resultConfigMerge = configMergeDeep([]);

			expect({
				explain: "⚠️ 空陣列處理：configMergeDeep([]) 回傳空物件（與 deepMerge({}, {}) 不同）\nEmpty array handling: configMergeDeep([]) returns empty object (different from deepMerge({}, {}))",
				tags: "edge-case, empty-array, difference",
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("configMergeDeep with single object", () => {
			const input = { a: 1, b: 2 };

			const resultDeepMerge = deepMerge({}, input);
			const resultConfigMerge = configMergeDeep([input]);

			expect({
				explain: "✅ 單一物件：configMergeDeep([input]) 回傳單一物件\nSingle object: configMergeDeep([input]) returns the single object",
				tags: "edge-case, single-object",
				input: { input },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("deepMerge does not mutate original objects", () => {
			const base = { a: 1, nested: { x: 1 } };
			const override = { b: 2 };

			const resultDeepMerge = deepMerge(base, override);
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "✅ 不可變性：deepMerge 不會修改原始物件\nImmutability: deepMerge does not mutate original objects",
				tags: "immutable, mutation, not-mutate",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
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
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "✅ 深層巢狀合併：兩者都在深層巢狀處遞迴合併\nDeep nested merge: both recursively merge at deep nesting",
				tags: "nested, deep, recursive",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});

		it("nested array behavior shows key difference", () => {
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
			const resultConfigMerge = configMergeDeep([override, base]);

			expect({
				explain: "⚠️ 巢狀陣列行為顯示關鍵差異：deepMerge 替換整個陣列，configMergeDeep 保留左側\nNested array behavior shows key difference: deepMerge replaces entire array, configMergeDeep keeps left",
				tags: "nested-array, array, difference",
				input: { base, override },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
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

			expect({
				explain: "✅ 函式簽章差異總結：deepMerge(base, override) vs configMergeDeep([objects...])\nFunction signature summary: deepMerge(base, override) vs configMergeDeep([objects...])",
				tags: "signature, comparison, summary",
				input: { obj1, obj2, obj3 },
				resultDeepMerge,
				resultConfigMerge,
			}).toMatchSnapshot();
		});
	});
});