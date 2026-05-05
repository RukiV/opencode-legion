/**
 * patchConsoleLogger 測試
 * patchConsoleLogger tests
 *
 * ⚠️ 已棄用 - 此為歷史參考實作測試
 * ⚠️ Deprecated - These are historical reference implementation tests
 *
 * 測試 patchConsoleLogger 的功能與限制
 * Tests for patchConsoleLogger functionality and limitations
 *
 * @deprecated 建議使用 wrapConsoleLogger 的測試
 * @see src/tools/debug-control.test.ts
 *
 * 參考實作位置：test/lib/impl/patch-console-logger-reference.ts
 */

/// <reference types="bun" />
import { describe, expect, it, beforeEach } from "bun:test";
import { consoleLogger } from "debug-color2/logger";
import {
	patchConsoleLogger,
	setLogLevel,
	setDebugEnabled,
	getLogLevel,
	canLog,
	resetDebugControl,
} from "../lib/impl/patch-console-logger-reference";
import { EnumLogLevel } from "../../src/types/enum-opencode";

describe("patchConsoleLogger (deprecated)", () =>
{
	// 每個測試前重置狀態
	beforeEach(() =>
	{
		resetDebugControl();
	});

	describe("基本功能 / Basic functionality", () =>
	{
		it("should patch consoleLogger methods", () =>
		{
			// 呼叫 patchConsoleLogger 前，consoleLogger 應該未被修補
			// 修補後，方法應該被包裝
			patchConsoleLogger();

			// patchConsoleLogger 應該成功執行
			expect(() => patchConsoleLogger()).not.toThrow();
		});

		it("should filter methods based on log level", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Error);

			// Error 等級應該能輸出
			expect(canLog(EnumLogLevel.Error)).toBe(true);

			// Info 等級不應該輸出
			expect(canLog(EnumLogLevel.Info)).toBe(false);
		});

		it("should respect debug enabled state", () =>
		{
			setDebugEnabled(false);
			expect(canLog(EnumLogLevel.Error)).toBe(false);

			setDebugEnabled(true);
			expect(canLog(EnumLogLevel.Error)).toBe(true);
		});
	});

	describe("日誌級別過濾 / Log level filtering", () =>
	{
		it("should allow Error level when set to Error", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Error);

			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Warn)).toBe(false);
			expect(canLog(EnumLogLevel.Info)).toBe(false);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);
		});

		it("should allow Error and Warn when set to Warn", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Warn);

			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Warn)).toBe(true);
			expect(canLog(EnumLogLevel.Info)).toBe(false);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);
		});

		it("should allow Error, Warn, Info when set to Info", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Info);

			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Warn)).toBe(true);
			expect(canLog(EnumLogLevel.Info)).toBe(true);
			expect(canLog(EnumLogLevel.Debug)).toBe(false);
		});

		it("should allow all levels when set to Debug", () =>
		{
			setDebugEnabled(true);
			setLogLevel(EnumLogLevel.Debug);

			expect(canLog(EnumLogLevel.Error)).toBe(true);
			expect(canLog(EnumLogLevel.Warn)).toBe(true);
			expect(canLog(EnumLogLevel.Info)).toBe(true);
			expect(canLog(EnumLogLevel.Debug)).toBe(true);
		});
	});

	describe("setLogLevel / getLogLevel", () =>
	{
		it("should set and get log level", () =>
		{
			setLogLevel(EnumLogLevel.Error);
			expect(getLogLevel()).toBe(EnumLogLevel.Error);

			setLogLevel(EnumLogLevel.Debug);
			expect(getLogLevel()).toBe(EnumLogLevel.Debug);
		});

		it("should default to warn level after reset", () =>
		{
			resetDebugControl();
			expect(getLogLevel()).toBe(EnumLogLevel.Warn);
		});
	});

	describe("限制說明 / Limitation notes", () =>
	{
		it("should document chain call limitation", () =>
		{
			// patchConsoleLogger 的已知限制：
			// - 不支援鏈式呼叫（如 consoleLogger.yellow.log）
			// - 因為直接修改方法，無法保留對原始物件的引用
			//
			// 這是 patchConsoleLogger 與 wrapConsoleLogger 的主要差異
			// wrapConsoleLogger 使用 Proxy 支援完整的鏈式呼叫

			// 驗證 consoleLogger 存在
			expect(consoleLogger).toBeDefined();

			// 驗證 patchConsoleLogger 已匯出
			expect(typeof patchConsoleLogger).toBe("function");

			// 驗證 canLog 函式已匯出
			expect(typeof canLog).toBe("function");
		});
	});
});
