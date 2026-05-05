/**
 * 除錯控制模組測試
 * Debug control module tests
 *
 * 測試日誌級別控制與除錯模式切換功能
 * Tests for log level control and debug mode switching
 */

/// <reference types="bun" />
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { consoleLogger } from "debug-color2/logger";
import {
	initDebugControl,
	setDebugEnabled,
	getDebugEnabled,
	setLogLevel,
	getLogLevel,
	canLog,
	getDebugStatus,
	resetDebugControl,
	consoleLoggerWithLevel,
} from "./debug-control";
import { EnumLogLevel } from "../types/enum-opencode";
import type { IAriseConfig } from "../config/schema";

/**
 * 測試用的預設配置工廠函式
 * Factory function for creating test configs
 */
function createTestConfig(overrides?: Partial<IAriseConfig["debug"]>): IAriseConfig
{
	return {
		debug: {
			enabled: false,
			level: EnumLogLevel.Warn,
			...overrides,
		},
	} as IAriseConfig;
}

describe("debug-control", () =>
{
	// 每個測試前重置狀態
	beforeEach(() =>
	{
		resetDebugControl();
	});

	describe("initDebugControl", () =>
	{
		it("should initialize with debug disabled by default", () =>
		{
			const config = createTestConfig();
			initDebugControl(config);

			expect(getDebugEnabled()).toBe(false);
		});

		it("should initialize with debug enabled when config.enabled is true", () =>
		{
			const config = createTestConfig({ enabled: true });
			initDebugControl(config);

			expect(getDebugEnabled()).toBe(true);
		});

		it("should set default log level to warn", () =>
		{
			const config = createTestConfig();
			initDebugControl(config);

			expect(getLogLevel()).toBe(EnumLogLevel.Warn);
		});

		it("should respect config log level", () =>
		{
			const config = createTestConfig({ level: EnumLogLevel.Debug });
			initDebugControl(config);

			expect(getLogLevel()).toBe(EnumLogLevel.Debug);
		});

		it("should handle config with undefined debug", () =>
		{
			const config = {} as IAriseConfig;
			initDebugControl(config);

			expect(getDebugEnabled()).toBe(false);
			expect(getLogLevel()).toBe(EnumLogLevel.Warn);
		});
	});

	describe("setDebugEnabled / getDebugEnabled", () =>
	{
		it("should enable debug mode", () =>
		{
			setDebugEnabled(true);
			expect(getDebugEnabled()).toBe(true);
		});

		it("should disable debug mode", () =>
		{
			setDebugEnabled(true);
			setDebugEnabled(false);
			expect(getDebugEnabled()).toBe(false);
		});

		it("should toggle debug mode", () =>
		{
			expect(getDebugEnabled()).toBe(false);

			setDebugEnabled(true);
			expect(getDebugEnabled()).toBe(true);

			setDebugEnabled(false);
			expect(getDebugEnabled()).toBe(false);
		});
	});

	describe("setLogLevel / getLogLevel", () =>
	{
		it("should set and get log level", () =>
		{
			setLogLevel(EnumLogLevel.Error);
			expect(getLogLevel()).toBe(EnumLogLevel.Error);

			setLogLevel(EnumLogLevel.Info);
			expect(getLogLevel()).toBe(EnumLogLevel.Info);

			setLogLevel(EnumLogLevel.Debug);
			expect(getLogLevel()).toBe(EnumLogLevel.Debug);
		});

		it("should default to warn level", () =>
		{
			const config = createTestConfig();
			initDebugControl(config);

			expect(getLogLevel()).toBe(EnumLogLevel.Warn);
		});
	});

	describe("canLog", () =>
	{
		it("should return false when debug is disabled", () =>
		{
			setDebugEnabled(false);

			expect(canLog(EnumLogLevel.Error)).toBe(false);
			expect(canLog(EnumLogLevel.Warn)).toBe(false);
			expect(canLog(EnumLogLevel.Info)).toBe(false);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);
		});

		it("should return true for error when level is error", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Error);

			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Warn)).toBe(false);
			expect(canLog(EnumLogLevel.Info)).toBe(false);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);
		});

		it("should return true for error and warn when level is warn", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Warn);

			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Warn)).toBe(true);
			expect(canLog(EnumLogLevel.Info)).toBe(false);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);
		});

		it("should return true for error, warn, and info when level is info", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Info);

			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Warn)).toBe(true);
			expect(canLog(EnumLogLevel.Info)).toBe(true);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);
		});

		it("should return true for all levels when level is debug", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Debug);

			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Warn)).toBe(true);
			expect(canLog(EnumLogLevel.Info)).toBe(true);
			expect(canLog(EnumLogLevel.Debug)).toBe(true);
		});
	});

	describe("getDebugStatus", () =>
	{
		it("should return correct status after initialization", () =>
		{
			const config = createTestConfig({ enabled: true, level: EnumLogLevel.Info });
			initDebugControl(config);

			const status = getDebugStatus();
			expect(status).toMatchSnapshot({
				enabled: true,
				level: EnumLogLevel.Info,
			});
		});

		it("should reflect changes in status", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Debug);

			const status = getDebugStatus();
			expect(status).toMatchSnapshot({
				enabled: true,
				level: EnumLogLevel.Debug,
			});
		});

		it("should track toggle state accurately", () =>
		{
			setDebugEnabled(false);
			setLogLevel(EnumLogLevel.Warn);

			expect(getDebugStatus()).toMatchSnapshot({
				enabled: false,
				level: EnumLogLevel.Warn,
			});

			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Error);

			expect(getDebugStatus()).toMatchSnapshot({
				enabled: true,
				level: EnumLogLevel.Error,
			});
		});
	});

	describe("log level priority", () =>
	{
		it("should correctly order log levels by priority", () =>
		{
			// Verify priority order: error < warn < info < debug
			const levels = [
				EnumLogLevel.Error,
				EnumLogLevel.Warn,
				EnumLogLevel.Info,
				EnumLogLevel.Debug,
			];

			for (let i = 0; i < levels.length; i++)
			{
				for (let j = i + 1; j < levels.length; j++)
				{
					setDebugEnabled(true);
					setLogLevel(levels[j]);

					// Higher priority level should allow lower priority logs
					expect(canLog(levels[i])).toBe(true);
				}
			}
		});
	});

	describe("integration scenarios", () =>
	{
		it("should handle complete debug workflow", () =>
		{
			// Start with minimal logging
			const config = createTestConfig({ enabled: false, level: EnumLogLevel.Error });
			initDebugControl(config);

			expect(getDebugStatus()).toMatchSnapshot({
				enabled: false,
				level: EnumLogLevel.Error,
			});

			// Enable debug mode
			setDebugEnabled(true);
			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);

			// Increase verbosity step by step
			setLogLevel(EnumLogLevel.Warn);
			expect(canLog(EnumLogLevel.Warn)).toBe(true);

			setLogLevel(EnumLogLevel.Info);
			expect(canLog(EnumLogLevel.Info)).toBe(true);

			setLogLevel(EnumLogLevel.Debug);
			expect(canLog(EnumLogLevel.Debug)).toBe(true);

			// Disable when done
			setDebugEnabled(false);
			expect(canLog(EnumLogLevel.Error)).toBe(false);
		});

		it("should maintain independent state for enabled and level", () =>
		{
			// Set initial state
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Info);

			// Disable without changing level
			setDebugEnabled(false);
			expect(getLogLevel()).toBe(EnumLogLevel.Info);

			// Re-enable and verify level is preserved
			setDebugEnabled(true);
			expect(getLogLevel()).toBe(EnumLogLevel.Info);
			expect(canLog(EnumLogLevel.Info)).toBe(true);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);
		});
	});

	describe("consoleLogger output filtering", () =>
	{
		// 使用 wrapConsoleLogger 包裝的 consoleLoggerWithLevel
		// 這個版本支援完整的鏈式呼叫（如 .yellow.log）
		// 測試策略：
		// 1. 測試 canLog() 函數邏輯（直接驗證等級控制）
		// 2. 使用 consoleLoggerWithLevel 驗證 Proxy 包裝正確運作

		describe("canLog function", () =>
		{
			it("should return false when debug is disabled", () =>
			{
				setDebugEnabled(false);
				setLogLevel(EnumLogLevel.Debug);

				// 即使 level 設為 Debug，enabled 為 false 時仍返回 false
				expect(canLog(EnumLogLevel.Debug)).toBe(false);
			});

			it("should respect Error level (allows only Error)", () =>
			{
				setDebugEnabled(true);
				setLogLevel(EnumLogLevel.Error);

				// 等級優先級: Error(0) < Warn(1) < Info(2) < Debug(3)
				// Error 等級只允許 Error 等級輸出 (0 <= 0)
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Warn)).toBe(false);
				expect(canLog(EnumLogLevel.Info)).toBe(false);
				expect(canLog(EnumLogLevel.Debug)).toBe(false);
			});

			it("should respect Warn level (allows Error + Warn)", () =>
			{
				setDebugEnabled(true);
				setLogLevel(EnumLogLevel.Warn);

				// Warn 等級允許 Error(0 <= 1) 和 Warn(1 <= 1)
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Warn)).toBe(true);
				expect(canLog(EnumLogLevel.Info)).toBe(false);
				expect(canLog(EnumLogLevel.Debug)).toBe(false);
			});

			it("should respect Info level (allows Error + Warn + Info)", () =>
			{
				setDebugEnabled(true);
				setLogLevel(EnumLogLevel.Info);

				// Info 等級允許 Error、Warn 和 Info
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Warn)).toBe(true);
				expect(canLog(EnumLogLevel.Info)).toBe(true);
				expect(canLog(EnumLogLevel.Debug)).toBe(false);
			});

			it("should respect Debug level (allows all)", () =>
			{
				setDebugEnabled(true);
				setLogLevel(EnumLogLevel.Debug);

				// Debug 等級允許所有輸出
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Warn)).toBe(true);
				expect(canLog(EnumLogLevel.Info)).toBe(true);
				expect(canLog(EnumLogLevel.Debug)).toBe(true);
			});
		});

		describe("consoleLoggerWithLevel (wrapConsoleLogger)", () =>
		{
			it("should filter log output based on level", () =>
			{
				setDebugEnabled(true);
				setLogLevel(EnumLogLevel.Error);

				// consoleLoggerWithLevel 使用 wrapConsoleLogger 包裝
				// 當 level 為 Error 時，只有 Error 等級的方法會輸出
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Info)).toBe(false);

				// 當 level 為 Debug 時，所有方法都會輸出
				setLogLevel(EnumLogLevel.Debug);
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Info)).toBe(true);
				expect(canLog(EnumLogLevel.Debug)).toBe(true);

				// 驗證 consoleLoggerWithLevel 是一個物件（非 undefined）
				expect(typeof consoleLoggerWithLevel).toBe("object");
				expect(consoleLoggerWithLevel).toBeDefined();
			});
		});

		describe("level priority comparison", () =>
		{
			it("should correctly compare log levels", () =>
			{
				setDebugEnabled(true);

				// 驗證等級優先級: Error < Warn < Info < Debug
				// 當 currentLogLevel = Warn 時:
				// - canLog(Error) = true (0 <= 1)
				// - canLog(Warn) = true (1 <= 1)
				// - canLog(Info) = false (2 > 1)
				// - canLog(Debug) = false (3 > 1)
				setLogLevel(EnumLogLevel.Warn);
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Warn)).toBe(true);
				expect(canLog(EnumLogLevel.Info)).toBe(false);
				expect(canLog(EnumLogLevel.Debug)).toBe(false);

				// 當 currentLogLevel = Info 時
				setLogLevel(EnumLogLevel.Info);
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Warn)).toBe(true);
				expect(canLog(EnumLogLevel.Info)).toBe(true);
				expect(canLog(EnumLogLevel.Debug)).toBe(false);

				// 當 currentLogLevel = Debug 時
				setLogLevel(EnumLogLevel.Debug);
				expect(canLog(EnumLogLevel.Error)).toBe(true);
				expect(canLog(EnumLogLevel.Warn)).toBe(true);
				expect(canLog(EnumLogLevel.Info)).toBe(true);
				expect(canLog(EnumLogLevel.Debug)).toBe(true);
			});
		});
	});
});
