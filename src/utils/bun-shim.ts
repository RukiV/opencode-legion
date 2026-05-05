/**
 * Bun API 偽裝類
 * Bun API Shim - Provides Bun.file() compatibility using fs-extra
 *
 * 用於在非 Bun 環境中模擬 Bun 的文件操作 API
 * Used to simulate Bun's file operations API in non-Bun environments
 */

import { pathExists, readFile } from "fs-extra";
import { createJsonHandler } from "./config/jsonc";

/**
 * Bun 文件物件介面
 * Bun file object interface
 *
 * 模擬 Bun.file() 返回的檔案物件
 * Simulates the file object returned by Bun.file()
 */
export interface IBunFile
{
	/** 檔案路徑 / File path */
	readonly path: string;

	/**
	 * 檢查檔案是否存在
	 * Check if file exists
	 *
	 * @returns Promise<boolean> - 檔案是否存在
	 */
	exists(): Promise<boolean>;

	/**
	 * 讀取檔案內容為文字
	 * Read file content as text
	 *
	 * @returns Promise<string> - 檔案內容
	 */
	text(): Promise<string>;

	/**
	 * 讀取檔案內容為 JSON
	 * Read file content as JSON
	 *
	 * @returns Promise<unknown> - 解析後的 JSON 物件
	 */
	json(): Promise<unknown>;

	/**
	 * 讀取檔案內容為 ArrayBuffer
	 * Read file content as ArrayBuffer
	 *
	 * @returns Promise<ArrayBuffer> - 檔案內容的 ArrayBuffer
	 */
	arrayBuffer(): Promise<ArrayBuffer>;

	/**
	 * 讀取檔案內容為 Blob
	 * Read file content as Blob
	 *
	 * @returns Promise<Blob> - 檔案內容的 Blob
	 */
	blob(): Promise<Blob>;
}

/**
 * Bun 偽裝類
 * Bun Shim Class
 *
 * 提供 Bun 全域物件的相容實現
 * Provides compatible implementation of Bun global object
 */
class BunShim
{
	/**
	 * 建立檔案物件
	 * Create file object
	 *
	 * 模擬 Bun.file() 方法，返回具有檔案操作能力的物件
	 * Simulates Bun.file() method, returns an object with file operations
	 *
	 * @param path - 檔案路徑 / File path
	 * @returns 檔案物件 / File object
	 */
	file(path: string): IBunFile
	{
		return new BunFile(path);
	}
}

/**
 * 檔案物件實現
 * File Object Implementation
 *
 * 實現 Bun 文件物件的所有必要方法
 * Implements all necessary methods of Bun file object
 */
export class BunFile implements IBunFile
{
	/** 檔案路徑 / File path */
	protected readonly _path: string;

	/**
	 * 建構子
	 * Constructor
	 *
	 * @param path - 檔案路徑 / File path
	 */
	constructor(path: string)
	{
		this._path = path;
	}

	/**
	 * 取得檔案路徑
	 * Get file path
	 */
	get path(): string
	{
		return this._path;
	}

	/**
	 * 檢查檔案是否存在
	 * Check if file exists
	 *
	 * 使用 fs-extra 的 pathExists 方法
	 * Uses fs-extra's pathExists method
	 *
	 * @returns Promise<boolean> - 檔案是否存在
	 */
	async exists(): Promise<boolean>
	{
		return pathExists(this._path);
	}

	/**
	 * 讀取檔案內容為文字
	 * Read file content as text
	 *
	 * 使用 fs-extra 的 readFile 方法，以 UTF-8 編碼讀取
	 * Uses fs-extra's readFile method with UTF-8 encoding
	 *
	 * @returns Promise<string> - 檔案內容
	 */
	async text(): Promise<string>
	{
		return readFile(this._path, "utf-8");
	}

	/**
	 * 讀取檔案內容為 JSON
	 * Read file content as JSON
	 *
	 * 讀取檔案後自動解析為 JSON（支援 JSONC）
	 * Reads file and automatically parses as JSON (supports JSONC)
	 *
	 * @returns Promise<unknown> - 解析後的 JSON 物件
	 */
	async json(): Promise<unknown>
	{
		const content = await this.text();
		// 使用 JsonHandler 解析，支援註解和尾隨逗號
		const handler = createJsonHandler(content);
		return handler.valueOf();
	}

	/**
	 * 讀取檔案內容為 ArrayBuffer
	 * Read file content as ArrayBuffer
	 *
	 * 將檔案內容轉換為 ArrayBuffer
	 * Converts file content to ArrayBuffer
	 *
	 * @returns Promise<ArrayBuffer> - 檔案內容的 ArrayBuffer
	 */
	async arrayBuffer(): Promise<ArrayBuffer>
	{
		const buffer = await readFile(this._path);
		return buffer.buffer.slice(
			buffer.byteOffset,
			buffer.byteOffset + buffer.byteLength,
		);
	}

	/**
	 * 讀取檔案內容為 Blob
	 * Read file content as Blob
	 *
	 * 將檔案內容轉換為 Blob
	 * Converts file content to Blob
	 *
	 * @returns Promise<Blob> - 檔案內容的 Blob
	 */
	async blob(): Promise<Blob>
	{
		const buffer = await readFile(this._path);
		return new Blob([buffer]);
	}
}

/**
 * 建立 Bun 偽裝實例
 * Create Bun shim instance
 *
 * @returns BunShim - Bun 偽裝類實例
 */
function createBunShim(): BunShim
{
	return new BunShim();
}

/**
 * 原始 Bun 物件（若存在）
 * Original Bun object (if exists)
 *
 * 若環境中已有 Bun，則導出以供備用
 * Exports original Bun if available in environment for backup
 */
// @ts-ignore
// export const OriginalBun = typeof Bun !== "undefined" ? Bun : undefined;

/**
 * 預設導出的 Bun 偽裝實例
 * Default export Bun shim instance
 *
 * 可直接使用 `import { Bun } from "./bun-shim"` 取代原始的 `Bun`
 * Can directly use `import { Bun } from "./bun-shim"` to replace original `Bun`
 */
export const FakeBun = createBunShim();
