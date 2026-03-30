/**
 * JSONC 工具測試
 * JSONC utility tests
 *
 * 測試 createJsonHandler、JsonHandler 和 detectFormat 的功能
 * Tests for createJsonHandler, JsonHandler and detectFormat functionality
 *
 * ⚠️ 注意：JsonHandler.stringify() 會保留原始文字的格式與註解
 */

import { describe, expect, test } from "bun:test";
import { createJsonHandler, detectFormat } from "./config/jsonc";

/* ============ createJsonHandler 工廠函數測試 / createJsonHandler factory function tests ============ */

describe("createJsonHandler", () => {
	test("解析標準 JSON", () => {
		const handler = createJsonHandler('{"a": 1, "b": "hello"}');
		expect(handler.valueOf()).toEqual({ a: 1, b: "hello" });
	});

	test("解析 JSON 陣列", () => {
		const handler = createJsonHandler('[1, 2, 3]');
		expect(handler.valueOf()).toEqual([1, 2, 3]);
	});

	test("解析帶單行註解的 JSONC", () => {
		const jsonc = `{
  // 這是單行註解
  "a": 1,
  "b": 2
}`;
		const handler = createJsonHandler(jsonc);
		expect(handler.valueOf()).toEqual({ a: 1, b: 2 });
	});

	test("解析帶多行註解的 JSONC", () => {
		const jsonc = `{
  /* 這是
     多行註解 */
  "a": 1
}`;
		const handler = createJsonHandler(jsonc);
		expect(handler.valueOf()).toEqual({ a: 1 });
	});

	test("解析帶尾隨逗號的 JSONC", () => {
		const jsonc = `{
  "a": 1,
  "b": 2,
}`;
		const handler = createJsonHandler(jsonc);
		expect(handler.valueOf()).toEqual({ a: 1, b: 2 });
	});

	test("解析複雜巢狀結構", () => {
		const jsonc = `{
  // 設定
  "settings": {
    "theme": "dark", // 主題
    "version": 1
  },
  "items": [1, 2, 3] // 項目
}`;
		const handler = createJsonHandler(jsonc);
		expect(handler.valueOf()).toEqual({
			settings: {
				theme: "dark",
				version: 1,
			},
			items: [1, 2, 3],
		});
	});

	test("處理 URL 中的雙斜線", () => {
		const jsonc = `{
  "url": "https://example.com/path//more"
}`;
		const handler = createJsonHandler(jsonc);
		expect(handler.valueOf()).toEqual({
			url: "https://example.com/path//more",
		});
	});
});

/* ============ detectFormat 函數測試 / detectFormat function tests ============ */

describe("detectFormat", () => {
	test("偵測 2 空格縮排", () => {
		const text = '{\n  "a": 1\n}';
		const options = detectFormat(text);
		expect(options.insertSpaces).toBe(true);
		expect(options.tabSize).toBe(2);
	});

	test("偵測 4 空格縮排", () => {
		const text = '{\n    "a": 1\n}';
		const options = detectFormat(text);
		expect(options.insertSpaces).toBe(true);
		expect(options.tabSize).toBe(4);
	});

	test("偵測 Tab 縮排", () => {
		const text = '{\n\t"a": 1\n}';
		const options = detectFormat(text);
		expect(options.insertSpaces).toBe(false);
	});
});

/* ============ JsonHandler 類測試 / JsonHandler class tests ============ */

describe("JsonHandler instance methods", () => {
	test("基本讀取", () => {
		const handler = createJsonHandler('{"a": 1, "b": 2}');
		expect(handler.get(["a"])).toBe(1);
		expect(handler.get(["b"])).toBe(2);
		expect(handler.get(["c"])).toBeUndefined();
	});

	test("設定值", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.set(["b"], 2);
		expect(handler.get(["b"])).toBe(2);
	});

	test("刪除值", () => {
		const handler = createJsonHandler('{"a": 1, "b": 2}');
		handler.delete(["a"]);
		expect(handler.has(["a"])).toBe(false);
	});

	test("檢查存在性", () => {
		const handler = createJsonHandler('{"exists": true}');
		expect(handler.has(["exists"])).toBe(true);
		expect(handler.has(["notExists"])).toBe(false);
	});

	test("stringify 應用修改", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.set(["b"], 2);
		const result = handler.stringify();
		expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
	});

	test("stringify 刪除欄位", () => {
		const handler = createJsonHandler('{"a": 1, "b": 2}');
		handler.delete(["a"]);
		const result = handler.stringify();
		expect(JSON.parse(result)).toEqual({ b: 2 });
	});

	test("巢狀路徑操作", () => {
		const handler = createJsonHandler('{"user": {"name": "test"}}');
		expect(handler.get(["user", "name"])).toBe("test");

		handler.set(["user", "email"], "test@example.com");
		expect(handler.get(["user", "email"])).toBe("test@example.com");

		const result = handler.stringify();
		expect(JSON.parse(result)).toEqual({
			user: {
				name: "test",
				email: "test@example.com",
			},
		});
	});

	test("重置為原始狀態", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.set(["b"], 2);
		handler.reset();
		expect(handler.get(["b"])).toBeUndefined();
		expect(handler.get(["a"])).toBe(1);
	});

	test("清空暫存區", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.set(["b"], 2);
		handler.clearStaging();
		expect(handler.get(["b"])).toBeUndefined();
	});

	test("取得原始文字", () => {
		const original = '{"a": 1}';
		const handler = createJsonHandler(original);
		expect(handler.getSourceText()).toBe(original);
	});

	test("格式化選項", () => {
		const handler = createJsonHandler('{"a":1}');
		const options = handler.getFormattingOptions();
		expect(options).toHaveProperty("insertSpaces");
		expect(options).toHaveProperty("tabSize");

		handler.setFormattingOptions({ tabSize: 4 });
		expect(handler.getFormattingOptions().tabSize).toBe(4);
	});

	test("解析錯誤拋出", () => {
		expect(() => createJsonHandler('{"a": invalid}')).toThrow();
	});

	test("valueOf 回傳完整物件", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.set(["b"], 2);
		expect(handler.valueOf()).toEqual({ a: 1, b: 2 });
	});
});

/* ============ JsonHandler Staging Area 測試 / JsonHandler Staging Area tests ============ */

describe("JsonHandler Staging Area", () => {
	test("多次設定同一路徑", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.set(["a"], 2);
		handler.set(["a"], 3);
		expect(handler.get(["a"])).toBe(3);
	});

	test("刪除後重新設定", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.delete(["a"]);
		handler.set(["a"], 2);
		expect(handler.get(["a"])).toBe(2);
	});

	test("isStagedChanged 回傳 staging 大小", () => {
		const handler = createJsonHandler('{"a": 1}');
		expect(handler.isStagedChanged()).toBe(0);

		handler.set(["b"], 2);
		expect(handler.isStagedChanged()).toBe(1);

		handler.set(["c"], 3);
		expect(handler.isStagedChanged()).toBe(2);

		// 可以在條件判斷中使用（非布林值）
		if (handler.isStagedChanged()) {
			// size > 0 會被視為 truthy
		}
	});

	test("overwriteStaged 完全覆寫", () => {
		const handler = createJsonHandler('{"a": 1, "b": 2}');
		handler.set(["c"], 3);

		const newStaging = new Map<string, unknown>([["[\"d\"]", 4]]);
		handler.overwriteStaged(newStaging);

		expect(handler.get(["c"])).toBeUndefined();
		expect(handler.get(["d"])).toBe(4);
	});

	test("applyStaged 合併暫存", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.set(["b"], 2);

		const moreStaging = new Map<string, unknown>([["[\"c\"]", 3]]);
		handler.applyStaged(moreStaging);

		expect(handler.get(["a"])).toBe(1);
		expect(handler.get(["b"])).toBe(2);
		expect(handler.get(["c"])).toBe(3);
	});

	test("getStagedChanges 回傳拷貝", () => {
		const handler = createJsonHandler('{"a": 1}');
		handler.set(["b"], 2);

		const changes = handler.getStagedChanges();
		changes.set("[\"c\"]", 3);

		expect(handler.get(["c"])).toBeUndefined();
	});
});

/* ============ JSONC 註解處理測試 / JSONC comment handling tests ============ */

describe("JSONC 註解處理", () => {
	test("註解在物件內", () => {
		const handler = createJsonHandler(`{
  "name": "test",
  // 註解
  "value": 123
}`);
		expect(handler.valueOf()).toEqual({ name: "test", value: 123 });
	});

	test("註解在陣列內", () => {
		const handler = createJsonHandler(`[
  1,
  // 註解
  2,
  3
]`);
		expect(handler.valueOf()).toEqual([1, 2, 3]);
	});

	test("多行註解跨越多行", () => {
		const handler = createJsonHandler(`{
  /* 第一行
     第二行
     第三行 */
  "value": 1
}`);
		expect(handler.valueOf()).toEqual({ value: 1 });
	});

	test("巢狀結構中的註解", () => {
		const handler = createJsonHandler(`{
  "outer": {
    // 內層註解
    "inner": "data"
  },
  /* 外層註解 */
  "other": true
}`);
		expect(handler.valueOf()).toEqual({
			outer: { inner: "data" },
			other: true,
		});
	});

	test("字串中包含註解符號不應被視為註解", () => {
		const handler = createJsonHandler(`{
  "url": "https://example.com/path//more",
  "comment": "這是 /* 多行 */ 註解文字"
}`);
		expect(handler.valueOf()).toEqual({
			url: "https://example.com/path//more",
			comment: "這是 /* 多行 */ 註解文字",
		});
	});
});
