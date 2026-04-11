/**
 * 工具參數 schema 集中管理
 * Tool args schema centralized management
 *
 * 所有 Arise 工具的 Zod raw shape 與推導型別集中定義於此
 * All Arise tool Zod raw shapes and derived types are centralized here
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { GIT_SUMMARY_ARGS } from './entry';
 *
 * // 推導輸入型別（保留 optional 語義）
 * // Derive input type (preserves optional semantics)
 * type IGitSummaryOptions = z.input<z.ZodObject<typeof GIT_SUMMARY_ARGS>>;
 * // => { log_count?: number; diff_stat?: boolean }
 * ```
 */
import { z } from "zod";
import { ARISE_TOOLS } from "../../agents/shadows";
import { EnumAriseTools } from "../../types/enums";
import { IPluginToolAriseArgs, IZodRawShape } from "../../types/types-opencode";

export type IShapeToZodObject<T extends IZodRawShape> = z.ZodObject<T>;

/**
 * 從驗證成功的 Zod object schema 推導「處理後」的資料型別
 * Derive "processed" data type from validated Zod object schema
 *
 * 獲取驗證通過後的資料型別
 * Get the data type after validation passes
 *
 * 特性：如果你的 Schema 中使用了 .transform()、.default() 或 .preprocess()，z.infer 得到的會是處理過後的型別。
 * 特性：Use z.infer to get processed type if schema uses .transform(), .default(), or .preprocess()
 *
 * @see z.infer
 */
export type IZodObjectToInfer<T> = T extends {
    _zod: {
        output: any;
    };
} ? T["_zod"]["output"] : never;

/**
 * 從 Zod object schema 推導「輸入」型別（驗證前、處理前）
 * Derive "input" type from Zod object schema (before validation/processing)
 * 
 * 用於獲取驗證之前，預期接收到的原始資料型別
 * Get the data type before validation, expected to receive
 *
 * 特性：它會保留所有尚未轉換的原始結構。
 * 特性：Preserves all unconverted original structures
 *
 * @see z.input
 */
export type IZodObjectToInput<T> = T extends {
    _zod: {
        input: any;
    };
} ? T["_zod"]["input"] : never;

/**
 * 從 Arise 工具 schema 推導驗證成功的型別
 * Derive validated type from Arise tool schema
 *
 * 特性：如果你的 Schema 中使用了 .transform()、.default() 或 .preprocess()，z.infer 得到的會是處理過後的型別。
 * 特性：Use z.infer to get processed type if schema uses .transform(), .default(), or .preprocess()
 */
export type IAriseToolsToZodInfer<T extends EnumAriseTools> = IZodObjectToInfer<IShapeToZodObject<IPluginToolAriseArgs<T>>>;

/**
 * 從 Arise 工具 schema 推導「輸入」型別（驗證前、處理前）
 * Derive "input" type from Arise tool schema (before validation/processing)
 *
 * 特性：它會保留所有尚未轉換的原始結構。
 * 特性：Preserves all unconverted original structures
 */
export type IAriseToolsToZodInput<T extends EnumAriseTools> = IZodObjectToInput<IShapeToZodObject<IPluginToolAriseArgs<T>>>;

/** ==================== Git Summary ==================== */

/**
 * Git 摘要工具參數 Zod raw shape
 * Git summary tool args Zod raw shape
 *
 * 可直接用於 ARISE_TOOLS 的 args 欄位
 * Can be directly used in ARISE_TOOLS args field
 */
export const GIT_SUMMARY_ARGS = {
	/** 顯示近期 commit 數量 / Number of recent commits to show */
	log_count: z
		.number()
		.meta({
			description: "Number of recent commits to show (default: 10)",
			title: "Log Count",
		})
		.optional()
		.default(10),
	/** 是否包含 diff --stat / Include diff --stat output */
	diff_stat: z
		.boolean()
		.meta({
			description: "Include diff --stat output (default: true)",
			title: "Diff Stat",
		})
		.optional()
		.default(true),
	/** 目標目錄路徑（相對於專案根目錄或絕對路徑）/ Target directory path (relative to project root or absolute path) */
	cwd: z
		.string()
		.meta({
			description: "Target directory to run git commands in (relative to project root or absolute path). Defaults to current working directory.",
			title: "Working Directory",
		})
		.optional(),
} as const;

/**
 * 從 Git Summary Zod schema 推導「輸入」型別
 * Derive "input" type from Git Summary Zod schema
 *
 * 原則：z.input 用於接收端（保留 .optional() 語義）
 * Principle: Use z.input in receiver (preserves .optional() semantics)
 *
 * 範例：
 * ```typescript
 * // 呼叫者 / Caller - 使用 z.input 傳遞可選參數
 * const opts = getGitSummary({ log_count: 20 })?; // log_count 可選
 * ```
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { GIT_SUMMARY_ARGS } from './entry';
 *
 * // 推導輸入型別
 * // Derive input type
 * type IGitSummaryOptions = z.input<z.ZodObject<typeof GIT_SUMMARY_ARGS>>;
 * // => { log_count?: number; diff_stat?: boolean }
 * ```
 */
export type IGitSummaryOptions = z.input<z.ZodObject<typeof GIT_SUMMARY_ARGS>>;
export type IGitSummaryOptions2 = z.input<z.ZodObject<typeof ARISE_TOOLS[typeof EnumAriseTools.ARISE_GIT_SUMMARY]['args']>>;


/**
 * ARISE_COLLABORATE 的參數類型：「輸入」型別（驗證前、處理前）
 * ARISE_COLLABORATE args type: "input" type (before validation/processing)
 *
 * 特性：這個型別保留了所有尚未轉換的原始結構與 .optional() 語義。
 * Feature: Preserves all unconverted original structures and .optional() semantics.
 *
 * 原則：z.input 用於接收端/呼叫者（確保可選參數確實可選）。
 * Principle: Use in receiver/caller to ensure optional params remain optional.
 *
 * @example
 * ```typescript
 * import type { IAriseCollaborateOptionsInput } from './entry';
 * 
 * // 呼叫者 / Caller - 傳遞可選參數
 * const opts: IAriseCollaborateOptionsInput = { log_count: 20 }; // ✅ 可選
 * const opts?: IAriseCollaborateOptionsInput; // ✅ 可選
 * ```
 */
export type IAriseCollaborateOptionsInput = IAriseToolsToZodInput<EnumAriseTools.ARISE_COLLABORATE>;

/**
 * ARISE_COLLABORATE 的參數類型：驗證成功的型別（處理後）
 * ARISE_COLLABORATE args type: After validation succeeds (processed)
 *
 * 特性：如果你的 Schema 中使用了 .transform()、.default() 或 .preprocess()，這個型別會是處理過後的結果。
 * Feature: If schema uses .transform()/.default()/.preprocess(), this is the processed result.
 *
 * 原則：z.infer 用於回傳值或預設處理（參數已設定預設值）。
 * Principle: Use in return/default handling (params already have defaults).
 *
 * @example
 * ```typescript
 * import type { IAriseCollaborateOptionsInfer } from './entry';
 * 
 * // 接收者 / Receiver - 回傳完整型別（含預設值）
 * export async function handleCollab(opts: IAriseCollaborateOptionsInfer) {
 *   // 此時 log_count 可能已有預設值 10
 *   const logCount = opts.log_count; // ✅ 不需要檢查是否為 undefined
 * }
 * ```
 */
export type IAriseCollaborateOptionsInfer = IAriseToolsToZodInfer<EnumAriseTools.ARISE_COLLABORATE>;
