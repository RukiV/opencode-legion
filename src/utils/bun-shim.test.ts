/**
 * Bun Shim Tests / Bun 偽裝類測試
 *
 * Tests for BunFile class methods: exists, text, json, arrayBuffer, blob
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { BunFile, FakeBun as Bun } from "./bun-shim";
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from "fs";
import { resolve } from "path";

const TEST_DIR = resolve(__dirname, "../../../test-temp");

describe("BunFile", () => {
	beforeEach(() => {
		// Create temp directory
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		// Cleanup temp directory
		try {
			const files = [
				"test.txt",
				"test.json",
				"empty.json",
				"test.bin",
			];
			for (const file of files) {
				try {
					unlinkSync(resolve(TEST_DIR, file));
				} catch {
					// Ignore cleanup errors
				}
			}
			rmdirSync(TEST_DIR);
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("path getter", () => {
		test("returns the file path", () => {
			const file = new BunFile("/path/to/file.txt");
			expect(file.path).toBe("/path/to/file.txt");
		});
	});

	describe("exists()", () => {
		test("returns true for existing file", async () => {
			const testPath = resolve(TEST_DIR, "test.txt");
			writeFileSync(testPath, "test content");

			const file = new BunFile(testPath);
			const result = await file.exists();

			expect(result).toBe(true);
		});

		test("returns false for non-existent file", async () => {
			const file = new BunFile(resolve(TEST_DIR, "non-existent.txt"));
			const result = await file.exists();

			expect(result).toBe(false);
		});
	});

	describe("text()", () => {
		test("reads file content as string", async () => {
			const testPath = resolve(TEST_DIR, "test.txt");
			const content = "Hello, World! 你好世界！";
			writeFileSync(testPath, content);

			const file = new BunFile(testPath);
			const result = await file.text();

			expect(result).toBe(content);
		});

		test("reads UTF-8 encoded content correctly", async () => {
			const testPath = resolve(TEST_DIR, "test.txt");
			const content = "中文內容\n多行文字\n🎉 Emoji";
			writeFileSync(testPath, content, "utf-8");

			const file = new BunFile(testPath);
			const result = await file.text();

			expect(result).toBe(content);
		});

		test("throws error for non-existent file", async () => {
			const file = new BunFile(resolve(TEST_DIR, "non-existent.txt"));

			await expect(file.text()).rejects.toThrow();
		});
	});

	describe("json()", () => {
		test("parses JSON file correctly", async () => {
			const testPath = resolve(TEST_DIR, "test.json");
			const data = { name: "test", value: 123, nested: { a: true } };
			writeFileSync(testPath, JSON.stringify(data));

			const file = new BunFile(testPath);
			const result = await file.json();

			expect(result).toEqual(data);
		});

		test("parses JSON array correctly", async () => {
			const testPath = resolve(TEST_DIR, "test.json");
			const data = [1, 2, 3, "four"];
			writeFileSync(testPath, JSON.stringify(data));

			const file = new BunFile(testPath);
			const result = await file.json();

			expect(result).toEqual(data);
		});

		test("parses empty object", async () => {
			const testPath = resolve(TEST_DIR, "empty.json");
			writeFileSync(testPath, "{}");

			const file = new BunFile(testPath);
			const result = await file.json();

			expect(result).toEqual({});
		});

		test("throws for invalid JSON", async () => {
			const testPath = resolve(TEST_DIR, "test.json");
			writeFileSync(testPath, "{ invalid json }");

			const file = new BunFile(testPath);

			await expect(file.json()).rejects.toThrow();
		});
	});

	describe("arrayBuffer()", () => {
		test("returns ArrayBuffer with correct content", async () => {
			const testPath = resolve(TEST_DIR, "test.bin");
			const content = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
			writeFileSync(testPath, content);

			const file = new BunFile(testPath);
			const result = await file.arrayBuffer();

			const view = new Uint8Array(result);
			expect(view).toEqual(content);
		});

		test("returns empty ArrayBuffer for empty file", async () => {
			const testPath = resolve(TEST_DIR, "test.bin");
			writeFileSync(testPath, new Uint8Array(0));

			const file = new BunFile(testPath);
			const result = await file.arrayBuffer();

			expect(result.byteLength).toBe(0);
		});
	});

	describe("blob()", () => {
		test("returns Blob with correct content", async () => {
			const testPath = resolve(TEST_DIR, "test.bin");
			const content = "Hello, Blob!";
			writeFileSync(testPath, content);

			const file = new BunFile(testPath);
			const result = await file.blob();

			expect(result.type).toBe("");
			expect(await result.text()).toBe(content);
		});

		test("returns empty Blob for empty file", async () => {
			const testPath = resolve(TEST_DIR, "test.bin");
			writeFileSync(testPath, "");

			const file = new BunFile(testPath);
			const result = await file.blob();

			expect(result.size).toBe(0);
		});
	});
});

describe("FakeBun", () => {
	test("file() returns BunFile instance", () => {
		const file = Bun.file("/path/to/test.txt");
		expect(file).toBeInstanceOf(BunFile);
	});

	test("file() returns BunFile with correct path", () => {
		const testPath = "/path/to/test.txt";
		const file = Bun.file(testPath);
		expect(file.path).toBe(testPath);
	});
});
