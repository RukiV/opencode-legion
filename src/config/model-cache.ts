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

import { outputFileSync, pathExistsSync as existsSync, readFileSync } from "fs-extra";
import { resolve } from "path";

import type { ToolContext } from "@opencode-ai/plugin";
import { getHomeConfigDirArise } from "./paths";
import { PROVIDERS_CACHE_FILENAME, PROVIDERS_HISTORY_FILENAME } from "../types/const-default";
import { diff, DiffArray, DiffDeleted, DiffEdit, DiffNew, EnumKinds } from "@bluelovers/deep-diff";
import { typeNarrowed } from "ts-type-predicates";
import { logArise2WithLevel } from "../utils/debug-control";
import { formatDate, fromNow } from "../utils/date/dayjs";
import { IOpenCodeProvider, IOpenCodeProviderCore, IOpenCodeProviderModelCost } from '../types/opencode/types-provider';
import { sortObject } from "sort-object-keys2";

// ============================================================
// Providers Cache / 提供者緩存
// ============================================================

/**
 * 歷史記錄狀態列舉
 * History record status enumeration
 */
export enum EnumProviderHistoryStatus
{
	/** 模型仍在使用中 / Model is still in use */
	Active = "active",
	/** 模型已被移除 / Model has been removed */
	Removed = "removed",
}

/**
 * 提供者緩存資料結構
 * Provider cache data structure
 */
export interface IProvidersCache
{
	/** 緩存的提供者列表（陣列格式） */
	data: IOpenCodeProvider[];
	/** 提供者映射（以 id 為 key 的 Map 格式，方便快速查詢，不包含 models 以減少檔案大小） */
	providers: Record<string, IOpenCodeProviderCore>;
	/** 緩存時間戳 */
	timestamp: number;
	/** 過期時間（毫秒），預設 5 分鐘 */
	expiresIn: number;
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
	status: EnumProviderHistoryStatus;
	/** 是否為免費模型（若確定能知道） */
	free?: boolean;
}

/**
 * 歷史記錄結構（以 providerId 分類）
 * History record structure (grouped by providerId)
 *
 * @example
 * {
 *   "anthropic": {
 *     "models": {
 *       "claude-4-opus": {
 *         "providerId": "anthropic",
 *         "modelId": "claude-4-opus",
 *         "firstSeen": 1775221827009,
 *         "lastSeen": 1775221827009,
 *         "status": "active"
 *       }
 *     }
 *   }
 * }
 */
export interface IProviderHistory
{
	[providerId: string]: IProviderHistoryData;
}

export interface IProviderHistoryData
{
  /** 模型映射（key 為模型 ID） */
	models: {
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
		if (!	data.data || !Array.isArray(	data.data) || typeof data.timestamp !== "number")
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
export function extractProviderModels(providers: IOpenCodeProvider[]): IProviderHistory
{
	const now = Date.now();
	const result: IProviderHistory = {};

	for (const provider of providers)
	{
		if (provider.models)
		{
			result[provider.id] = {
				models: {},
			};

			for (const [modelKey, model] of Object.entries(provider.models))
			{
				const modelId = model?.id ?? model?.name ?? modelKey;
				result[provider.id].models[modelId] = {
					providerId: provider.id,
					modelId,
					firstSeen: now,
					lastSeen: now,
					status: EnumProviderHistoryStatus.Active,
				};
			}
		}
	}

	return result;
}

/**
 * 更新歷史記錄的統計資訊
 * Update history records statistics
 */
export interface IHistoryUpdateStats
{
	/** 提供商數量 */
	providerCount: number;
	/** 模型總數量 */
	totalModelCount: number;
	/** 各提供商的模型數量 */
	modelsPerProvider: Record<string, number>;
	/** 本次新增的模型數量 */
	addedModels: number;
	/** 本次移除的模型數量 */
	removedModels: number;
	/** 狀態變動的模型數量 */
	changedModels: number;
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
	newProviders: IOpenCodeProvider[],
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
	for (const [providerId, providerData] of Object.entries(oldHistory))
	{
		// 處理舊格式（沒有 models 屬性）或新格式
		const models = providerData?.models ?? {};

		result[providerId] = {
			models: {},
		};

		for (const [modelId, item] of Object.entries(models))
		{
			// 檢查新資料中是否存在這個模型
			if (newModels[providerId]?.models?.[modelId])
			{
				// 模型仍然存在，更新 lastSeen 並設為 active
				result[providerId].models[modelId] = {
					...item,
					lastSeen: now,
					status: EnumProviderHistoryStatus.Active,
				};
			}
			else
			{
				// 模型已被移除，設為 removed（保留記錄）
				result[providerId].models[modelId] = {
					...item,
					status: EnumProviderHistoryStatus.Removed,
				};
			}
		}
	}

	// 新資料中剩餘的項目是新增的模型
	for (const [providerId, providerData] of Object.entries(newModels))
	{
		if (!result[providerId])
		{
			result[providerId] = {
				models: {},
			};
		}

		for (const [modelId, item] of Object.entries(providerData.models))
		{
			if (!result[providerId].models[modelId])
			{
				result[providerId].models[modelId] = item;
			}
		}
	}

	return result;
}

/**
 * 計算歷史更新統計資訊
 * Calculate history update statistics
 *
 * @param oldHistory - 舊的歷史記錄
 * @param newHistory - 新的歷史記錄
 * @param providers - 新的提供者列表
 * @returns 統計資訊
 */
export function calculateHistoryUpdateStats(
	oldHistory: IProviderHistory | undefined,
	newHistory: IProviderHistory,
	providers: IOpenCodeProvider[],
): IHistoryUpdateStats
{
	// 計算提供商數量與模型數量
	const providerCount = Object.keys(newHistory).length;

	// 各提供商的模型數量
	const modelsPerProvider: Record<string, number> = {};
	let totalModelCount = 0;

	for (const [providerId, providerData] of Object.entries(newHistory))
	{
		const modelCount = Object.keys(providerData.models).length;
		modelsPerProvider[providerId] = modelCount;
		totalModelCount += modelCount;
	}

	// 計算變動
	let addedModels = 0;
	let removedModels = 0;
	let changedModels = 0;

	if (oldHistory)
	{
		for (const [providerId, providerData] of Object.entries(newHistory))
		{
			for (const [modelId, item] of Object.entries(providerData.models))
			{
				const oldItem = oldHistory[providerId]?.models?.[modelId];

				if (!oldItem)
				{
					// 新增的模型
					addedModels++;
				}
				else if (oldItem.status !== item.status)
				{
					// 狀態變動（active <-> removed）
					changedModels++;
				}
			}
		}

		// 移除的模型
		for (const [providerId, providerData] of Object.entries(oldHistory))
		{
			for (const [modelId] of Object.entries(providerData.models))
			{
				if (!newHistory[providerId]?.models?.[modelId])
				{
					removedModels++;
				}
			}
		}
	}
	else
	{
		// 首次建立，全部視為新增
		addedModels = totalModelCount;
	}

	return {
		providerCount,
		totalModelCount,
		modelsPerProvider,
		addedModels,
		removedModels,
		changedModels,
	};
}

/**
 * 產生提供者緩存更新的報告文字
 * Generate provider cache update report text
 *
 * @param stats - 歷史更新統計資訊
 * @param timestamp - 更新時間戳（可選）
 * @returns 格式化的報告文字
 */
export function generateProviderCacheReport(stats: IHistoryUpdateStats, timestamp?: number): string
{
	const timestampStr = timestamp
		? `\n  ⏰ Updated at: ${formatDate(timestamp)} (${fromNow(timestamp)})`
		: "";

	const lines: string[] = [
		"",
		"═".repeat(50),
		"  Provider Cache Updated / 提供者緩存已更新",
		"═".repeat(50),
		"",
		`  📊 Provider Count / 提供商數量: ${stats.providerCount}`,
		`  🤖 Total Models / 模型總數: ${stats.totalModelCount}`,
		"",
		"  📦 Models per Provider / 各提供商模型數量:",
		...Object.entries(stats.modelsPerProvider).map(([providerId, count]) =>
			`     - ${providerId}: ${count} models`
		),
		"",
		"  📈 Changes / 變動情況:",
		`     🟢 Added / 新增: ${stats.addedModels} models`,
		`     🔴 Removed / 移除: ${stats.removedModels} models`,
		`     🟡 Changed / 變動: ${stats.changedModels} models`,
		"",
		`  💾 Cache saved to: ~/.config/opencode-arise/${PROVIDERS_CACHE_FILENAME}`,
		`  📜 History saved to: ~/.config/opencode-arise/${PROVIDERS_HISTORY_FILENAME}`,
		timestampStr,
		"=".repeat(50),
	];

	return lines.join("\n");
}

/**
 * 發送提供者緩存更新通知
 * Send provider cache update notification
 *
 * 若傳入 ctx 且 TUI 可用，則發送 toast 通知
 * If ctx is passed and TUI is available, sends toast notification
 *
 * @param stats - 歷史更新統計資訊
 * @param ctx - ToolContext（可選）
 * @param timestamp - 更新時間戳（可選）
 */
export async function notifyProviderCacheUpdate(
	stats: IHistoryUpdateStats,
	ctx?: ToolContext,
	timestamp?: number,
): Promise<void>
{
	// 先輸出日誌
	// Output log first
	const reportText = generateProviderCacheReport(stats);
	logArise2WithLevel("info", () => [reportText]);

	// 如果有傳入 ctx，嘗試發送 TUI 通知
	// If ctx is provided, try to send TUI notification
	if (ctx)
	{
		const changeSummary = [
			stats.addedModels > 0 ? `+${stats.addedModels} added` : null,
			stats.removedModels > 0 ? `-${stats.removedModels} removed` : null,
			stats.changedModels > 0 ? `~${stats.changedModels} changed` : null,
		].filter(Boolean).join(", ");

		const title = "Provider Cache Updated";
		const message = `${stats.providerCount} providers, ${stats.totalModelCount} models (${changeSummary})`;

		try
		{
			// @ts-expect-error ctx.client.tui 可能不存在 / ctx.client.tui may not exist
			await ctx.client.tui?.showToast?.({
				body: {
					title,
					message,
					variant: "info",
					duration: 5000,
				},
			});
		}
		catch
		{
			// TUI 可能不可用（非互動模式）
			// TUI may not be available (non-interactive mode)
		}
	}
}

/**
 * 設定提供者緩存
 * Set providers cache
 *
 * @param providers - 提供者列表
 * @param expiresIn - 過期時間（毫秒），預設 5 分鐘
 * @param oldCache - 舊的緩存（用於計算差異與歷史記錄）
 * @param ctx - ToolContext（可選），用於發送 TUI 通知
 */
export function setProvidersCache(
	providers: IOpenCodeProvider[],
	expiresIn: number = DEFAULT_PROVIDERS_CACHE_TTL,
	oldCache?: IProvidersCache | null,
	ctx?: ToolContext,
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

	// 緩存物件不包含 history（歷史記錄單獨儲存於 providers-history.json）
	// Cache object does NOT include history (history is stored separately in providers-history.json)
	// providers Record 不包含 models（使用 IOpenCodeProviderCore），以減少檔案大小
	const providersRecord = providers.reduce((acc, p) => {
		acc[p.id] = {
			id: p.id,
			source: p.source,
			name: p.name,
			env: p.env,
			options: p.options,
			default: p.default,
		};
		return acc;
	}, {} as Record<string, IOpenCodeProviderCore>);

  sortObject(providersRecord, {
    useSource: true,
  });

	const cache: IProvidersCache = {
		data: providers,
		providers: providersRecord,
		timestamp: now,
		expiresIn,
	};

	// 更新記憶體緩存
	providersCache = cache;

	// 同步儲存至檔案
	saveProvidersCacheToFile(cache);

	// 獨立儲存歷史紀錄（永久保存）
	saveProvidersHistoryToFile(historyFromFile);

	// 計算並輸出統計日誌
	// Calculate and output statistics log
	const stats = calculateHistoryUpdateStats(loadProvidersHistoryFromFile() ?? undefined, historyFromFile, providers);

	// 呼叫通知函數（包含日誌輸出）
	// Call notification function (includes log output)
	notifyProviderCacheUpdate(stats, ctx, now).catch(() =>
	{
		// 忽略通知錯誤
		// Ignore notification errors
	});
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

/**
 * 免費模型資訊
 * Free model information
 */
export interface IFreeModelInfo
{
	/** 提供者 ID */
	providerId: string;
	/** 模型 ID */
	modelId: string;
	/** 模型名稱 */
	name?: string;
	/** 模型費用資訊 */
	cost: IOpenCodeProviderModelCost;
}

/**
 * 檢查模型是否為免費模型
 * Check if a model is free
 *
 * 免費模型的定義：input 和 output費用都為 0
 * Free model definition: both input and output costs are 0
 *
 * @param cost - 模型費用資訊
 * @returns 是否為免費模型
 */
export function isFreeModel(cost: IOpenCodeProviderModelCost | undefined): boolean
{
	if (!cost)
	{
		return false;
	}

	return cost.input === 0 && cost.output === 0;
}

/**
 * 從 providers 中找出所有免費模型
 * Find all free models from providers
 *
 * @param providers - 提供者列表
 * @returns 免費模型資訊陣列
 */
export function findFreeModels(providers: IOpenCodeProvider[]): IFreeModelInfo[]
{
	const freeModels: IFreeModelInfo[] = [];

	for (const provider of providers)
	{
		if (provider.models)
		{
			for (const [modelKey, model] of Object.entries(provider.models))
			{
				if (isFreeModel(model.cost))
				{
					const modelId = model?.id ?? model?.name ?? modelKey;
					freeModels.push({
						providerId: provider.id,
						modelId,
						name: model.name,
						cost: model.cost!,
					});
				}
			}
		}
	}

	return freeModels;
}

export function findFreeModelsRecord(providers: IOpenCodeProvider[])
{
	return findFreeModels(providers).reduce((record, entry) => {
		record[entry.providerId] ??= {} as any;
		record[entry.providerId][entry.modelId] = entry;
		return record;
	}, {} as Record<IFreeModelInfo["providerId"], Record<IFreeModelInfo["modelId"], IFreeModelInfo>>);
}
