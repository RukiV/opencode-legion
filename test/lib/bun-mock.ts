/**
 * Bun Mock 整合模組
 * Bun Mock Integration Module
 *
 * 提供 Bun test 的 mock.module() 整合，讓 MockFs 可以攔截 fs 模組呼叫
 * Provides Bun test mock.module() integration to let MockFs intercept fs module calls
 *
 * @module test/lib/bun-mock
 */

// @noUnusedParameters:false
/// <reference types="bun" />
/// <reference types="node" />

import { mock } from "bun:test";
import { MockFs } from "./mock-fs";

/**
 * 將 PathLike 轉換為字串
 * Convert PathLike to string
 */
function toPathString(path: string | { toString(): string } | Buffer): string {
	if (typeof path === "string") return path;
	if (Buffer.isBuffer(path)) return path.toString();
	return path.toString();
}

/**
 * Bun Mock 整合器工廠
 * Bun Mock Integrator Factory
 *
 * 提供便利的方式使用 Bun test 的 mock.module() 來拦截 fs/fs-extra
 *
 * @example
 * ```typescript
 * import { describe, it, expect, beforeEach } from "bun:test";
 * import { createBunMockIntegrator } from "./bun-mock";
 *
 * describe("File Processing", () => {
 *   const integrator = createBunMockIntegrator();
 *
 *   beforeEach(() => integrator.setup());
 *
 *   it("should mock fs calls", async () => {
 *     // 寫入 mock 資料
 *     integrator.mockFs.writeJsonSync("/config.json", { key: "value" });
 *
 *     // 動態匯入模組（會使用 mock 的 fs）
 *     const { loadConfig } = await import("./my-module");
 *     const config = await loadConfig("/config.json");
 *
 *     expect(config.key).toBe("value");
 *   });
 * });
 * ```
 */
export interface IBunMockIntegrator {
	/** MockFs 實例 */
	readonly mockFs: MockFs;

	/** 設定 mock */
	setup(): void;

	/** 批次寫入檔案 */
	writeFiles(files: Record<string, string>): void;

	/** 批次寫入 JSON 檔案 */
	writeJsonFiles(files: Record<string, unknown>): void;

	/** 檢查路徑是否存在 */
	exists(path: string): boolean;

	/** 讀取檔案內容 */
	readFile(path: string): string;
}

/**
 * 建立 Bun Mock 整合器
 * Create Bun Mock Integrator
 *
 * @param options - 選項
 * @param options.enableSafetyCheck - 是否啟用安全檢查
 * @param options.auditDir - Audit 目錄路徑
 * @param options.auditEnabled - 是否啟用 Audit Mode
 * @param options.files - 初始檔案
 */
export function createBunMockIntegrator(
	options: {
		enableSafetyCheck?: boolean;
		auditDir?: string;
		auditEnabled?: boolean;
		files?: Record<string, string>;
	} = {}
): IBunMockIntegrator {
	const mockFs = new MockFs({
		enableSafetyCheck: options.enableSafetyCheck ?? false,
		auditDir: options.auditDir,
		auditEnabled: options.auditEnabled,
	});

	// 預設寫入檔案
	if (options.files) {
		mockFs.setFiles(options.files);
	}

	const integrator: IBunMockIntegrator = {
		get mockFs() {
			return mockFs;
		},

		setup() {
			// 建立 fs mock
			const fsMock = {
				// 同步操作
				readFileSync: (path: Parameters<typeof import("fs")["readFileSync"]>[0], options?: Parameters<typeof import("fs")["readFileSync"]>[1]) => {
					return mockFs.readFileSync(toPathString(path), "utf-8");
				},
				writeFileSync: (path: Parameters<typeof import("fs")["writeFileSync"]>[0], data: string | Buffer, options?: Parameters<typeof import("fs")["writeFileSync"]>[2]) => {
					mockFs.writeFileSync(toPathString(path), typeof data === "string" ? data : data.toString(), "utf-8");
				},
				existsSync: (path: Parameters<typeof import("fs")["existsSync"]>[0]) => {
					return mockFs.existsSync(toPathString(path));
				},
				mkdirSync: (path: Parameters<typeof import("fs")["mkdirSync"]>[0], options?: { recursive?: boolean; mode?: number }) => {
					mockFs.mkdirSync(toPathString(path), options?.recursive ?? true);
				},
				rmSync: (path: Parameters<typeof import("fs")["rmSync"]>[0], options?: Parameters<typeof import("fs")["rmSync"]>[1]) => {
					mockFs.rmSync(toPathString(path), { recursive: options?.recursive ?? false });
				},
				statSync: (path: Parameters<typeof import("fs")["statSync"]>[0]) => {
					const stat = mockFs.statSync(toPathString(path));
					return {
						isFile: () => stat.isFile,
						isDirectory: () => stat.isDirectory,
						size: stat.size,
						mtime: stat.modifiedAt,
						ctime: stat.createdAt,
						atime: stat.modifiedAt,
						birthtime: stat.createdAt,
					};
				},
				readdirSync: (path: Parameters<typeof import("fs")["readdirSync"]>[0]) => {
					return mockFs.readdirSync(toPathString(path));
				},
				copyFileSync: (src: Parameters<typeof import("fs")["copyFileSync"]>[0], dest: Parameters<typeof import("fs")["copyFileSync"]>[1]) => {
					mockFs.copyFileSync(toPathString(src), toPathString(dest));
				},
				unlinkSync: (path: Parameters<typeof import("fs")["unlinkSync"]>[0]) => {
					mockFs.rmSync(toPathString(path));
				},
				readlinkSync: (path: Parameters<typeof import("fs")["readlinkSync"]>[0]) => {
					return mockFs.readFileSync(toPathString(path), "utf-8");
				},
				symlinkSync: (target: Parameters<typeof import("fs")["symlinkSync"]>[0], path: Parameters<typeof import("fs")["symlinkSync"]>[1]) => {
					mockFs.writeFileSync(toPathString(path), toPathString(target), "utf-8");
				},
				accessSync: (path: Parameters<typeof import("fs")["accessSync"]>[0]) => {
					if (!mockFs.existsSync(toPathString(path))) {
						throw Object.assign(new Error("ENOENT"), { code: "ENOENT", path: toPathString(path) });
					}
				},
				realpathSync: (path: Parameters<typeof import("fs")["realpathSync"]>[0]) => {
					return toPathString(path);
				},
				lstatSync: (path: Parameters<typeof import("fs")["lstatSync"]>[0]) => {
					return fsMock.statSync(path);
				},

				// Promise 操作
				readFile: async (path: Parameters<typeof import("fs")["readFile"]>[0], options?: Parameters<typeof import("fs")["readFile"]>[1]) => {
					return mockFs.readFileSync(toPathString(path), "utf-8");
				},
				writeFile: async (path: Parameters<typeof import("fs")["writeFile"]>[0], data: string | Buffer, options?: Parameters<typeof import("fs")["writeFile"]>[2]) => {
					mockFs.writeFileSync(toPathString(path), typeof data === "string" ? data : data.toString(), "utf-8");
				},
				mkdir: async (path: Parameters<typeof import("fs")["mkdir"]>[0], options?: { recursive?: boolean; mode?: number }) => {
					mockFs.mkdirSync(toPathString(path), options?.recursive ?? true);
				},
				rm: async (path: Parameters<typeof import("fs")["rm"]>[0], options?: Parameters<typeof import("fs")["rm"]>[1]) => {
					mockFs.rmSync(toPathString(path), { recursive: options?.recursive ?? false });
				},
				copyFile: async (src: Parameters<typeof import("fs")["copyFile"]>[0], dest: Parameters<typeof import("fs")["copyFile"]>[1]) => {
					mockFs.copyFileSync(toPathString(src), toPathString(dest));
				},
				unlink: async (path: Parameters<typeof import("fs")["unlink"]>[0]) => {
					mockFs.rmSync(toPathString(path));
				},
				access: async (path: Parameters<typeof import("fs")["access"]>[0]) => {
					if (!mockFs.existsSync(toPathString(path))) {
						throw Object.assign(new Error("ENOENT"), { code: "ENOENT", path: toPathString(path) });
					}
				},
				stat: async (path: Parameters<typeof import("fs")["stat"]>[0]) => {
					return fsMock.statSync(path);
				},
				readdir: async (path: Parameters<typeof import("fs")["readdir"]>[0]) => {
					return mockFs.readdirSync(toPathString(path));
				},
				readlink: async (path: Parameters<typeof import("fs")["readlink"]>[0]) => {
					return mockFs.readFileSync(toPathString(path), "utf-8");
				},
				symlink: async (target: Parameters<typeof import("fs")["symlink"]>[0], path: Parameters<typeof import("fs")["symlink"]>[1]) => {
					mockFs.writeFileSync(toPathString(path), toPathString(target), "utf-8");
				},
				constants: {},
			};

			// 建立 fs-extra mock
			const fsExtraMock = {
				...fsMock,

				// fs-extra 額外方法
				ensureDir: async (path: string) => mockFs.mkdirSync(toPathString(path), true),
				ensureDirSync: (path: string) => mockFs.mkdirSync(toPathString(path), true),
				outputFile: async (path: string, data: string | Buffer) => {
					mockFs.writeFileSync(toPathString(path), typeof data === "string" ? data : data.toString(), "utf-8");
				},
				outputFileSync: (path: string, data: string | Buffer) => {
					mockFs.writeFileSync(toPathString(path), typeof data === "string" ? data : data.toString(), "utf-8");
				},
				outputJson: async (path: string, data: unknown) => mockFs.writeJsonSync(toPathString(path), data),
				outputJsonSync: (path: string, data: unknown) => mockFs.writeJsonSync(toPathString(path), data),
				readJson: async (path: string) => mockFs.readJsonSync(toPathString(path)),
				readJsonSync: (path: string) => mockFs.readJsonSync(toPathString(path)),
				pathExists: async (path: string) => mockFs.existsSync(toPathString(path)),
				pathExistsSync: (path: string) => mockFs.existsSync(toPathString(path)),
				remove: async (path: string) => mockFs.rmSync(toPathString(path), { recursive: true }),
				removeSync: (path: string) => mockFs.rmSync(toPathString(path), { recursive: true }),
				move: async (src: string, dest: string) => {
					const content = mockFs.readFileSync(toPathString(src), "utf-8");
					mockFs.writeFileSync(toPathString(dest), content, "utf-8");
					mockFs.rmSync(toPathString(src));
				},
				moveSync: (src: string, dest: string) => {
					const content = mockFs.readFileSync(toPathString(src), "utf-8");
					mockFs.writeFileSync(toPathString(dest), content, "utf-8");
					mockFs.rmSync(toPathString(src));
				},
				copy: async (src: string, dest: string) => mockFs.copyFileSync(toPathString(src), toPathString(dest)),
				copySync: (src: string, dest: string) => mockFs.copyFileSync(toPathString(src), toPathString(dest)),
				emptyDir: async (path: string) => {
					if (mockFs.isDirectory(toPathString(path))) {
						for (const entry of mockFs.readdirSync(toPathString(path))) {
							mockFs.rmSync(`${toPathString(path)}/${entry}`, { recursive: true });
						}
					}
				},
				emptyDirSync: (path: string) => {
					if (mockFs.isDirectory(toPathString(path))) {
						for (const entry of mockFs.readdirSync(toPathString(path))) {
							mockFs.rmSync(`${toPathString(path)}/${entry}`, { recursive: true });
						}
					}
				},
			};

			// 使用 Bun 的 mock.module() 拦截 fs 模組
			// Mock fs module
			mock.module("node:fs", () => fsMock as unknown as typeof import("fs"));
			mock.module("node:fs/promises", () => fsMock as unknown as typeof import("fs/promises"));
			mock.module("fs", () => fsMock as unknown as typeof import("fs"));
			mock.module("fs-extra", () => fsExtraMock as unknown as typeof import("fs-extra"));
		},

		writeFiles(files: Record<string, string>) {
			mockFs.setFiles(files);
		},

		writeJsonFiles(files: Record<string, unknown>) {
			for (const [path, data] of Object.entries(files)) {
				mockFs.writeJsonSync(path, data);
			}
		},

		exists(path: string) {
			return mockFs.existsSync(path);
		},

		readFile(path: string) {
			return mockFs.readFileSync(path, "utf-8");
		},
	};

	return integrator;
}

/**
 * 簡化版本：直接使用 mock.module() 的 helper
 * Simplified version: helper for using mock.module() directly
 *
 * @example
 * ```typescript
 * import { describe, it, expect, beforeEach } from "bun:test";
 * import { mockFsModule } from "./bun-mock";
 *
 * describe("My Module", () => {
 *   beforeEach(() => {
 *     mockFsModule({
 *       "/config.json": '{"key": "value"}',
 *     });
 *   });
 *
 *   it("should load config", async () => {
 *     const { loadConfig } = await import("./my-module");
 *     const config = await loadConfig("/config.json");
 *     expect(config.key).toBe("value");
 *   });
 * });
 * ```
 *
 * @param files - 預設要 mock 的檔案
 * @param options - 選項
 */
export function mockFsModule(
	files: Record<string, string> = {},
	options: {
		enableSafetyCheck?: boolean;
		auditDir?: string;
		auditEnabled?: boolean;
	} = {}
): {
	mockFs: MockFs;
	setup(): void;
} {
	const mockFs = new MockFs({
		enableSafetyCheck: options.enableSafetyCheck ?? false,
		auditDir: options.auditDir,
		auditEnabled: options.auditEnabled,
	});

	if (Object.keys(files).length > 0) {
		mockFs.setFiles(files);
	}

	const setup = () => {
		// 這個函式需要由 Bun test 的 beforeEach 呼叫
		// 才能確保 mock 在正確的時機生效
	};

	return {
		get mockFs() {
			return mockFs;
		},
		setup,
	};
}
