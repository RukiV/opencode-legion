/**
 * 檔案系統安全檢查工具
 * File System Safety Checker
 *
 * 提供檔案路徑安全驗證，防止意外操作系統關鍵目錄
 * Provides file path safety validation to prevent accidental operations on system-critical directories
 *
 * 使用路徑工具：
 * - upath2：確保路徑格式跨平台一致（統一使用正斜線 /）
 * - path-in-dir：檢查路徑是否在指定目錄內
 * - path-is-same：比較路徑是否相同（自動解析符號連結）
 *
 * ⚠️ 安全限制：僅允許操作測試專用的安全路徑
 * ⚠️ Safety restriction: Only allow operations on test-specific safe paths
 *
 * @module test/lib/helpers/fs-safety
 */

// @noUnusedParameters:false
/// <reference types="node" />

import { resolve, isAbsolute, normalize } from "upath2";
import pathInsideDirectory from "path-in-dir";
import pathIsSame from "path-is-same";
import { __TEST_TEMP, __TEST_FIXTURES, __ROOT } from "../../../__root";

/**
 * 安全的白名單路徑前綴列表
 * Safe whitelisted path prefixes
 *
 * 這些路徑允許被讀取或寫入
 * These paths are allowed to be read or written
 */
const SAFE_PREFIXES: readonly string[] = [
	__TEST_TEMP,
	__TEST_FIXTURES,
	__ROOT,
] as const;

/**
 * 危險的系統路徑關鍵詞列表
 * Dangerous system path keywords list
 *
 * 如果路徑包含這些關鍵詞，應該被視為不安全
 * If path contains these keywords, it should be considered unsafe
 */
const DANGEROUS_KEYWORDS: readonly string[] = [
	// Windows 系統目錄
	"\\Windows\\",
	"\\Windows\\System32",
	"\\Windows\\SysWOW64",
	"\\Program Files",
	"\\Program Files (x86)",
	"\\ProgramData\\Microsoft",

	// Unix 系統目錄
	"/etc/",
	"/usr/bin/",
	"/usr/sbin/",
	"/bin/",
	"/sbin/",
	"/boot/",
	"/sys/",

	// 配置目錄（不允許直接寫入）
	"/.config/",
	"/.local/share/",
] as const;

/**
 * 路徑安全檢查結果
 * Path safety check result
 */
export interface IFsSafetyResult {
	/** 是否安全 / Whether the path is safe */
	isSafe: boolean;
	/** 原因說明 / Reason explanation */
	reason: string;
	/** 觸發的安全規則 / Triggered safety rule */
	rule: "whitelist" | "dangerous_keyword" | "outside_root" | "relative_path" | "unknown";
}

/**
 * 檢查路徑是否安全（可讀寫）
 * Check if a path is safe for read/write operations
 *
 * @param targetPath - 要檢查的路徑 / Path to check
 * @param allowRelative - 是否允許相對路徑（預設 false）/ Whether to allow relative paths (default: false)
 * @returns 路徑安全檢查結果 / Path safety check result
 *
 * @example
 * ```typescript
 * const result = checkFsSafety("/path/to/file");
 * if (!result.isSafe) {
 *   throw new Error(`Unsafe path: ${result.reason}`);
 * }
 * ```
 */
export function checkFsSafety(
	targetPath: string,
	allowRelative: boolean = false,
): IFsSafetyResult {
	/** 標準化並解析為絕對路徑 / Normalize and resolve to absolute path */
	const normalizedPath = normalize(targetPath);
	const resolvedPath = isAbsolute(targetPath)
		? normalizedPath
		: resolve(process.cwd(), normalizedPath);

	// 檢查 1：相對路徑檢查
	// Check 1: Relative path check
	if (!isAbsolute(targetPath)) {
		if (!allowRelative) {
			return {
				isSafe: false,
				reason: `相對路徑不允許直接操作: ${targetPath}`,
				rule: "relative_path",
			};
		}
	}

	// 檢查 2：白名單前綴檢查（使用 pathInsideDirectory + pathIsSame）
	// Check 2: Whitelist prefix check (using pathInsideDirectory + pathIsSame)
	for (const prefix of SAFE_PREFIXES) {
		// 使用 pathInsideDirectory 檢查路徑是否在目錄內
		// 使用 pathIsSame 檢查路徑是否等於白名單本身
		// Use pathInsideDirectory to check if path is inside directory
		// Use pathIsSame to check if path equals the whitelist itself
		const normalizedPrefix = normalize(prefix);
		if (pathInsideDirectory(resolvedPath, normalizedPrefix) || pathIsSame(resolvedPath, normalizedPrefix)) {
			return {
				isSafe: true,
				reason: `路徑在允許的白名單內: ${prefix}`,
				rule: "whitelist",
			};
		}
	}

	// 檢查 3：危險關鍵詞檢查
	// Check 3: Dangerous keyword check
	for (const keyword of DANGEROUS_KEYWORDS) {
		if (resolvedPath.toLowerCase().includes(keyword.toLowerCase())) {
			return {
				isSafe: false,
				reason: `路徑包含危險關鍵詞: ${keyword}`,
				rule: "dangerous_keyword",
			};
		}
	}

	// 檢查 4：是否在專案根目錄之外
	// Check 4: Outside project root check
	if (!resolvedPath.startsWith(__ROOT)) {
		return {
			isSafe: false,
			reason: `路徑在專案根目錄之外: ${resolvedPath}`,
			rule: "outside_root",
		};
	}

	// 預設視為不安全
	// Default to unsafe
	return {
		isSafe: false,
		reason: `路徑未通過安全檢查: ${resolvedPath}`,
		rule: "unknown",
	};
}

/**
 * 驗證路徑安全性並拋出錯誤（如果不安全）
 * Validate path safety and throw error if unsafe
 *
 * @param targetPath - 要檢查的路徑 / Path to check
 * @param operation - 操作類型描述 / Operation type description
 * @param allowRelative - 是否允許相對路徑 / Whether to allow relative paths
 * @throws Error 如果路徑不安全 / Throws Error if path is unsafe
 */
export function assertFsSafety(
	targetPath: string,
	operation: string = "file operation",
	allowRelative: boolean = false,
): asserts targetPath is string {
	const result = checkFsSafety(targetPath, allowRelative);
	if (!result.isSafe) {
		throw new Error(
			`[FsSafety] 禁止 ${operation}：${result.reason} (rule: ${result.rule})`,
		);
	}
}

/**
 * 創建帶安全檢查的檔案系統操作包裝器
 * Create file system operation wrapper with safety checks
 *
 * @param fsOperations - fs-extra 的操作物件 / fs-extra operations object
 * @returns 帶安全檢查的檔案系統操作物件 / File system operations with safety checks
 *
 * @example
 * ```typescript
 * import * as fsExtra from "fs-extra";
 * const safeFs = createSafeFsWrapper(fsExtra);
 * await safeFs.writeFile("/test/temp/file.txt", "content"); // ✅ Safe
 * await safeFs.writeFile("/etc/passwd", "content"); // ❌ Throws error
 * ```
 */
export function createSafeFsWrapper<T extends object>(fsOperations: T): T {
	const wrapper: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(fsOperations)) {
		if (typeof value === "function") {
			// 包裝函式
			// Wrap function
			wrapper[key] = function (...args: unknown[]) {
				// 檢查第一個參數是否為路徑
				// Check if first argument is a path
				const [firstArg, ...restArgs] = args;
				if (typeof firstArg === "string") {
					const operationName = key.replace(/Sync$/, "");
					assertFsSafety(firstArg, operationName);
				}
				return (value as (...args: unknown[]) => unknown).apply(fsOperations, args);
			};
		} else {
			// 非函式屬性直接複製
			// Copy non-function properties directly
			wrapper[key] = value;
		}
	}

	return wrapper as T;
}

/**
 * 取得允許的安全路徑前綴列表
 * Get list of allowed safe path prefixes
 *
 * @returns 不可變的安全路徑前綴陣列 / Immutable safe path prefixes array
 */
export function getSafePrefixes(): readonly string[] {
	return SAFE_PREFIXES;
}

/**
 * 取得危險關鍵詞列表
 * Get list of dangerous keywords
 *
 * @returns 不可變的危險關鍵詞陣列 / Immutable dangerous keywords array
 */
export function getDangerousKeywords(): readonly string[] {
	return DANGEROUS_KEYWORDS;
}
