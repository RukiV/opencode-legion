/**
 * Mock 檔案系統類
 * Mock File System Class
 *
 * 提供記憶體中的檔案系統模擬，支援讀寫操作但隔離於真實檔案系統
 * Provides in-memory file system simulation, supports read/write operations but isolated from real file system
 *
 * 使用 upath2 確保路徑格式跨平台一致（統一使用正斜線 /）
 * Uses upath2 to ensure consistent path format across platforms (unified forward slash /)
 *
 * ⚠️ 安全限制：僅允許操作 test/temp/ 目錄下的路徑
 * ⚠️ Safety restriction: Only allow operations on paths under test/temp/
 *
 * 🎯 Audit Mode：可選將 Mock 變更同步寫入 audit 目錄，方便查閱測試期間的變更
 * 🎯 Audit Mode: Optionally sync Mock changes to audit directory for review after tests
 *
 * @module test/lib/mock-fs
 */

// @noUnusedParameters:false
/// <reference types="node" />

import { dirname } from "upath2";
import * as fsExtra from "fs-extra";
import micromatch from "micromatch";
import type { IFsSafetyResult } from "./helpers/fs-safety";
import { checkFsSafety } from "./helpers/fs-safety";

/**
 * Mock 檔案系統項目類型
 * Mock file system entry type
 */
type MockFsEntry = MockFile | MockDirectory;

/**
 * Mock 檔案內容
 * Mock file content
 */
interface MockFile {
	type: "file";
	content: string;
	createdAt: Date;
	modifiedAt: Date;
}

/**
 * Mock 目錄內容
 * Mock directory content
 */
interface MockDirectory {
	type: "directory";
	entries: Map<string, MockFsEntry>;
	createdAt: Date;
	modifiedAt: Date;
}

/**
 * MockFS 配置選項
 * MockFS configuration options
 */
export interface IMockFsOptions {
	/** 是否啟用安全檢查（預設 true）/ Whether to enable safety checks (default: true) */
	enableSafetyCheck?: boolean;
	/** 是否在不存在時自動建立目錄（預設 true）/ Auto-create directories when not exist (default: true) */
	autoCreateDir?: boolean;
	/**
	 * Audit 目錄路徑（可選）
	 * Audit directory path (optional)
	 *
	 * 當設定時，所有檔案變更會同步寫入此目錄，方便測試後查閱
	 * When set, all file changes will be synced to this directory for post-test review
	 *
	 * @example
	 * ```typescript
	 * const mockFs = new MockFs({
	 *   auditDir: `${__TEST_TEMP}/audit/my-test-1234567890`
	 * });
	 *
	 * mockFs.writeFileSync("/test/output.json", JSON.stringify(data));
	 * // → 會同步寫入到 audit 目錄
	 * ```
	 */
	auditDir?: string | null;
	/**
	 * 是否啟用 Audit Mode（預設 false）
	 * Whether to enable Audit Mode (default: false)
	 *
	 * 當啟用時，寫入操作會同步寫入 audit 目錄
	 * When enabled, write operations will sync to audit directory
	 *
	 * @example
	 * ```typescript
	 * const mockFs = new MockFs({
	 *   auditDir: `${__TEST_TEMP}/audit`,
	 *   auditEnabled: true
	 * });
	 *
	 * mockFs.writeFileSync("/test/output.json", "{}");
	 * // → 會同步寫入到 audit 目錄
	 * ```
	 */
	auditEnabled?: boolean;
	/** Micromatch patterns 陣列，用於過濾哪些檔案路徑需要寫入 audit */
	auditPatterns?: string[];
}

/**
 * MockFS內部使用的完整選項類型
 * Internal complete options type for MockFS
 */
interface IMockFsInternalOptions {
	enableSafetyCheck: boolean;
	autoCreateDir: boolean;
	auditDir: string | null;
	auditEnabled: boolean;
	auditPatterns: string[];
}

/**
 * MockFS選項的預設值
 * Default MockFS options
 */
const DEFAULT_OPTIONS: IMockFsInternalOptions = {
	enableSafetyCheck: true,
	autoCreateDir: true,
	auditDir: null,
	auditEnabled: false,
	auditPatterns: ["**/*"],
};

/**
 * Mock 檔案系統類
 * Mock File System Class
 *
 * 在記憶體中模擬檔案系統操作，確保測試不會影響真實檔案
 * Simulates file system operations in memory, ensuring tests don't affect real files
 *
 * @example
 * ```typescript
 * const fs = new MockFs();
 *
 * // 寫入檔案
 * fs.writeFileSync("/test/file.txt", "Hello World");
 *
 * // 讀取檔案
 * const content = fs.readFileSync("/test/file.txt", "utf-8");
 * console.log(content); // "Hello World"
 *
 * // 檢查檔案是否存在
 * console.log(fs.existsSync("/test/file.txt")); // true
 * ```
 */
export class MockFs {
	/** 根目錄 / Root directory */
	protected readonly root: MockDirectory;
	/** 配置選項 / Configuration options */
	protected readonly options: IMockFsInternalOptions;

	/**
	 * 建構子
	 * Constructor
	 *
	 * @param options - 配置選項 / Configuration options
	 */
	constructor(options: IMockFsOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
		this.root = this._createDirectory();
	}

	/**
	 * 建立目錄項目
	 * Create directory entry
	 */
	protected _createDirectory(): MockDirectory {
		return {
			type: "directory",
			entries: new Map(),
			createdAt: new Date(),
			modifiedAt: new Date(),
		};
	}

	/**
	 * 建立檔案項目
	 * Create file entry
	 */
	protected _createFile(content: string = ""): MockFile {
		return {
			type: "file",
			content,
			createdAt: new Date(),
			modifiedAt: new Date(),
		};
	}

	/**
	 * 解析路徑為目錄和檔案名稱
	 * Resolve path to directory and filename
	 *
	 * @param path - 檔案路徑 / File path
	 * @returns 包含父目錄和檔案名稱的元組 / Tuple containing parent directory and filename
	 */
	protected _resolvePath(path: string): [MockDirectory, string] {
		const parts = path.split(/[/\\]/).filter(Boolean);
		let current: MockDirectory = this.root;

		// 遍歷到父目錄
		// Traverse to parent directory
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			let entry = current.entries.get(part);

			if (!entry || entry.type !== "directory") {
				if (this.options.autoCreateDir) {
					entry = this._createDirectory();
					current.entries.set(part, entry);
				} else {
					throw new Error(`目錄不存在: ${parts.slice(0, i + 1).join("/")}`);
				}
			}

			current = entry as MockDirectory;
		}

		const filename = parts[parts.length - 1];
		return [current, filename];
	}

	/**
	 * 取得路徑對應的項目
	 * Get entry at path
	 */
	protected _getEntry(path: string): MockFsEntry | undefined {
		if (path === "/" || path === "") {
			return this.root;
		}

		const normalizedPath = path.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
		const parts = normalizedPath.split(/[/\\]/).filter(Boolean);
		let current: MockFsEntry = this.root;

		for (const part of parts) {
			if (current.type !== "directory") {
				return undefined;
			}
			const nextEntry = current.entries.get(part);
			if (!nextEntry) {
				return undefined;
			}
			current = nextEntry;
		}

		return current;
	}

	/**
	 * 安全檢查路徑
	 * Safety check path
	 */
	protected _safetyCheck(path: string, allowRelative: boolean = false): IFsSafetyResult {
		if (!this.options.enableSafetyCheck) {
			return { isSafe: true, reason: "Safety check disabled", rule: "whitelist" };
		}
		return checkFsSafety(path, allowRelative);
	}

	/**
	 * 確保路徑安全並解析
	 * Ensure path is safe and resolve
	 */
	protected _ensureSafety(path: string, allowRelative: boolean = false): void {
		const result = this._safetyCheck(path, allowRelative);
		if (!result.isSafe) {
			throw new Error(`[MockFS] ${result.reason} (rule: ${result.rule})`);
		}
	}

	// ==================== 同步寫入操作 / Sync Write Operations ====================

	/**
	 * 同步寫入文字檔案
	 * Sync write text file
	 *
	 * @param path - 檔案路徑 / File path
	 * @param content - 檔案內容 / File content
	 * @param encoding - 編碼（僅支援 utf-8）/ Encoding (only supports utf-8)
	 */
	writeFileSync(path: string, content: string, encoding: BufferEncoding = "utf-8"): void {
		this._ensureSafety(path);

		if (encoding !== "utf-8") {
			throw new Error(`[MockFS] 不支援的編碼: ${encoding}，僅支援 utf-8`);
		}

		const [parentDir, filename] = this._resolvePath(path);
		const existing = parentDir.entries.get(filename);
		const now = new Date();

		const file: MockFile = existing?.type === "file"
			? { ...existing, content, modifiedAt: now }
			: this._createFile(content);

		parentDir.entries.set(filename, file);
		parentDir.modifiedAt = now;

		// 審計模式：同步寫入 audit 目錄
		// Audit mode: sync write to audit directory
		if (this.options.auditEnabled && this.options.auditDir) {
			this._writeAuditFile(path, content);
		}
	}

	/**
	 * 同步寫入 JSON 檔案
	 * Sync write JSON file
	 *
	 * @param path - 檔案路徑 / File path
	 * @param data - JSON 資料 / JSON data
	 */
	writeJsonSync(path: string, data: unknown): void {
		this.writeFileSync(path, JSON.stringify(data, null, 2));
	}

	/**
	 * 寫入審計檔案
	 * Write audit file
	 *
	 * 將檔案內容同步寫入 audit 目錄
	 * Sync write file content to audit directory
	 *
	 * @param mockPath - MockFS 中的檔案路徑 / File path in MockFS
	 * @param content - 檔案內容 / File content
	 */
	protected _writeAuditFile(mockPath: string, content: string): void {
		if (!this.options.auditEnabled || !this.options.auditDir) return;

		// Pattern 過濾：檢查路徑是否符合 auditPatterns
		// Pattern filtering: check if path matches auditPatterns
		const { auditPatterns } = this.options;
		if (auditPatterns && auditPatterns.length > 0) {
			// 分離包含和排除模式
			// Separate include and exclude patterns
			const includePatterns: string[] = [];
			const excludePatterns: string[] = [];

			for (const pattern of auditPatterns) {
				if (pattern.startsWith("!")) {
					excludePatterns.push(pattern.slice(1));
				} else {
					includePatterns.push(pattern);
				}
			}

			// 檢查是否應該被審計
			// Check if should be audited
			const matchesInclude = includePatterns.length === 0 ||
				includePatterns.some(p => micromatch.isMatch(mockPath, p));
			const matchesExclude = excludePatterns.some(p => micromatch.isMatch(mockPath, p));

			if (!matchesInclude || matchesExclude) {
				return; // 不符合 pattern，跳過 audit
			}
		}

		try {
			// 將 mock 路徑轉換為 audit 目錄下的相對路徑
			// Convert mock path to relative path under audit directory
			// 確保 auditDir 結尾有 /
			const auditDir = this.options.auditDir.endsWith("/")
				? this.options.auditDir
				: `${this.options.auditDir}/`;
			const auditPath = `${auditDir}${mockPath}`;

			// 確保目錄存在
			// Ensure directory exists
			fsExtra.ensureDirSync(dirname(auditPath));

			// 寫入檔案
			// Write file
			fsExtra.writeFileSync(auditPath, content, "utf-8");
		} catch (error) {
			// 忽略審計寫入錯誤
			// Ignore audit write errors
			console.warn(`[MockFS] Audit write failed: ${(error as Error).message}`);
		}
	}

	// ==================== 同步讀取操作 / Sync Read Operations ====================

	/**
	 * 同步讀取文字檔案
	 * Sync read text file
	 *
	 * @param path - 檔案路徑 / File path
	 * @param encoding - 編碼（僅支援 utf-8）/ Encoding (only supports utf-8)
	 * @returns 檔案內容 / File content
	 */
	readFileSync(path: string, encoding: BufferEncoding = "utf-8"): string {
		this._ensureSafety(path);

		if (encoding !== "utf-8") {
			throw new Error(`[MockFS] 不支援的編碼: ${encoding}，僅支援 utf-8`);
		}

		const entry = this._getEntry(path);
		if (!entry || entry.type !== "file") {
			throw new Error(`[MockFS] 檔案不存在: ${path}`);
		}

		return entry.content;
	}

	/**
	 * 同步讀取 JSON 檔案
	 * Sync read JSON file
	 *
	 * @param path - 檔案路徑 / File path
	 * @returns 解析後的 JSON 物件 / Parsed JSON object
	 */
	readJsonSync<T = unknown>(path: string): T {
		const content = this.readFileSync(path);
		return JSON.parse(content) as T;
	}

	// ==================== 目錄操作 / Directory Operations ====================

	/**
	 * 同步建立目錄
	 * Sync create directory
	 *
	 * @param path - 目錄路徑 / Directory path
	 * @param recursive - 是否遞迴建立 / Whether to create recursively
	 */
	mkdirSync(path: string, recursive: boolean = true): void {
		this._ensureSafety(path);

		const normalizedPath = path.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
		const parts = normalizedPath.split(/[/\\]/).filter(Boolean);

		let current: MockDirectory = this.root;

		for (const part of parts) {
			let entry = current.entries.get(part);

			if (!entry) {
				entry = this._createDirectory();
				current.entries.set(part, entry);
			} else if (entry.type !== "directory") {
				throw new Error(`[MockFS] 路徑已存在且為檔案: ${parts.slice(0, parts.indexOf(part) + 1).join("/")}`);
			}

			current = entry as MockDirectory;
		}
	}

	/**
	 * 同步刪除檔案或目錄
	 * Sync delete file or directory
	 *
	 * @param path - 路徑 / Path
	 * @param options - 選項 / Options
	 */
	rmSync(path: string, options?: { recursive?: boolean }): void {
		this._ensureSafety(path);

		const normalizedPath = path.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
		const parts = normalizedPath.split(/[/\\]/).filter(Boolean);

		if (parts.length === 0) {
			throw new Error(`[MockFS] 無法刪除根目錄`);
		}

		// 找到父目錄
		// Find parent directory
		let current: MockFsEntry = this.root;
		for (let i = 0; i < parts.length - 1; i++) {
			if (current.type !== "directory") {
				throw new Error(`[MockFS] 路徑不存在: ${parts.slice(0, i + 1).join("/")}`);
			}
			current = current.entries.get(parts[i])!;
			if (!current) {
				throw new Error(`[MockFS] 路徑不存在: ${parts.slice(0, i + 1).join("/")}`);
			}
		}

		const parent = current as MockDirectory;
		const name = parts[parts.length - 1];
		const entry = parent.entries.get(name);

		if (!entry) {
			// 項目不存在，視為成功（符合 Unix rm 行為）
			// Item doesn't exist, treat as success (matches Unix rm behavior)
			return;
		}

		if (entry.type === "directory") {
			// 如果目錄有內容且沒有 recursive 選項，拋出錯誤
			// If directory has content and no recursive option, throw error
			const dir = entry as MockDirectory;
			if (dir.entries.size > 0 && !options?.recursive) {
				throw new Error(`[MockFS] 路徑是目錄且不為空: ${path}`);
			}
			// 空目錄可以被刪除（符合 rmdir 行為）
			// Empty directory can be deleted (matches rmdir behavior)
		}

		parent.entries.delete(name);
		parent.modifiedAt = new Date();
	}

	/**
	 * 同步複製檔案或目錄
	 * Sync copy file or directory
	 *
	 * @param src - 來源路徑 / Source path
	 * @param dest - 目標路徑 / Destination path
	 */
	copyFileSync(src: string, dest: string): void {
		this._ensureSafety(src);
		this._ensureSafety(dest);

		const content = this.readFileSync(src);
		this.writeFileSync(dest, content);
	}

	// ==================== 查詢操作 / Query Operations ====================

	/**
	 * 同步檢查路徑是否存在
	 * Sync check if path exists
	 *
	 * @param path - 路徑 / Path
	 * @returns 是否存在 / Whether exists
	 */
	existsSync(path: string): boolean {
		// 不對 existsSync 做安全檢查，因為檢查路徑是否存在本身是安全的
		// Don't safety check existsSync because checking if a path exists is safe itself
		try {
			const entry = this._getEntry(path);
			return entry !== undefined;
		} catch {
			return false;
		}
	}

	/**
	 * 同步檢查路徑是否為目錄
	 * Sync check if path is directory
	 *
	 * @param path - 路徑 / Path
	 * @returns 是否為目錄 / Whether is directory
	 */
	isDirectory(path: string): boolean {
		const entry = this._getEntry(path);
		return entry?.type === "directory";
	}

	/**
	 * 同步檢查路徑是否為檔案
	 * Sync check if path is file
	 *
	 * @param path - 路徑 / Path
	 * @returns 是否為檔案 / Whether is file
	 */
	isFile(path: string): boolean {
		const entry = this._getEntry(path);
		return entry?.type === "file";
	}

	/**
	 * 同步列出目錄內容
	 * Sync list directory contents
	 *
	 * @param path - 目錄路徑 / Directory path
	 * @returns 項目名稱陣列 / Array of entry names
	 */
	readdirSync(path: string): string[] {
		this._ensureSafety(path);

		const entry = this._getEntry(path);
		if (!entry || entry.type !== "directory") {
			throw new Error(`[MockFS] 目錄不存在: ${path}`);
		}

		return Array.from(entry.entries.keys());
	}

	/**
	 * 同步取得檔案狀態
	 * Sync get file status
	 *
	 * @param path - 路徑 / Path
	 * @returns 檔案狀態 / File status
	 */
	statSync(path: string): {
		isFile: boolean;
		isDirectory: boolean;
		size: number;
		createdAt: Date;
		modifiedAt: Date;
	} {
		this._ensureSafety(path);

		const entry = this._getEntry(path);
		if (!entry) {
			throw new Error(`[MockFS] 路徑不存在: ${path}`);
		}

		return {
			isFile: entry.type === "file",
			isDirectory: entry.type === "directory",
			size: entry.type === "file" ? entry.content.length : 0,
			createdAt: entry.createdAt,
			modifiedAt: entry.modifiedAt,
		};
	}

	// ==================== 批次操作 / Batch Operations ====================

	/**
	 * 批次設定檔案（用於測試初始化）
	 * Batch set files (for test initialization)
	 *
	 * @param files - 檔案映射 / Files mapping
	 *
	 * @example
	 * ```typescript
	 * mockFs.setFiles({
	 *   "/test/config.json": '{"key": "value"}',
	 *   "/test/data.txt": "Hello World",
	 * });
	 * ```
	 */
	setFiles(files: Record<string, string>): void {
		for (const [path, content] of Object.entries(files)) {
			this.writeFileSync(path, content);
		}
	}

	/**
	 * 清除所有檔案（重置 MockFS）
	 * Clear all files (reset MockFS)
	 */
	clear(): void {
		this.root.entries.clear();
	}

	// ==================== 審計操作 / Audit Operations ====================

	/**
	 * 是否啟用審計模式
	 * Is audit mode enabled
	 */
	get isAuditEnabled(): boolean {
		return this.options.auditEnabled && this.options.auditDir !== null;
	}

	/**
	 * 啟用審計模式
	 * Enable audit mode
	 *
	 * @param patterns 可選的 pattern 陣列，用於覆蓋現有的 auditPatterns / Optional pattern array to override existing auditPatterns
	 */
	enableAudit(patterns?: string[]): void {
		this.options.auditEnabled = true;
		if (patterns && patterns.length > 0) {
			this.options.auditPatterns = patterns;
		}
	}

	/**
	 * 停用審計模式
	 * Disable audit mode
	 */
	disableAudit(): void {
		this.options.auditEnabled = false;
	}

	/**
	 * 檢查 Audit Mode 是否啟用
	 * Check if Audit Mode is enabled
	 */
	isAuditModeEnabled(): boolean {
		return this.options.auditEnabled;
	}

	/**
	 * 取得審計目錄路徑
	 * Get audit directory path
	 */
	get auditDir(): string | null {
		return this.options.auditDir;
	}

	/**
	 * 設定審計目錄
	 * Set audit directory
	 *
	 * 設定後，所有檔案變更會同步寫入該目錄（需搭配 enableAudit() 啟用）
	 * After setting, all file changes will be synced to this directory (use with enableAudit())
	 *
	 * @param dir - 審計目錄路徑 / Audit directory path
	 */
	setAuditDir(dir: string | null): void {
		this.options.auditDir = dir;

		// 如果設定了目錄，立即建立目錄結構
		// If directory is set, create directory structure immediately
		if (dir) {
			try {
				fsExtra.ensureDirSync(dir);
			} catch {
				// 忽略錯誤
			}
		}
	}

	/**
	 * 取得 Audit patterns
	 * Get Audit patterns
	 *
	 * @returns 目前設定的 micromatch patterns 陣列 / Current micromatch patterns array
	 */
	getAuditPatterns(): string[] {
		return [...this.options.auditPatterns];
	}

	/**
	 * 更新 Audit patterns
	 * Update Audit patterns
	 *
	 * @param patterns Micromatch patterns 陣列 / Micromatch patterns array
	 */
	setAuditPatterns(patterns: string[]): void {
		this.options.auditPatterns = patterns;
	}

	/**
	 * 取得審計目錄中的所有檔案
	 * Get all files in audit directory
	 *
	 * @returns 檔案路徑列表 / List of file paths
	 */
	getAuditFiles(): string[] {
		if (!this.options.auditDir) {
			return [];
		}

		try {
			const files: string[] = [];
			const collectFiles = (dir: string, base: string) => {
				const entries = fsExtra.readdirSync(dir);
				for (const entry of entries) {
					const fullPath = `${dir}/${entry}`;
					const relativePath = `${base}/${entry}`;
					const stat = fsExtra.statSync(fullPath);
					if (stat.isDirectory()) {
						collectFiles(fullPath, relativePath);
					} else {
						files.push(relativePath);
					}
				}
			};
			collectFiles(this.options.auditDir, "");
			return files;
		} catch {
			return [];
		}
	}

	/**
	 * 讀取審計檔案內容
	 * Read audit file content
	 *
	 * @param mockPath - MockFS 中的檔案路徑 / File path in MockFS
	 * @returns 檔案內容或 null / File content or null
	 */
	readAuditFile(mockPath: string): string | null {
		if (!this.options.auditDir) {
			return null;
		}

		try {
			const auditPath = `${this.options.auditDir}${mockPath}`;
			return fsExtra.readFileSync(auditPath, "utf-8");
		} catch {
			return null;
		}
	}

	/**
	 * 清除審計目錄
	 * Clear audit directory
	 */
	clearAuditDir(): void {
		if (!this.options.auditDir) return;

		try {
			fsExtra.removeSync(this.options.auditDir);
			fsExtra.ensureDirSync(this.options.auditDir);
		} catch {
			// 忽略錯誤
		}
	}

	/**
	 * 取得檔案樹的快照（用於除錯）
	 * Get file tree snapshot (for debugging)
	 *
	 * @returns 檔案樹結構 / File tree structure
	 */
	toDebugString(): string {
		const print = (entry: MockFsEntry, indent: string = ""): string => {
			if (entry.type === "file") {
				return `${indent}📄 ${entry.content.substring(0, 50)}${entry.content.length > 50 ? "..." : ""}`;
			}
			const lines: string[] = [`${indent}📁/`];
			for (const [name, child] of entry.entries) {
				lines.push(print(child, indent + "  "));
			}
			return lines.join("\n");
		};
		return print(this.root);
	}
}

/**
 * 預設的 MockFs 單例（全域共享）
 * Default MockFs singleton (globally shared)
 *
 * 用於一般測試，可直接使用而不需要每次建立新實例
 * Used for general testing, can be used directly without creating new instances each time
 */
export const defaultMockFs = new MockFs();
