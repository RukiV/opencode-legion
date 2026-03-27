/**
 * Bun Mock 整合測試
 * Bun Mock Integration Tests
 *
 * 驗證 Bun Mock 整合器可以正確攔截 fs 模組
 * Verify Bun Mock Integrator can correctly intercept fs module
 *
 * @module test/lib/bun-mock.test
 */

// @noUnusedParameters:false
/// <reference types="bun" />
/// <reference types="node" />

import { describe, expect, it, beforeEach } from "bun:test";
import { createBunMockIntegrator } from "./bun-mock";

describe("BunMockIntegrator", () => {
	describe("createBunMockIntegrator", () => {
		it("should create integrator with mockFs", () => {
			const integrator = createBunMockIntegrator();
			expect(integrator.mockFs).toBeDefined();
		});

		it("should accept initial files", () => {
			const integrator = createBunMockIntegrator({
				files: {
					"/test/config.json": '{"key": "value"}',
					"/test/data.txt": "Hello World",
				},
			});

			expect(integrator.exists("/test/config.json")).toBe(true);
			expect(integrator.exists("/test/data.txt")).toBe(true);
			expect(integrator.readFile("/test/config.json")).toBe('{"key": "value"}');
		});

		it("should setup mock", () => {
			const integrator = createBunMockIntegrator();
			expect(() => integrator.setup()).not.toThrow();
		});
	});

	describe("writeFiles / writeJsonFiles", () => {
		let integrator: ReturnType<typeof createBunMockIntegrator>;

		beforeEach(() => {
			integrator = createBunMockIntegrator();
		});

		it("should write files", () => {
			integrator.writeFiles({
				"/file1.txt": "content 1",
				"/file2.txt": "content 2",
			});

			expect(integrator.exists("/file1.txt")).toBe(true);
			expect(integrator.exists("/file2.txt")).toBe(true);
			expect(integrator.readFile("/file1.txt")).toBe("content 1");
		});

		it("should write JSON files", () => {
			integrator.writeJsonFiles({
				"/config.json": { name: "test", value: 123 },
				"/settings.json": { debug: true },
			});

			expect(integrator.exists("/config.json")).toBe(true);
			expect(integrator.exists("/settings.json")).toBe(true);
			expect(integrator.readFile("/config.json")).toBe('{\n  "name": "test",\n  "value": 123\n}');
		});
	});

	describe("mock.module integration", () => {
		it("should intercept fs module after setup", async () => {
			const integrator = createBunMockIntegrator({
				files: {
					"/mocked/data.json": '{"intercepted": true}',
				},
			});

			integrator.setup();

			// 動態匯入 fs 並驗證使用的是 mock
			const fs = await import("fs");
			const content = fs.readFileSync("/mocked/data.json", "utf-8") as string;
			expect(content).toBe('{"intercepted": true}');
		});

		it("should intercept fs-extra module after setup", async () => {
			const integrator = createBunMockIntegrator({
				files: {
					"/mocked/extra.json": '{"fsExtra": true}',
				},
			});

			integrator.setup();

			const fsExtra = await import("fs-extra");
			const content = fsExtra.readFileSync("/mocked/extra.json", "utf-8") as string;
			expect(content).toBe('{"fsExtra": true}');
		});

		it("should support async fs operations", async () => {
			const integrator = createBunMockIntegrator();

			integrator.mockFs.writeJsonSync("/async/test.json", { async: true });
			integrator.setup();

			const fs = await import("fs/promises");
			const result = await fs.readFile("/async/test.json", "utf-8");
			expect(result).toBe('{\n  "async": true\n}');
		});

		it("should support fs-extra readJson", async () => {
			const integrator = createBunMockIntegrator();

			integrator.mockFs.writeJsonSync("/extra/json.json", { fsExtra: true });
			integrator.setup();

			const fsExtra = await import("fs-extra");
			const result = await fsExtra.readJson("/extra/json.json");
			expect(result).toEqual({ fsExtra: true });
		});

		it("should support fs-extra pathExists", async () => {
			const integrator = createBunMockIntegrator();

			integrator.mockFs.writeFileSync("/exists/file.txt", "exists");
			integrator.setup();

			const fsExtra = await import("fs-extra");
			const exists = await fsExtra.pathExists("/exists/file.txt");
			const notExists = await fsExtra.pathExists("/not/exists.txt");

			expect(exists).toBe(true);
			expect(notExists).toBe(false);
		});

		it("should support mkdir operations", async () => {
			const integrator = createBunMockIntegrator();
			integrator.setup();

			const fs = await import("fs");
			await fs.mkdir("/new/dir", { recursive: true } as any);

			expect(integrator.exists("/new/dir")).toBe(true);
		});

		it("should support copy operations", async () => {
			const integrator = createBunMockIntegrator();

			integrator.mockFs.writeFileSync("/copy/source.txt", "original content");
			integrator.setup();

			const fs = await import("fs/promises");
			await fs.copyFile("/copy/source.txt", "/copy/dest.txt");

			expect(integrator.exists("/copy/dest.txt")).toBe(true);
			expect(integrator.readFile("/copy/dest.txt")).toBe("original content");
		});
	});
});
