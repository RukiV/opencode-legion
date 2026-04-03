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

import { mkdirSync, writeFileSync, readFileSync, pathExistsSync as existsSync } from "fs-extra";
import { resolve } from "path";

import { getHomeConfigDirArise } from "./paths";
import { PROVIDERS_CACHE_FILENAME } from "../types/const-default";
import { diff, type IDiffNode } from "@bluelovers/deep-diff";

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
export interface ProvidersCache
{
  /** 緩存的提供者列表 */
  providers: CachedProvider[];
  /** 緩存時間戳 */
  timestamp: number;
  /** 過期時間（毫秒），預設 5 分鐘 */
  expiresIn: number;
}

/** 提供者緩存（模組級別單例） */
let providersCache: ProvidersCache | null = null;

/**
 * 預設緩存過期時間（毫秒）
 * Default cache expiration time (ms)
 *
 * 5 分鐘 = 300000 毫秒
 */
export const DEFAULT_PROVIDERS_CACHE_TTL = 5 * 60 * 1000;

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
 * 確保緩存目錄存在
 * Ensure cache directory exists
 */
function ensureCacheDirExists(): void
{
  const cacheDir = getHomeConfigDirArise();
  if (!existsSync(cacheDir))
  {
    mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * 從檔案載入提供者緩存
 * Load providers cache from file
 *
 * @returns 從檔案載入的緩存資料，若失敗則回傳 null
 */
function loadProvidersCacheFromFile(): ProvidersCache | null
{
  try
  {
    const filePath = getProvidersCacheFilePath();
    if (!existsSync(filePath))
    {
      return null;
    }

    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as ProvidersCache;

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
      return null;
    }

    return data;
  } catch
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
function saveProvidersCacheToFile(cache: ProvidersCache): void
{
  try
  {
    ensureCacheDirExists();
    const filePath = getProvidersCacheFilePath();
    writeFileSync(filePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch
  {
    // 儲存失敗不影響記憶體緩存
  }
}

/**
 * 設定提供者緩存
 * Set providers cache
 *
 * @param providers - 提供者列表
 * @param expiresIn - 過期時間（毫秒），預設 5 分鐘
 */
export function setProvidersCache(
  providers: CachedProvider[],
  expiresIn: number = DEFAULT_PROVIDERS_CACHE_TTL
): void
{
  const cache: ProvidersCache = {
    providers,
    timestamp: Date.now(),
    expiresIn,
  };

  // 更新記憶體緩存
  providersCache = cache;

  // 同步儲存至檔案
  saveProvidersCacheToFile(cache);
}

/**
 * 取得提供者緩存
 * Get providers cache
 *
 * @param forceRefresh - 是否強制刷新，忽略緩存
 * @returns 提供者緩存，若過期或不存在則回傳 null
 */
export function getProvidersCache(forceRefresh: boolean = false): ProvidersCache | null
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
    } else
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
export interface ProviderDiffResult {
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
  oldCache: ProvidersCache | null,
  newCache: ProvidersCache | null
): ProviderDiffResult[]
{
  const results: ProviderDiffResult[] = [];

  // 如果兩者都為 null，回傳空陣列
  if (!oldCache && !newCache)
  {
    return results;
  }

  // 如果只有一方存在
  if (!oldCache && newCache)
  {
    results.push({
      type: "N",
      typeLabel: getDiffTypeLabel("N"),
      path: "timestamp",
      oldValue: undefined,
      newValue: newCache.timestamp,
    });
    return results;
  }

  if (oldCache && !newCache)
  {
    results.push({
      type: "D",
      typeLabel: getDiffTypeLabel("D"),
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
      for (const d of differences)
      {
        // 使用 any 繞過 TypeScript 聯合類型屬性推導問題
        const diffItem = d as unknown as {
          kind: string;
          path?: (string | number | symbol)[];
          lhs?: unknown;
          rhs?: unknown;
          item?: {
            lhs?: unknown;
            rhs?: unknown;
          };
        };

        if (diffItem.kind === "N")
        {
          results.push({
            type: diffItem.kind,
            typeLabel: getDiffTypeLabel(diffItem.kind),
            path: getPathString(diffItem.path ?? []),
            newValue: diffItem.rhs,
          });
        } else if (diffItem.kind === "D")
        {
          results.push({
            type: diffItem.kind,
            typeLabel: getDiffTypeLabel(diffItem.kind),
            path: getPathString(diffItem.path ?? []),
            oldValue: diffItem.lhs,
          });
        } else if (diffItem.kind === "E")
        {
          results.push({
            type: diffItem.kind,
            typeLabel: getDiffTypeLabel(diffItem.kind),
            path: getPathString(diffItem.path ?? []),
            oldValue: diffItem.lhs,
            newValue: diffItem.rhs,
          });
        } else if (diffItem.kind === "A")
        {
          results.push({
            type: diffItem.kind,
            typeLabel: getDiffTypeLabel(diffItem.kind),
            path: getPathString(diffItem.path ?? []),
            oldValue: diffItem.item?.lhs,
            newValue: diffItem.item?.rhs,
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
export function diffsToTextReport(diffs: ProviderDiffResult[], title?: string): string
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
export function diffsToMarkdownTable(diffs: ProviderDiffResult[]): string
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
