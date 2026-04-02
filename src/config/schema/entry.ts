/**
 * 工具參數 schema 集中管理
 * Tool args schema centralized management
 *
 * 所有 Arise 工具的 Zod raw shape 與推導型別集中定義於此
 * All Arise tool Zod raw shapes and derived types are centralized here
 *
 * @example
 * ```typescript
 * import type { input } from 'zod';
 * import { z } from 'zod';
 * import { GIT_SUMMARY_ARGS } from './entry';
 *
 * // 推導輸入型別（保留 optional 語義）
 * // Derive input type (preserves optional semantics)
 * type IGitSummaryOptions = input<z.ZodObject<typeof GIT_SUMMARY_ARGS>>;
 * // => { log_count?: number; diff_stat?: boolean }
 * ```
 */
import { z } from "zod";
import { ARISE_TOOLS } from "../../agents/shadows";
import { EnumAriseTools } from "../../types/enums";

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
} as const;

/**
 * 從 Zod schema 推導 Git 摘要選項型別
 * Derive Git summary options type from Zod schema
 *
 * 使用 z.input 而非 z.infer：
 * - z.input  → 推導「輸入」型別，保留 .optional() 語義（log_count?: number）
 * - z.infer  → 推導「輸出」型別，已套用 default（log_count: number）
 *
 * Use z.input instead of z.infer:
 * - z.input  → derives "input" type, preserves .optional() semantics (log_count?: number)
 * - z.infer  → derives "output" type, defaults applied (log_count: number)
 */
export type IGitSummaryOptions = z.input<z.ZodObject<typeof GIT_SUMMARY_ARGS>>;
export type IGitSummaryOptions2 = z.input<z.ZodObject<typeof ARISE_TOOLS[typeof EnumAriseTools.ARISE_GIT_SUMMARY]['args']>>;
