/**
 * Schema Helper Functions Tests
 * 結構描述輔助函數測試
 *
 * 測試 getPollInterval、getRetryDelayIncrement、getRetryDelayMax 函數的行為
 * Tests the behavior of getPollInterval, getRetryDelayIncrement, and getRetryDelayMax functions
 *
 * 測試重點：
 * 1. 預設常數的正確性
 * 2. 配置層級的優先順序：agent > background > default
 * 3. 各類設定的回退邏輯
 *
 * Test focus areas:
 * 1. Correctness of default constants
 * 2. Configuration priority: agent > background > default
 * 3. Fallback logic for various settings
 */

import { describe, expect, test } from "bun:test";
import {
	DEFAULT_POLL_INTERVAL,
	DEFAULT_RETRY_DELAY_INCREMENT,
	DEFAULT_RETRY_DELAY_MAX,
} from "../types/const-default";
import { type IAriseConfig } from "./schema";
import {
	getPollInterval,
	getRetryDelayIncrement,
	getRetryDelayMax,
} from "./getters";
import { EnumShadowSubAgentsName } from "../types/enums";

/**
 * 預設常數測試
 * Default constants tests
 */
describe("Default Constants", () =>
{
	test("DEFAULT_POLL_INTERVAL is 2000", () =>
	{
		/** 輪詢間隔預設為 2000 毫秒 / Default polling interval is 2000ms */
		expect(DEFAULT_POLL_INTERVAL).toBe(2000);
	});

	test("DEFAULT_RETRY_DELAY_INCREMENT is 5000", () =>
	{
		/** 重試延遲遞增量預設為 5000 毫秒 / Default retry delay increment is 5000ms */
		expect(DEFAULT_RETRY_DELAY_INCREMENT).toBe(5000);
	});

	test("DEFAULT_RETRY_DELAY_MAX is 60000", () =>
	{
		/** 重試延遲最大值預設為 60000 毫秒 / Default max retry delay is 60000ms */
		expect(DEFAULT_RETRY_DELAY_MAX).toBe(60000);
	});
});

/**
 * getPollInterval 函數測試
 * getPollInterval function tests
 */
describe("getPollInterval", () =>
{
	test("returns default when no config provided", () =>
	{
		/** 空配置回退至預設值 / Empty config falls back to default */
		const config: IAriseConfig = {};
		const result = getPollInterval(config);
		expect(result).toBe(DEFAULT_POLL_INTERVAL);
	});

	test("returns default when no background config", () =>
	{
		/** 只有 show_banner 設定，background 未定義 / Only show_banner set, background undefined */
		const config: IAriseConfig = {
			show_banner: true,
		};
		const result = getPollInterval(config);
		expect(result).toBe(DEFAULT_POLL_INTERVAL);
	});

	test("returns background.poll_interval when set", () =>
	{
		/** 從 background 設定取得輪詢間隔 / Get polling interval from background setting */
		const config: IAriseConfig = {
			background: {
				poll_interval: 5000,
				retry_delay_increment: 1000,
				retry_delay_max: 30000,
			},
		};
		const result = getPollInterval(config);
		expect(result).toBe(5000);
	});

	test("agent setting overrides background setting", () =>
	{
		/** Agent 設定優先於 background 設定 / Agent setting takes priority over background setting */
		const config = {
			background: {
				poll_interval: 5000,
				retry_delay_increment: 1000,
				retry_delay_max: 30000,
			},
			agents: {
				[EnumShadowSubAgentsName.Beru]: {
					poll_interval: 1000,
				},
			},
		} as IAriseConfig;
		const result = getPollInterval(config, EnumShadowSubAgentsName.Beru);
		expect(result).toBe(1000);
	});

	test("returns background when agent not found", () =>
	{
		/** 查詢的 agent 未定義設定時，回退至 background / Falls back to background when queried agent has no setting */
		const config = {
			background: {
				poll_interval: 5000,
				retry_delay_increment: 1000,
				retry_delay_max: 30000,
			},
			agents: {
				[EnumShadowSubAgentsName.Igris]: {
					poll_interval: 1000,
				},
			},
		} as IAriseConfig;
		const result = getPollInterval(config, EnumShadowSubAgentsName.Beru);
		expect(result).toBe(5000);
	});
});

/**
 * getRetryDelayIncrement 函數測試
 * getRetryDelayIncrement function tests
 */
describe("getRetryDelayIncrement", () =>
{
	test("returns default when no config provided", () =>
	{
		const config: IAriseConfig = {};
		const result = getRetryDelayIncrement(config);
		expect(result).toBe(DEFAULT_RETRY_DELAY_INCREMENT);
	});

	test("returns background.retry_delay_increment when set", () =>
	{
		const config: IAriseConfig = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 10000,
				retry_delay_max: 60000,
			},
		};
		const result = getRetryDelayIncrement(config);
		expect(result).toBe(10000);
	});

	test("agent setting overrides background setting", () =>
	{
		const config = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 10000,
				retry_delay_max: 60000,
			},
			agents: {
				[EnumShadowSubAgentsName.Tank]: {
					retry_delay_increment: 2000,
				},
			},
		} as IAriseConfig;
		const result = getRetryDelayIncrement(config, EnumShadowSubAgentsName.Tank);
		expect(result).toBe(2000);
	});
});

/**
 * getRetryDelayMax 函數測試
 * getRetryDelayMax function tests
 */
describe("getRetryDelayMax", () =>
{
	test("returns default when no config provided", () =>
	{
		const config: IAriseConfig = {};
		const result = getRetryDelayMax(config);
		expect(result).toBe(DEFAULT_RETRY_DELAY_MAX);
	});

	test("returns background.retry_delay_max when set", () =>
	{
		const config: IAriseConfig = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 5000,
				retry_delay_max: 120000,
			},
		};
		const result = getRetryDelayMax(config);
		expect(result).toBe(120000);
	});

	test("agent setting overrides background setting", () =>
	{
		const config = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 5000,
				retry_delay_max: 120000,
			},
			agents: {
				[EnumShadowSubAgentsName.Bellion]: {
					retry_delay_max: 30000,
				},
			},
		} as IAriseConfig;
		const result = getRetryDelayMax(config, EnumShadowSubAgentsName.Bellion);
		expect(result).toBe(30000);
	});
});

/**
 * 優先順序測試
 * Priority order tests
 *
 * 驗證設定的優先順序：agent > background > default
 * Verifies the priority of settings: agent > background > default
 */
describe("Priority order", () =>
{
	test("agent > background > default for poll_interval", () =>
	{
		const config = {
			background: {
				poll_interval: 5000,
				retry_delay_increment: 1000,
				retry_delay_max: 30000,
			},
			agents: {
				[EnumShadowSubAgentsName.Tusk]: {
					poll_interval: 500,
				},
			},
		} as IAriseConfig;
		/** Tusk 有 agent 設定，使用該設定 / Tusk has agent setting, use that */
		expect(getPollInterval(config, EnumShadowSubAgentsName.Tusk)).toBe(500);
		/** Beru 沒有 agent 設定，回退至 background / Beru has no agent setting, fall back to background */
		expect(getPollInterval(config, EnumShadowSubAgentsName.Beru)).toBe(5000);
		/** 空配置使用預設值 / Empty config uses default */
		expect(getPollInterval({})).toBe(DEFAULT_POLL_INTERVAL);
	});

	test("agent > background > default for retry_delay_increment", () =>
	{
		const config = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 10000,
				retry_delay_max: 60000,
			},
			agents: {
				[EnumShadowSubAgentsName.ShadowSovereign]: {
					retry_delay_increment: 3000,
				},
			},
		} as IAriseConfig;
		expect(getRetryDelayIncrement(config, EnumShadowSubAgentsName.ShadowSovereign)).toBe(3000);
		expect(getRetryDelayIncrement(config, EnumShadowSubAgentsName.Beru)).toBe(10000);
		expect(getRetryDelayIncrement({})).toBe(DEFAULT_RETRY_DELAY_INCREMENT);
	});

	test("agent > background > default for retry_delay_max", () =>
	{
		const config = {
			background: {
				poll_interval: 2000,
				retry_delay_increment: 5000,
				retry_delay_max: 120000,
			},
			agents: {
				[EnumShadowSubAgentsName.Igris]: {
					retry_delay_max: 15000,
				},
			},
		} as IAriseConfig;
		expect(getRetryDelayMax(config, EnumShadowSubAgentsName.Igris)).toBe(15000);
		expect(getRetryDelayMax(config, EnumShadowSubAgentsName.Tank)).toBe(120000);
		expect(getRetryDelayMax({})).toBe(DEFAULT_RETRY_DELAY_MAX);
	});
});
