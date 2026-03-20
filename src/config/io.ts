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
 * @param base - 基礎物件
 * @param override - 覆蓋物件
 * @returns 合併後的物件
 */
export function deepMerge(base: JsonObject, override: JsonObject): JsonObject
{
	const result: JsonObject = { ...base };
	for (const [key, value] of Object.entries(override))
	{
		if (
			typeof value === "object" &&
			value !== null &&
			!Array.isArray(value) &&
			typeof result[key] === "object" &&
			result[key] !== null &&
			!Array.isArray(result[key])
		)
		{
			result[key] = deepMerge(result[key] as JsonObject, value as JsonObject);
		}
		else
		{
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
 * - 結尾逗號
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

	while (i < content.length)
	{
		const char = content[i];
		const nextChar = content[i + 1];

		if (inSingleLineComment)
		{
			if (char === "\n")
			{
				inSingleLineComment = false;
				result += char;
			}
			i++;
			continue;
		}

		if (inMultiLineComment)
		{
			if (char === "*" && nextChar === "/")
			{
				inMultiLineComment = false;
				i += 2;
				continue;
			}
			i++;
			continue;
		}

		if (inString)
		{
			result += char;
			if (char === "\\")
			{
				result += nextChar ?? "";
				i += 2;
				continue;
			}
			if (char === '"')
			{
				inString = false;
			}
			i++;
			continue;
		}

		if (char === '"')
		{
			inString = true;
			result += char;
			i++;
			continue;
		}

		if (char === "/" && nextChar === "/")
		{
			inSingleLineComment = true;
			i += 2;
			continue;
		}

		if (char === "/" && nextChar === "*")
		{
			inMultiLineComment = true;
			i += 2;
			continue;
		}

		result += char;
		i++;
	}

	result = result.replace(/,(\s*[}\]])/g, "$1");

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
 * @param name1 - 原始插件名稱（可包含版本或其他修飾符）
 * @param name2 - 比對目標插件名稱
 * @returns 名稱是否匹配
 */
export function isPluginNameMatch(name1: string, name2: string): boolean
{
	try
	{
		return npaToDepsValue(name1).name === name2;
	}
	catch
	{
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
export function hasPlugin<T extends string>(pluginList: ITSValueOrArrayMaybeReadonly<NoInfer<T> | string>, pluginNames: ITSValueOrArrayMaybeReadonly<T>): IReturnHasPlugin<T>
{
	const names = new Set(Array.isArray(pluginNames) ? pluginNames : [pluginNames]) as Set<T>;
	const result: IReturnHasPlugin<T> = {} as any;

	for (const plugin of pluginList)
	{
		for (const name of names)
		{
			if (isPluginNameMatch(plugin, name))
			{
				result[name] ??= [];
				result[name].push(plugin);
			}
		}
	}

	return result;
}

/**
 * 檢查插件註冊狀態（含舊版插件偵測）
 * Check plugin registration status (including legacy plugin detection)
 *
 * 使用 hasPlugin 一次性查詢 PLUGIN_NAME 和 LEGACY_PLUGIN_NAME
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

	/**
	 * 從 hasPlugin 返回值判斷插件是否已註冊
	 * null = 未註冊，string[] = 已註冊（包含實際使用的插件名）
	 * Determine if plugin is registered from hasPlugin return value
	 * null = not registered, string[] = registered (contains actual plugin names used)
	 */
	const isRegistered = checkResult[PLUGIN_NAME]?.length! > 0;

	/**
	 * 過濾出真正的舊版插件名稱
	 * Filter to get only legacy plugin names
	 *
	 * 從 LEGACY_PLUGIN_NAME 結果中排除與 PLUGIN_NAME 匹配的項目
	 * 例如：'opencode-arise' 可能同時匹配舊版和新版名稱
	 * Exclude items matching PLUGIN_NAME from LEGACY_PLUGIN_NAME results
	 * e.g., 'opencode-arise' may match both legacy and new names
	 */
	const legacyPluginNames = (LEGACY_PLUGIN_NAME !== PLUGIN_NAME as any) && checkResult[LEGACY_PLUGIN_NAME] || [];

	return {
		success: true,
		isRegistered,
		/** 只有當找到真正的舊版插件名稱時才設為 true / Only true when actual legacy plugin names are found */
		hasLegacyPlugin: legacyPluginNames.length > 0,
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
 * 使用 Bun.file() 載入 Arise 配置
 * Load Arise config using Bun.file()
 *
 * 依序搜尋以下路徑並深度合併：
 * 1. ~/.config/opencode/opencode-arise.json (全域)
 * 2. {worktree}/.opencode/opencode-arise.json (局部，優先)
 *
 * @param worktree - 工作目錄路徑
 * @returns 解析並驗證後的 AriseConfig
 */
export async function loadAriseConfigByPath(worktree?: string): Promise<IAriseConfig>
{
	const paths = getAriseConfigPaths(worktree);

	let merged: JsonObject = { ...DEFAULT_CONFIG };

	for (const path of paths.reverse())
	{
		try
		{
			const file = Bun.file(path);
			if (await file.exists())
			{
				const content = await file.text();
				const parsed = JSON.parse(content);
				merged = deepMerge(merged, parsed);
			}
		}
		catch
		{
			// Config file doesn't exist or is invalid, continue
		}
	}

	const result = AriseConfigSchema.safeParse(merged);
	if (!result.success)
	{
		console.warn("[opencode-arise] Invalid config, using defaults:", result.error.message);
		return DEFAULT_CONFIG;
	}

	return result.data;
}

/**
 * 使用 fs 同步讀取 Arise 配置
 * Load Arise config using fs (synchronous)
 *
 * @param worktree - 工作目錄路徑
 * @returns 解析並驗證後的 AriseConfig
 */
export function loadAriseConfigSync(worktree?: string): IAriseConfig
{
	const paths = getAriseConfigPaths(worktree);

	let merged: JsonObject = { ...DEFAULT_CONFIG };

	for (const path of paths.reverse())
	{
		try
		{
			if (existsSync(path))
			{
				const content = readFileSync(path, "utf-8");
				const parsed = JSON.parse(content);
				merged = deepMerge(merged, parsed);
			}
		}
		catch
		{
			// Config file doesn't exist or is invalid, continue
		}
	}

	const result = AriseConfigSchema.safeParse(merged);
	if (!result.success)
	{
		console.warn("[opencode-arise] Invalid config, using defaults:", result.error.message);
		return DEFAULT_CONFIG;
	}

	return result.data;
}
