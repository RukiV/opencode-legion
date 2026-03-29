/**
 * AriseConfigSchema 導出方法測試
 * AriseConfigSchema export methods test
 *
 * 測試兩種導出方法：
 * 1. 從 JSON Schema 提取默認值 - 先轉換為 JSON Schema，再提取 default 值
 * 2. 從 Zod Schema 直接提取默認值 - 直接從 Zod Schema 的 def 提取默認值
 *
 * 兩種方法都能從 AriseConfigSchema 導出與 DEFAULT_CONFIG 等價的結果
 * Both methods can export results equivalent to DEFAULT_CONFIG from AriseConfigSchema
 */

/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { z } from "zod";
import {
	AriseConfigSchema,
	DEFAULT_CONFIG,
	type IAriseConfig,
} from "../../src/config/schema";
import { extractDefaultsFromJSONSchema, extractDefaultsFromSchema } from "../../src/config/zod-defaults";

/**
 * 方法一：從 JSON Schema 提取默認值
 * Method 1: Extract defaults from JSON Schema
 *
 * 流程：
 * 1. 使用 z.toJSONSchema(AriseConfigSchema) 生成 JSON Schema
 * 2. 遞迴遍歷 JSON Schema，提取所有包含 "default" 屬性的值
 * 3. 返回包含所有默認值的物件
 *
 * 優點：
 * - 使用 Zod 官方的 JSON Schema 生成 API
 * - 結果與 JSON Schema 規範一致
 *
 * 缺點：
 * - 需要先生成 JSON Schema，有額外開銷
 * - JSON Schema 中的 default 只是「建議」值，不是強制值
 */
describe("從 JSON Schema 提取默認值", () =>
{
	it("應該與 DEFAULT_CONFIG 等價", () =>
	{
		const defaults = extractDefaultsFromJSONSchema(AriseConfigSchema) satisfies IAriseConfig;
		const config = DEFAULT_CONFIG;

		/**
		 * 驗證各個字段與 DEFAULT_CONFIG 匹配
		 * Verify each field matches DEFAULT_CONFIG
		 */
		expect(defaults.show_banner).toBe(config.show_banner);
		expect(defaults.banner_every_session).toBe(config.banner_every_session);
		expect(defaults.output_shaping).toEqual(config.output_shaping);
		expect(defaults.compaction).toEqual(config.compaction);
		expect(defaults.background?.poll_interval).toBe(config.background?.poll_interval);
		expect(defaults.debug?.enabled).toBe(config.debug?.enabled);
		expect(defaults.debug?.level).toBe(config.debug?.level);

		/**
		 * 快照用於未來回歸測試
		 * Snapshot for future regression testing
		 */
		expect(defaults).toMatchSnapshot();
	});
});

/**
 * 方法二：從 Zod Schema 直接提取默認值（不通過 JSON Schema）
 * Method 2: Extract defaults directly from Zod Schema (without JSON Schema)
 *
 * 流程：
 * 1. 使用 schema.def 獲取公開 API 定義
 * 2. 通過類型守衛判斷 schema 類型：
 *    - $ZodDefaultDef → 直接返回 defaultValue
 *    - $ZodOptionalDef → 遞迴處理內部類型
 *    - ZodObject → 遞迴處理每個屬性
 * 3. 返回包含所有默認值的物件
 *
 * 優點：
 * - 直接從 Zod Schema 提取，無需生成 JSON Schema
 * - 使用公開 API（.def），避免使用已棄用的 _def
 *
 * 缺點：
 * - 需要理解 Zod 內部結構
 */
describe("從 Zod Schema 直接提取默認值", () =>
{
	it("應該與 DEFAULT_CONFIG 等價", () =>
	{
		const defaults = extractDefaultsFromSchema(AriseConfigSchema) satisfies IAriseConfig;
		const config = DEFAULT_CONFIG;

		/**
		 * 驗證各個字段與 DEFAULT_CONFIG 匹配
		 * Verify each field matches DEFAULT_CONFIG
		 */
		expect(defaults.show_banner).toBe(config.show_banner);
		expect(defaults.banner_every_session).toBe(config.banner_every_session);
		expect(defaults.output_shaping).toEqual(config.output_shaping);
		expect(defaults.compaction).toEqual(config.compaction);
		expect(defaults.background?.poll_interval).toBe(config.background?.poll_interval);
		expect(defaults.debug?.enabled).toBe(config.debug?.enabled);
		expect(defaults.debug?.level).toBe(config.debug?.level);

		/**
		 * 快照用於未來回歸測試
		 * Snapshot for future regression testing
		 */
		expect(defaults).toMatchSnapshot();
	});
});
