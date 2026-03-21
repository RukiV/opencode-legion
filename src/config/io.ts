/**
 * 配置檔案讀寫操作
 * Configuration file I/O operations
 *
 * 集中管理 opencode-arise.json 與 opencode.json 的檔案讀寫邏輯
 * Centralized management of file read/write operations for opencode-arise.json and opencode.json
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { npaToDepsValue } from "@yarn-tool/npa-to-deps";

import { LEGACY_PLUGIN_NAME, PLUGIN_NAME } from "./plugin-name";
import { AriseConfigSchema, DEFAULT_CONFIG, type IAriseConfig } from "./schema";
import { findOpencodeConfig, getAriseConfigPaths } from "./paths";
import { FakeBun as Bun } from "../utils/bun-shim";

import type { PluginInput } from '@opencode-ai/plugin';
import { ITSValueOrArrayMaybeReadonly } from 'ts-type';
import { IReturnHasPlugin } from '../types/types';

type JsonObject = Record<string, unknown>;

/**
 * 深度合併兩個物件
 * Deep merge two objects
 *
 * 遞迴地合併巢狀物件，陣列會被直接替換而非合併
 * Recursively merges nested objects; arrays are replaced instead of merged
 *
 * @param base - 基礎物件（被合併的物件）
 * @param override - 覆蓋物件（優先使用的值）
 * @returns 合併後的物件
 */
export function deepMerge(base: JsonObject, override: JsonObject): JsonObject
{
	/** 複製基礎物件以避免修改原始資料 / Copy base object to avoid mutating original */
	const result: JsonObject = { ...base };

	/** 遍歷覆蓋物件的所有鍵值 / Iterate through all key-value pairs in override */
	for (const [key, value] of Object.entries(override))
	{
		/**
		 * 檢查是否需要遞迴合併
		 * Check if recursive merge is needed
		 *
		 * 條件：
		 * 1. value 是物件（不是 null，不是陣列）
		 * 2. result[key] 也是物件（不是 null，不是陣列）
		 */
		if (
			typeof value === "object" &&
			value !== null &&
			!Array.isArray(value) &&
			typeof result[key] === "object" &&
			result[key] !== null &&
			!Array.isArray(result[key])
		)
		{
			/**
			 * 遞迴合併巢狀物件
			 * Recursively merge nested objects
			 */
			result[key] = deepMerge(result[key] as JsonObject, value as JsonObject);
		}
		else
		{
			/**
			 * 直接覆蓋值（包含陣列）
			 * Direct override (including arrays)
			 *
			 * 陣列會被整個替換，不進行元素級別的合併
			 * Arrays are replaced entirely, no element-level merging
			 */
			result[key] = value;
		}
	}
	return result;
}

/**
 * 解析 JSONC（帶註解的 JSON）
 * Parse JSONC (JSON with comments)
 *
 * 支援：
 * - 單行註解 (//)
 * - 多行註解 (/* * /)
 * - 結尾逗號（自動移除）
 *
 * 使用狀態機逐字元解析，維護三個狀態標誌：
 * 1. inString - 目前是否在字串內部
 * 2. inSingleLineComment - 目前是否在單行註解內
 * 3. inMultiLineComment - 目前是否在多行註解內
 *
 * Uses state machine to parse character by character, maintaining three state flags:
 * 1. inString - currently inside a string
 * 2. inSingleLineComment - currently inside a single-line comment
 * 3. inMultiLineComment - currently inside a multi-line comment
 *
 * @param content - JSONC 內容
 * @returns 解析後的物件
 */
export function parseJsonc(content: string): unknown
{
	let result = "";
	let inString = false;
	let inSingleLineComment = false;
	let inMultiLineComment = false;
	let i = 0;

	/**
	 * 主解析迴圈
	 * Main parsing loop
	 *
	 * 逐字元處理，根據狀態標誌決定如何處理每個字元
	 * Process each character one by one, deciding how to handle based on state flags
	 */
	while (i < content.length)
	{
		const char = content[i];
		const nextChar = content[i + 1];

		/**
		 * 狀態 1: 單行註解內
		 * State 1: Inside single-line comment
		 *
		 * 跳過所有字元直到遇到換行符
		 * Skip all characters until newline is encountered
		 */
		if (inSingleLineComment)
		{
			if (char === "\n")
			{
				/** 換行結束單行註解 / Newline ends single-line comment */
				inSingleLineComment = false;
				result += char;
			}
			i++;
			continue;
		}

		/**
		 * 狀態 2: 多行註解內
		 * State 2: Inside multi-line comment
		 *
		 * 跳過所有字元直到遇到 *+
		 * Skip all characters until *+
		 */
		if (inMultiLineComment)
		{
			if (char === "*" && nextChar === "/")
			{
				/** 找到 *+ 結束多行註解 / Found *+ to end multi-line comment */
				inMultiLineComment = false;
				i += 2;
				continue;
			}
			i++;
			continue;
		}

		/**
		 * 狀態 3: 字串內部
		 * State 3: Inside string
		 *
		 * 保留所有字元（包含註解符號），處理轉義序列
		 * Keep all characters (including comment markers), handle escape sequences
		 */
		if (inString)
		{
			result += char;

			/**
			 * 處理轉義序列（如 \"、\\）
			 * Handle escape sequences (like \", \\)
			 *
			 * 轉義時需要將下一個字元一起加入結果
			 * When escaping, need to include the next character in result
			 */
			if (char === "\\")
			{
				result += nextChar ?? "";
				i += 2;
				continue;
			}

			/** 雙引號結束字串 / Closing quote ends string */
			if (char === '"')
			{
				inString = false;
			}
			i++;
			continue;
		}

		/** 雙引號開始字串 / Opening quote starts string */
		if (char === '"')
		{
			inString = true;
			result += char;
			i++;
			continue;
		}

		/** 單行註解開始 / Start of single-line comment */
		if (char === "/" && nextChar === "/")
		{
			inSingleLineComment = true;
			i += 2;
			continue;
		}

		/** 多行註解開始 / Start of multi-line comment */
		if (char === "/" && nextChar === "*")
		{
			inMultiLineComment = true;
			i += 2;
			continue;
		}

		/** 普通字元，直接保留 / Regular character, keep it */
		result += char;
		i++;
	}

	/**
	 * 移除結尾逗號
	 * Remove trailing commas
	 *
	 * 正規表達式說明：
	 * /,(\s*[}\]])/g 匹配逗號後跟空白（可選）再跟 } 或 ]
	 * Replacement "$1" 只保留 } 或 ]
	 *
	 * Regex explanation:
	 * /,(\s*[}\]])/g matches comma followed by optional whitespace then } or ]
	 * Replacement "$1" keeps only } or ]
	 */
	result = result.replace(/,(\s*[}\]])/g, "$1");

	/** 使用標準 JSON.parse 完成解析 / Use standard JSON.parse to complete parsing */
	return JSON.parse(result);
}

/**
 * 讀取 OpenCode 配置檔案
 * Read OpenCode config file
 *
 * @param configPath - 配置檔案路徑（可選）
 * @returns 解析後的配置物件，若讀取失敗則返回 null
 */
export function readOpencodeConfig(configPath?: string): JsonObject | null
{
	const path = configPath ?? findOpencodeConfig();
	if (!path)
	{
		return null;
	}

	try
	{
		const content = readFileSync(path, "utf-8");
		return parseJsonc(content) as JsonObject;
	}
	catch
	{
		return null;
	}
}

/**
 * 寫入 OpenCode 配置檔案
 * Write OpenCode config file
 *
 * @param configPath - 配置檔案路徑
 * @param config - 要寫入的配置物件
 * @returns 是否成功寫入
 */
export function writeOpencodeConfig(configPath: string, config: JsonObject): boolean
{
	try
	{
		writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
		return true;
	}
	catch
	{
		return false;
	}
}

/**
 * 插件註冊結果
 * Plugin registration result
 */
export interface IPluginRegistrationResult
{
	success: boolean;
	isRegistered: boolean;
	hasLegacyPlugin: boolean;
	legacyPluginNames: string[];
}

/**
 * 使用 npaToDepsValue 比對插件名稱
 * Compare plugin names using npaToDepsValue
 *
 * npaToDepsValue() 回傳 { name, semver, ... } 物件
 * 其中 name 為正規化後的套件名稱（不包含版本）
 *
 * 例如：
 * - npaToDepsValue('@bluelovers/opencode-arise').name => '@bluelovers/opencode-arise'
 * - npaToDepsValue('opencode-arise').name => 'opencode-arise'
 *
 * 這確保即使是攜帶版本號的插件名稱也能正確匹配
 * This ensures plugin names with version numbers can be matched correctly
 *
 * @param name1 - 原始插件名稱（可包含版本或其他修飾符）
 * @param name2 - 比對目標插件名稱
 * @returns 名稱是否匹配
 */
export function isPluginNameMatch(name1: string, name2: string): boolean
{
	try
	{
		/**
		 * 嘗試正規化並比對
		 * Try to normalize and compare
		 *
		 * 成功時比較正規化後的名稱
		 * Compare normalized names on success
		 */
		return npaToDepsValue(name1).name === name2;
	}
	catch
	{
		/**
		 * 正規化失敗時使用簡單字串比對
		 * Fall back to simple string comparison on normalization failure
		 *
		 * 這發生在輸入不是有效的 npm 套件名稱時
		 * This happens when input is not a valid npm package name
		 */
		return name1 === name2;
	}
}



/**
 * 檢查 config.plugin 是否包含指定插件
 * Check if config.plugin contains the specified plugin(s)
 *
 * @param pluginList - config.plugin 陣列
 * @param pluginNames - 插件名稱（支援 string 或 string[]）
 * @returns 以插件名稱為 key 的結果物件，值為 undefined | string[]
 *
 * @example
 * // 返回值為 undefined | string[]
 * // undefined = 未註冊，string[] = 已註冊（包含實際匹配的插件名）
 * const result = hasPlugin(pluginList, PLUGIN_NAME);
 *
 * // 推薦的驗證方式 / Recommended validation:
 * if (result[PLUGIN_NAME]?.length) {
 *   // 插件已註冊
 * }
 *
 * // 取得實際匹配的插件名稱 / Get actual matched plugin names:
 * const matchedNames = result[PLUGIN_NAME]; // string[] | undefined
 */
/**
 * 檢查 config.plugin 是否包含指定插件
 * Check if config.plugin contains the specified plugin(s)
 *
 * 使用 O(n*m) 演算法逐一比對插件清單與目標名稱
 * Uses O(n*m) algorithm to compare plugin list with target names one by one
 *
 * @param pluginList - config.plugin 陣列
 * @param pluginNames - 插件名稱（支援 string 或 string[]）
 * @returns 以插件名稱為 key 的結果物件，值為 undefined | string[]
 *
 * @example
 * // 返回值為 undefined | string[]
 * // undefined = 未註冊，string[] = 已註冊（包含實際匹配的插件名）
 * const result = hasPlugin(pluginList, PLUGIN_NAME);
 *
 * // 推薦的驗證方式 / Recommended validation:
 * if (result[PLUGIN_NAME]?.length) {
 *   // 插件已註冊
 * }
 *
 * // 取得實際匹配的插件名稱 / Get actual matched plugin names:
 * const matchedNames = result[PLUGIN_NAME]; // string[] | undefined
 */
export function hasPlugin<T extends string>(pluginList: ITSValueOrArrayMaybeReadonly<NoInfer<T> | string>, pluginNames: ITSValueOrArrayMaybeReadonly<T>): IReturnHasPlugin<T>
{
	/**
	 * 將 pluginNames 轉換為 Set 以最佳化查詢
	 * Convert pluginNames to Set for optimized lookup
	 */
	const names = new Set(Array.isArray(pluginNames) ? pluginNames : [pluginNames]) as Set<T>;
	const result: IReturnHasPlugin<T> = {} as any;

	/**
	 * 雙層迴圈比對插件
	 * Double loop to match plugins
	 *
	 * 外層：遍歷插件清單
	 * 內層：遍歷目標名稱
	 */
	for (const plugin of pluginList)
	{
		for (const name of names)
		{
			if (isPluginNameMatch(plugin, name))
			{
				/** 初始化陣列（使用 ??= 避免覆蓋已存在的匹配）/ Initialize array (using ??= to avoid overwriting existing matches) */
				result[name] ??= [];
				/** 記錄實際匹配的插件名稱（可能包含版本號）/ Record actual matched plugin name (may include version) */
				result[name].push(plugin);
			}
		}
	}

	return result;
}

/**
 * 此函數從 hasPlugin 的返回結果判斷指定插件是否已註冊
 * This function determines if specified plugin is registered from hasPlugin result
 *
 * 設計邏輯：
 * hasPlugin 返回 { [pluginName]: string[] | undefined }
 * - undefined = 未註冊
 * - string[]（length > 0）= 已註冊
 *
 * Design logic:
 * hasPlugin returns { [pluginName]: string[] | undefined }
 * - undefined = not registered
 * - string[] (length > 0) = registered
 *
 * @param result - hasPlugin 函數的返回結果
 * @param pluginName - 要檢查的插件名稱
 * @returns 是否已註冊
 *
 * @example
 * const checkResult = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
 * const isRegistered = isPluginRegisteredFromResult(checkResult, PLUGIN_NAME);
 */
export function isPluginRegisteredFromResult<T extends string>(result: IReturnHasPlugin<any>, pluginName: T): result is {
	[key in T]: string[];
}
{
	/**
	 * 安全取值：undefined?.length 為 undefined，?? 0 轉為 0
	 * Safe access: undefined?.length is undefined, ?? 0 converts to 0
	 *
	 * 當 pluginName 有匹配時，length > 0，回傳 true
	 * 當 pluginName 無匹配時，length 為 0，回傳 false
	 */
	return (result[pluginName]?.length ?? 0) > 0;
}

/**
 * 此函數將 hasPlugin 的返回結果轉換為舊版插件名稱陣列
 * This function converts hasPlugin result to legacy plugin names array
 *
 * 邏輯說明：
 * 1. 首先檢查 LEGACY_PLUGIN_NAME 是否與 PLUGIN_NAME 不同
 * 2. 只有當兩者不同時，才有意義區分「舊版插件」
 * 3. 若兩者相同，表示不存在「舊版」的概念，應回傳空陣列
 *
 * Logic explanation:
 * 1. First check if LEGACY_PLUGIN_NAME differs from PLUGIN_NAME
 * 2. Only when they differ, does it make sense to distinguish "legacy plugins"
 * 3. If they are the same, there is no "legacy" concept, return empty array
 *
 * @param result - hasPlugin 函數的返回結果
 * @returns 舊版插件名稱陣列
 *
 * @example
 * const checkResult = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
 * const legacyNames = getLegacyPluginNamesFromResult(checkResult);
 */
export function getLegacyPluginNamesFromResult(result: IReturnHasPlugin<string>): string[]
{
	/**
	 * 條件判斷：確保新舊插件名稱確實不同
	 * Conditional check: ensure new and legacy plugin names are indeed different
	 *
	 * 若名稱相同，則不存在「舊版」概念，回傳空陣列
	 * If names are the same, there is no "legacy" concept, return empty array
	 *
	 * 使用 `as any` 繞過 TypeScript 推導
	 * 因為 TS 知道這兩個 const 永遠不同，但 runtime 可能會變化
	 *
	 * 短路運算：(condition && value) || default
	 * - 當 condition 為 true，回傳 value（legacy 名稱陣列）
	 * - 當 condition 為 false，回傳 []（預設值）
	 */
	return (LEGACY_PLUGIN_NAME !== PLUGIN_NAME as any) && result[LEGACY_PLUGIN_NAME] || [];
}

/**
 * 檢查插件註冊狀態（含舊版插件偵測）
 * Check plugin registration status (including legacy plugin detection)
 *
 * 使用 hasPlugin 一次性查詢 PLUGIN_NAME 和 LEGACY_PLUGIN_NAME
 * Uses hasPlugin to query PLUGIN_NAME and LEGACY_PLUGIN_NAME in one call
 *
 * 舊版插件偵測邏輯：
 * - 如果一個插件同時匹配新舊名稱，則視為新版
 * - 只有只匹配舊版名稱的插件才被視為舊版插件
 *
 * Legacy plugin detection logic:
 * - If a plugin matches both new and legacy names, it's considered new
 * - Only plugins that only match the legacy name are considered legacy plugins
 *
 * @param configPath - OpenCode 配置檔案路徑
 * @returns 註冊結果，包含 success、isRegistered、hasLegacyPlugin、legacyPluginNames
 */
export function checkPluginRegistration(configPath: string): IPluginRegistrationResult
{
	/** 讀取 OpenCode 配置檔案 / Read OpenCode config file */
	const config = readOpencodeConfig(configPath);

	/**
	 * 配置讀取失敗時返回失敗結果
	 * Return failure when config read fails
	 */
	if (!config)
	{
		return {
			success: false
		} satisfies Partial<IPluginRegistrationResult> as any;
	}

	/** 取得插件列表，確保為陣列類型 / Get plugin list, ensure it's an array */
	const pluginList = (config.plugin as string[]) ?? [];

	/** 一次性檢查新舊插件名稱是否已註冊 / Check both new and legacy plugin names in one call */
	const checkResult = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

	/** 使用工具函數判斷插件是否已註冊 / Use utility function to check if plugin is registered */
	const isRegistered = isPluginRegisteredFromResult(checkResult, PLUGIN_NAME);

	/** 使用工具函數取得舊版插件名稱 / Use utility function to get legacy plugin names */
	const legacyPluginNames = getLegacyPluginNamesFromResult(checkResult);

	const hasLegacyPlugin = legacyPluginNames.length > 0;

	return {
		success: true,
		isRegistered,
		hasLegacyPlugin,
		legacyPluginNames,
	};
}

/**
 * 註冊 plugin 至 OpenCode 配置
 * Register plugin to OpenCode config
 *
 * @param configPath - OpenCode 配置檔案路徑
 * @returns 是否成功註冊
 */
export function registerPlugin(configPath: string): boolean
{
	const config = readOpencodeConfig(configPath);
	if (!config)
	{
		return false;
	}

	try
	{
		if (!config.plugin)
		{
			config.plugin = [];
		}

		const pluginList = config.plugin as string[];
		/**
		 * 檢查插件是否已註冊
		 * Check if plugin is already registered
		 *
		 * hasPlugin 返回 string[] | undefined，若存在（length > 0）表示已註冊
		 * hasPlugin returns string[] | undefined, if exists (length > 0) means already registered
		 *
		 * @see hasPlugin 的推薦使用方式 / See recommended usage of hasPlugin
		 */
		if (hasPlugin(pluginList, PLUGIN_NAME)[PLUGIN_NAME]?.length)
		{
			return true;
		}

		pluginList.push(PLUGIN_NAME);
		return writeOpencodeConfig(configPath, config);
	}
	catch
	{
		return false;
	}
}

export function loadAriseConfig(ctx: PluginInput)
{
	return loadAriseConfigByPath(ctx.worktree);
}

/**
 * 使用 Bun.file() 載入 Arise 配置（非同步版本）
 * Load Arise config using Bun.file() (async version)
 *
 * 依序搜尋以下路徑並深度合併：
 * 1. ~/.config/opencode/opencode-arise.json (全域)
 * 2. {worktree}/.opencode/opencode-arise.json (局部，優先)
 *
 * 使用路徑反轉確保局部設定優先於全域設定
 * Uses path reversal to ensure local settings take precedence over global settings
 *
 * @param worktree - 工作目錄路徑
 * @returns 解析並驗證後的 AriseConfig
 */
export async function loadAriseConfigByPath(worktree?: string): Promise<IAriseConfig>
{
	const paths = getAriseConfigPaths(worktree);

	/** 以預設配置為基礎進行合併 / Start with default config as base for merging */
	let merged: JsonObject = { ...DEFAULT_CONFIG };

	/**
	 * 反轉路徑順序以確保全域設定先被套用，局部設定後被套用（覆蓋）
	 * Reverse path order to ensure global settings are applied first, local settings override
	 *
	 * 例如：paths = [global, local]，reverse 後 = [local, global]
	 * 合併時 local 會覆蓋 global 的同名設定
	 */
	for (const path of paths.reverse())
	{
		try
		{
			const file = Bun.file(path);
			if (await file.exists())
			{
				/** 讀取並解析配置文件 / Read and parse config file */
				const content = await file.text();
				const parsed = JSON.parse(content);
				/** 深度合併配置 / Deep merge configuration */
				merged = deepMerge(merged, parsed);
			}
		}
		catch
		{
			// Config file doesn't exist or is invalid, continue
		}
	}

	/**
	 * 使用 Zod schema 驗證合併後的配置
	 * Validate merged configuration using Zod schema
	 *
	 * safeParse 不會拋出異常，只會返回 success/failure
	 * safeParse doesn't throw, only returns success/failure
	 */
	const result = AriseConfigSchema.safeParse(merged);
	if (!result.success)
	{
		/**
		 * 配置驗證失敗時輸出警告並回退至預設值
		 * Output warning and fallback to defaults on validation failure
		 *
		 * 這確保插件在配置錯誤時仍能正常運作
		 * This ensures the plugin still works when config has errors
		 */
		console.warn("[opencode-arise] Invalid config, using defaults:", result.error.message);
		return DEFAULT_CONFIG;
	}

	return result.data;
}

/**
 * 使用 fs 同步讀取 Arise 配置（同步版本）
 * Load Arise config using fs (synchronous version)
 *
 * 與 loadAriseConfigByPath 功能相同，但使用同步 API
 * Identical to loadAriseConfigByPath but uses synchronous API
 *
 * 適用於需要在同步上下文中載入配置的場景
 * Useful for scenarios where config needs to be loaded in synchronous context
 *
 * @param worktree - 工作目錄路徑
 * @returns 解析並驗證後的 AriseConfig
 */
export function loadAriseConfigSync(worktree?: string): IAriseConfig
{
	const paths = getAriseConfigPaths(worktree);

	/** 以預設配置為基礎進行合併 / Start with default config as base for merging */
	let merged: JsonObject = { ...DEFAULT_CONFIG };

	/**
	 * 反轉路徑順序以確保全域設定先被套用，局部設定後被套用（覆蓋）
	 * Reverse path order to ensure global settings are applied first, local settings override
	 */
	for (const path of paths.reverse())
	{
		try
		{
			if (existsSync(path))
			{
				/** 使用 fs.readFileSync 同步讀取 / Use fs.readFileSync for synchronous reading */
				const content = readFileSync(path, "utf-8");
				const parsed = JSON.parse(content);
				/** 深度合併配置 / Deep merge configuration */
				merged = deepMerge(merged, parsed);
			}
		}
		catch
		{
			// Config file doesn't exist or is invalid, continue
		}
	}

	/**
	 * 使用 Zod schema 驗證合併後的配置
	 * Validate merged configuration using Zod schema
	 */
	const result = AriseConfigSchema.safeParse(merged);
	if (!result.success)
	{
		/** 配置驗證失敗時輸出警告並回退至預設值 / Output warning and fallback to defaults on validation failure */
		console.warn("[opencode-arise] Invalid config, using defaults:", result.error.message);
		return DEFAULT_CONFIG;
	}

	return result.data;
}
