/**
 * 模型緩存管理器
 * Model cache manager
 *
 * 用於緩存每個會話使用的模型，實現 AUTO 模型自動取值功能
 * Caches the model used by each session for AUTO model inheritance
 *
 * 使用場景：
 * 當 Monarch 召喚 Shadow 時，Shadow 可以使用 AUTO 作為模型
 * 這時會自動沿用 Monarch 所在會話的模型
 *
 * Usage scenario:
 * When Monarch summons Shadow, Shadow can use AUTO as model
 * This will automatically inherit the model from Monarch's session
 */

import { outputFileSync, readFileSync, pathExistsSync as existsSync } from "fs-extra";
import { resolve } from "path";

import { getHomeConfigDirArise } from "./paths";
import { PROVIDERS_CACHE_FILENAME, PROVIDERS_HISTORY_FILENAME } from "../types/const-default";
import { diff, type IDiffNode, DiffEdit, DiffDeleted, DiffNew, DiffArray, EnumKinds } from "@bluelovers/deep-diff";
import { typeNarrowed } from "ts-type-predicates";
import { array_unique } from "array-hyper-unique";

/**
 * 會話模型緩存 Map
 * Session model cache Map
 *
 * Key: sessionId - 會話唯一識別符
 * Value: 模型字串 - 格式為 provider/modelID，如 "anthropic/claude-sonnet-4"
 *
 * Key: sessionId - unique session identifier
 * Value: model string - format provider/modelID, e.g., "anthropic/claude-sonnet-4"
 */
const sessionModelCache = new Map<string, string>();

/**
 * 緩存會話使用的模型
 * Cache session model
 *
 * 在會話開始時調用，將模型資訊存入緩存
 * Called at session start, stores model info in cache
 *
 * @param sessionId - 會話 ID
 * @param providerId - 模型提供者 ID（如 "anthropic"）
 * @param modelId - 模型 ID（如 "claude-sonnet-4"）
 */
export function cacheSessionModel(sessionId: string, providerId: string, modelId: string): void
{
	/** 組合為標準格式 provider/modelID / Combine into standard format provider/modelID */
	const modelString = `${providerId}/${modelId}`;
	sessionModelCache.set(sessionId, modelString);
}

/**
 * 取得會話使用的模型
 * Get session model
 *
 * 根據 sessionId 取得之前緩存的模型字串
 * Gets previously cached model string based on sessionId
 *
 * @param sessionId - 會話 ID
 * @returns 模型字串，如 "anthropic/claude-sonnet-4"，若無則回傳 undefined
 */
export function getSessionModel(sessionId: string): string | undefined
{
	return sessionModelCache.get(sessionId);
}

/**
 * 清除會話的模型緩存
 * Clear session model cache
 *
 * 當會話結束時調用，釋放記憶體
 * Called when session ends to free memory
 *
 * @param sessionId - 會話 ID
 */
export function clearSessionModel(sessionId: string): void
{
	sessionModelCache.delete(sessionId);
}

/**
 * 清除所有模型緩存
 * Clear all session models
 *
 * 用於測試或完全重置
 * Used for testing or complete reset
 */
export function clearAllSessionModels(): void
{
	sessionModelCache.clear();
}

// ============================================================
// Providers Cache / 提供者緩存
// ============================================================

/**
 * 提供者資料結構
 * Provider data structure
 *
 * 從 OpenCode SDK config.providers() 取得
 * Obtained from OpenCode SDK config.providers()
 */
export interface CachedProvider
{
	/** 提供者 ID（如 "anthropic"、"openai"） */
	id: string;
	/** 提供者名稱 */
	name?: string;
	/** 模型映射（key 為模型 ID） */
	models?: Record<string, {
		/** 模型 ID */
		id?: string;
		/** 模型名稱 */
		name?: string;
		/** 模型限制 */
		limit?: {
			/** 上下文窗口大小 */
			context?: number;
			/** 輸出限制 */
			output?: number;
		};
	}>;
	/** 是否為預設提供者 */
	default?: boolean;
}

/**
 * 提供者緩存資料結構
 * Provider cache data structure
 */
export interface IProvidersCache
{
	/** 緩存的提供者列表 */
	providers: CachedProvider[];
	/** 緩存時間戳 */
	timestamp: number;
	/** 過期時間（毫秒），預設 5 分鐘 */
	expiresIn: number;
	/** 歷史記錄（不會刪除的廠商與模型，以 providerId -> modelId 分類） */
	history?: IProviderHistory;
}

/**
 * 歷史記錄項目結構
 * History record item structure
 *
 * 記錄所有曾經出現過的廠商與模型，即使後來被移除或改名仍保留
 */
export interface IProviderHistoryItem
{
	/** 提供者 ID */
	providerId: string;
	/** 模型 ID */
	modelId: string;
	/** 首次出現時間戳 */
	firstSeen: number;
	/** 最後出現時間戳 */
	lastSeen: number;
	/** 狀態（active 已移除） */
	status: "active" | "removed";
	/** 是否為免費模型（若確定能知道） */
	free?: boolean;
}

/**
 * 歷史記錄結構（以 providerId -> modelId 分類）
 * History record structure (grouped by providerId -> modelId)
 *
 * @example
 * {
 *   "anthropic": {
 *     "claude-4-opus": {
 *       "firstSeen": 1775221827009,
 *       "lastSeen": 1775221827009,
 *       "status": "active"
 *     }
 *   }
 * }
 */
export interface IProviderHistory
{
	[providerId: string]: {
		[modelId: string]: IProviderHistoryItem;
	};
}

/** 提供者緩存（模組級別單例） */
let providersCache: IProvidersCache | null = null;

/**
 * 預設緩存過期時間（毫秒）
 * Default cache expiration time (ms)
 *
 * 5 分鐘 = 300000 毫秒
 */
export const DEFAULT_PROVIDERS_CACHE_TTL = 5 * 60 * 1000;

/**
 * 歷史記錄閾值（毫秒）
 * History threshold (ms)
 *
 * 30 分鐘 = 1800000 毫秒
 * 當舊快取不存在或超過此時間，會從檔案讀取並比對差異
 */
export const HISTORY_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * 取得緩存檔案完整路徑
 * Get cache file full path
 *
 * @returns 緩存檔案路徑 ~/.config/opencode-arise/providers-cache.json
 */
function getProvidersCacheFilePath(): string
{
	return resolve(getHomeConfigDirArise(), PROVIDERS_CACHE_FILENAME);
}

/**
 * 取得歷史紀錄檔案完整路徑
 * Get history file full path
 *
 * @returns 歷史紀錄檔案路徑 ~/.config/opencode-arise/providers-history.json
 */
function getProvidersHistoryFilePath(): string
{
	return resolve(getHomeConfigDirArise(), PROVIDERS_HISTORY_FILENAME);
}

/**
 * 從檔案載入提供者緩存
 * Load providers cache from file
 *
 * 注意：即使緩存過期也不刪除檔案，僅不回傳過期資料
 * Note: Cache file is never deleted even when expired, only returns null for expired data
 *
 * @returns 從檔案載入的緩存資料，若失敗則回傳 null
 */
function loadProvidersCacheFromFile(): IProvidersCache | null
{
	try
	{
		const filePath = getProvidersCacheFilePath();
		if (!existsSync(filePath))
		{
			return null;
		}

		const content = readFileSync(filePath, "utf-8");
		const data = JSON.parse(content) as IProvidersCache;

		// 驗證資料結構
		if (!data.providers || !Array.isArray(data.providers) || typeof data.timestamp !== "number")
		{
			return null;
		}

		// 檢查是否過期（使用檔案中的 expiresIn，若無則使用預設 TTL）
		const now = Date.now();
		const age = now - data.timestamp;
		const expiresIn = data.expiresIn ?? DEFAULT_PROVIDERS_CACHE_TTL;

		if (age > expiresIn)
		{
			// 過期但仍回傳資料（讓調用者決定是否使用）
			return null;
		}

		return data;
	}
	catch
	{
		return null;
	}
}

/**
 * 將提供者緩存儲存至檔案
 * Save providers cache to file
 *
 * @param cache - 要儲存的緩存資料
 */
function saveProvidersCacheToFile(cache: IProvidersCache): void
{
	try
	{
		const filePath = getProvidersCacheFilePath();
		outputFileSync(filePath, JSON.stringify(cache, null, 2), "utf-8");
	}
	catch
	{
		// 儲存失敗不影響記憶體緩存
	}
}

/**
 * 從檔案載入歷史紀錄
 * Load history records from file
 *
 * @returns 從檔案載入的歷史紀錄，若失敗則回傳 null
 */
function loadProvidersHistoryFromFile(): IProviderHistory | null
{
	try
	{
		const filePath = getProvidersHistoryFilePath();
		if (!existsSync(filePath))
		{
			return null;
		}

		const content = readFileSync(filePath, "utf-8");
		const data = JSON.parse(content) as IProviderHistory;

		// 簡單驗證資料結構
		if (!data || typeof data !== "object")
		{
			return null;
		}

		return data;
	}
	catch
	{
		return null;
	}
}

/**
 * 將歷史紀錄儲存至檔案
 * Save history records to file
 *
 * @param history - 要儲存的歷史紀錄
 */
function saveProvidersHistoryToFile(history: IProviderHistory): void
{
	try
	{
		const filePath = getProvidersHistoryFilePath();
		outputFileSync(filePath, JSON.stringify(history, null, 2), "utf-8");
	}
	catch
	{
		// 儲存失敗不影響記憶體緩存
	}
}

/**
 * 從提供者列表中提取所有廠商與模型的組合
 * Extract all provider-model combinations from providers list
 *
 * @param providers - 提供者列表
 * @returns 以 providerId -> modelId 分類的歷史記錄
 */
export function extractProviderModels(providers: CachedProvider[]): IProviderHistory
{
	const now = Date.now();
	const result: IProviderHistory = {};

	for (const provider of providers)
	{
		if (provider.models)
		{
			result[provider.id] = {};

			for (const [modelKey, model] of Object.entries(provider.models))
			{
				const modelId = model?.id ?? model?.name ?? modelKey;
				result[provider.id][modelId] = {
					providerId: provider.id,
					modelId,
					firstSeen: now,
					lastSeen: now,
					status: "active",
				};
			}
		}
	}

	return result;
}

/**
 * 更新歷史記錄
 * Update history records
 *
 * 比較新舊提供者資料，更新歷史記錄的狀態
 *
 * @param oldHistory - 舊的歷史記錄
 * @param newProviders - 新的提供者列表
 * @returns 更新後的歷史記錄
 */
export function updateHistoryRecords(oldHistory: IProviderHistory | undefined,
	newProviders: CachedProvider[],
): IProviderHistory
{
	const now = Date.now();
	const newModels = extractProviderModels(newProviders);

	// 如果沒有舊記錄，直接使用新的（標記為 active）
	if (!oldHistory || Object.keys(oldHistory).length === 0)
	{
		return newModels;
	}

	const result: IProviderHistory = {};

	// 複製舊記錄並更新狀態
	for (const [providerId, models] of Object.entries(oldHistory))
	{
		result[providerId] = {};

		for (const [modelId, item] of Object.entries(models))
		{
			// 檢查新資料中是否存在這個模型
			if (newModels[providerId]?.[modelId])
			{
				// 模型仍然存在，更新 lastSeen 並設為 active
				result[providerId][modelId] = {
					...item,
					lastSeen: now,
					status: "active",
				};
			}
			else
			{
				// 模型已被移除，設為 removed（保留記錄）
				result[providerId][modelId] = {
					...item,
					status: "removed",
				};
			}
		}
	}

	// 新資料中剩餘的項目是新增的模型
	for (const [providerId, models] of Object.entries(newModels))
	{
		if (!result[providerId])
		{
			result[providerId] = {};
		}

		for (const [modelId, item] of Object.entries(models))
		{
			if (!result[providerId][modelId])
			{
				result[providerId][modelId] = item;
			}
		}
	}

	return result;
}

/**
 * 設定提供者緩存
 * Set providers cache
 *
 * @param providers - 提供者列表
 * @param expiresIn - 過期時間（毫秒），預設 5 分鐘
 * @param oldCache - 舊的緩存（用於計算差異與歷史記錄）
 */
export function setProvidersCache(
	providers: CachedProvider[],
	expiresIn: number = DEFAULT_PROVIDERS_CACHE_TTL,
	oldCache?: IProvidersCache | null,
): void
{
	const now = Date.now();

	// 從歷史紀錄檔案載入舊記錄（優先）
	let historyFromFile = loadProvidersHistoryFromFile();

	// 如果沒有歷史記錄，從新資料建立
	if (!historyFromFile || Object.keys(historyFromFile).length === 0)
	{
		historyFromFile = extractProviderModels(providers);
	}
	else
	{
		// 更新歷史記錄
		historyFromFile = updateHistoryRecords(historyFromFile, providers);
	}

	const cache: IProvidersCache = {
		providers,
		timestamp: now,
		expiresIn,
		history: historyFromFile,
	};

	// 更新記憶體緩存
	providersCache = cache;

	// 同步儲存至檔案
	saveProvidersCacheToFile(cache);

	// 獨立儲存歷史紀錄（永久保存）
	saveProvidersHistoryToFile(historyFromFile);
}

/**
 * 取得提供者緩存
 * Get providers cache
 *
 * @param forceRefresh - 是否強制刷新，忽略緩存
 * @returns 提供者緩存，若過期或不存在則回傳 null
 */
export function getProvidersCache(forceRefresh: boolean = false): IProvidersCache | null
{
	// 如果強制刷新，直接返回 null
	if (forceRefresh)
	{
		return null;
	}

	// 先檢查記憶體緩存
	if (providersCache)
	{
		// 檢查是否過期
		const now = Date.now();
		const age = now - providersCache.timestamp;

		if (age > providersCache.expiresIn)
		{
			providersCache = null;
		}
		else
		{
			return providersCache;
		}
	}

	// 記憶體緩存不存在或已過期，嘗試從檔案載入
	const fileCache = loadProvidersCacheFromFile();
	if (fileCache)
	{
		providersCache = fileCache;
		return fileCache;
	}

	return null;
}

/**
 * 檢查提供者緩存是否存在且有效
 * Check if providers cache exists and is valid
 *
 * @returns 是否有效
 */
export function hasValidProvidersCache(): boolean
{
	return getProvidersCache() !== null;
}

/**
 * 清除提供者緩存
 * Clear providers cache
 */
export function clearProvidersCache(): void
{
	providersCache = null;
}

// ============================================================
// 差異比較工具 / Difference Comparison Utilities
// ============================================================

/**
 * 差異類型映射
 * Diff type mapping
 */
const DIFF_TYPE_LABELS: Record<string, string> = {
	/** 新增屬性 */
	N: "新增 / Added",
	/** 刪除屬性 */
	D: "刪除 / Deleted",
	/** 修改屬性 */
	E: "修改 / Modified",
	/** 陣列變更 */
	A: "陣列變更 / Array change",
};

/**
 * 取得差異類型的標籤
 * Get diff type label
 *
 * @param kind - 差異類型代號
 * @returns 差異類型標籤
 */
function getDiffTypeLabel(kind: string): string
{
	return DIFF_TYPE_LABELS[kind] ?? kind;
}

/**
 * 取得屬性路徑的文字表示
 * Get property path as string
 *
 * @param path - 屬性路徑陣列
 * @returns 路徑字串
 */
function getPathString(path: (string | number | symbol)[]): string
{
	return path.map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`)).join("").replace(/^\./, "");
}

/**
 * 差異結果類型
 * Diff result type
 */
export interface IProviderDiffResult
{
	/** 差異類型 */
	type: string;
	/** 差異類型標籤 */
	typeLabel: string;
	/** 屬性路徑 */
	path: string;
	/** 舊值 */
	oldValue?: unknown;
	/** 新值 */
	newValue?: unknown;
}

/**
 * 比較兩個提供者緩存的差異
 * Compare two provider caches for differences
 *
 * @param oldCache - 舊的緩存
 * @param newCache - 新的緩存
 * @returns 差異結果陣列
 */
export function compareProvidersCache(
	oldCache: IProvidersCache | null,
	newCache: IProvidersCache | null,
): IProviderDiffResult[]
{
	const results: IProviderDiffResult[] = [];

	// 如果兩者都為 null，回傳空陣列
	if (!oldCache && !newCache)
	{
		return results;
	}

	// 如果只有一方存在
	if (!oldCache && newCache)
	{
		results.push({
			type: EnumKinds.DiffNew,
			typeLabel: getDiffTypeLabel(EnumKinds.DiffNew),
			path: "timestamp",
			oldValue: undefined,
			newValue: newCache.timestamp,
		});
		return results;
	}

	if (oldCache && !newCache)
	{
		results.push({
			type: EnumKinds.DiffDeleted,
			typeLabel: getDiffTypeLabel(EnumKinds.DiffDeleted),
			path: "timestamp",
			oldValue: oldCache.timestamp,
			newValue: undefined,
		});
		return results;
	}

	// 兩者都存在，進行深度比較
	if (oldCache && newCache)
	{
		const differences = diff(oldCache, newCache);

		if (differences && differences.length > 0)
		{
			for (const diffItem of differences)
			{
				if (typeNarrowed<DiffNew<IProvidersCache>>(diffItem, () => diffItem.kind === EnumKinds.DiffNew))
				{
					results.push({
						type: EnumKinds.DiffNew,
						typeLabel: getDiffTypeLabel(EnumKinds.DiffNew),
						path: getPathString(diffItem.path),
						newValue: diffItem.rhs,
					});
				}
				else if (typeNarrowed<DiffDeleted<IProvidersCache>>(diffItem, () => diffItem.kind === EnumKinds.DiffDeleted))
				{
					results.push({
						type: EnumKinds.DiffDeleted,
						typeLabel: getDiffTypeLabel(EnumKinds.DiffDeleted),
						path: getPathString(diffItem.path),
						oldValue: diffItem.lhs,
					});
				}
				else if (typeNarrowed<DiffEdit<IProvidersCache>>(diffItem, () => diffItem.kind === EnumKinds.DiffEdit))
				{
					results.push({
						type: EnumKinds.DiffEdit,
						typeLabel: getDiffTypeLabel(EnumKinds.DiffEdit),
						path: getPathString(diffItem.path),
						oldValue: diffItem.lhs,
						newValue: diffItem.rhs,
					});
				}
				else if (typeNarrowed<DiffArray<IProvidersCache>>(diffItem, () => diffItem.kind === EnumKinds.DiffArray))
				{
					const item = diffItem.item as DiffEdit<IProvidersCache>;
					results.push({
						type: EnumKinds.DiffArray,
						typeLabel: getDiffTypeLabel(EnumKinds.DiffArray),
						path: getPathString(diffItem.path),
						oldValue: item?.lhs,
						newValue: item?.rhs,
					});
				}
			}
		}
	}

	return results;
}

/**
 * 將差異結果轉換為文字報告
 * Convert diff results to text report
 *
 * @param diffs - 差異結果陣列
 * @param title - 報告標題（可選）
 * @returns 格式化的文字報告
 */
export function diffsToTextReport(diffs: IProviderDiffResult[], title?: string): string
{
	if (diffs.length === 0)
	{
		return title ? `${title}\n\n無差異 / No differences` : "無差異 / No differences";
	}

	const lines: string[] = [];

	if (title)
	{
		lines.push(title);
		lines.push("=".repeat(title.length));
		lines.push("");
	}

	for (const d of diffs)
	{
		lines.push(`[${d.typeLabel}] ${d.path}`);

		if (d.oldValue !== undefined)
		{
			lines.push(`  - 舊值 / Old: ${JSON.stringify(d.oldValue)}`);
		}

		if (d.newValue !== undefined)
		{
			lines.push(`  + 新值 / New: ${JSON.stringify(d.newValue)}`);
		}

		lines.push("");
	}

	return lines.join("\n").trim();
}

/**
 * 將差異結果轉換為 Markdown 表格
 * Convert diff results to Markdown table
 *
 * @param diffs - 差異結果陣列
 * @returns Markdown 格式表格
 */
export function diffsToMarkdownTable(diffs: IProviderDiffResult[]): string
{
	if (diffs.length === 0)
	{
		return "| 狀態 / Status | 類型 / Type | 路徑 / Path | 舊值 / Old | 新值 / New |\n|---|---|---|---|---|\n| 無差異 / No differences | - | - | - | - |";
	}

	const lines: string[] = [
		"| 狀態 / Status | 類型 / Type | 路徑 / Path | 舊值 / Old | 新值 / New |",
		"|---|---|---|---|---|",
	];

	for (const d of diffs)
	{
		const typeEmoji = d.type === "N" ? "🟢" : d.type === "D" ? "🔴" : d.type === "E" ? "🟡" : "🔵";
		const oldValue = d.oldValue !== undefined ? `\`${JSON.stringify(d.oldValue)}\`` : "-";
		const newValue = d.newValue !== undefined ? `\`${JSON.stringify(d.newValue)}\`` : "-";

		lines.push(`| ${typeEmoji} | ${d.typeLabel} | \`${d.path}\` | ${oldValue} | ${newValue} |`);
	}

	return lines.join("\n");
}
