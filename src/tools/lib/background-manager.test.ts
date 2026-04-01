/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { HIGH_LOAD_BONUS_DELAY_MS } from "../../types/const-default";
import { HIGH_LOAD_PATTERN } from "../../types/regexp";
import { isHighLoadError } from "../../utils/string/regexp";

/**
 * 高負載偵測測試
 * High load detection tests
 */
describe("isHighLoadError", () =>
{
	/** ==================== 應匹配的訊息 ==================== */
	/** ==================== Messages that should match ==================== */
	describe("should detect high load messages", () =>
	{
		it("matches 'under high load'", () =>
		{
			expect(
				isHighLoadError(
					"The server cluster is currently under high load. Please retry after a short wait."
				)
			).toBe(true);
		});

		it("matches 'retry after'", () =>
		{
			expect(
				isHighLoadError("Rate limited. Retry after 30 seconds.")
			).toBe(true);
		});

		it("matches 'please wait'", () =>
		{
			expect(
				isHighLoadError("Too many requests. Please wait before retrying.")
			).toBe(true);
		});

		it("matches '高負載' (Chinese)", () =>
		{
			expect(
				isHighLoadError("伺服器目前處於高負載狀態，請稍後重試")
			).toBe(true);
		});

		it("matches '後重試' (Chinese)", () =>
		{
			expect(
				isHighLoadError("請求過於頻繁，請於後重試")
			).toBe(true);
		});

		it("matches '后重试' (Simplified Chinese)", () =>
		{
			expect(
				isHighLoadError("8 秒后重试")
			).toBe(true);
		});

		it("matches Japanese high load message with retry", () =>
		{
			expect(
				isHighLoadError("8秒後に再試行: サーバークラスターは現在、高負荷となっています。しばらくお待ちいただいてから再試行してください。ご協力ありがとうございます。(2064)（第3回試行）")
			).toBe(true);
		});

		it("matches case insensitive", () =>
		{
			expect(
				isHighLoadError("UNDER HIGH LOAD detected")
			).toBe(true);
			expect(
				isHighLoadError("Please WAIT for a moment")
			).toBe(true);
		});
	});

	/** ==================== 不應匹配的訊息 ==================== */
	/** ==================== Messages that should NOT match ==================== */
	describe("should NOT match non-high-load errors", () =>
	{
		it("does not match generic errors", () =>
		{
			expect(
				isHighLoadError("Connection refused")
			).toBe(false);
		});

		it("does not match timeout errors", () =>
		{
			expect(
				isHighLoadError("Request timeout after 30000ms")
			).toBe(false);
		});

		it("does not match auth errors", () =>
		{
			expect(
				isHighLoadError("Unauthorized: invalid API key")
			).toBe(false);
		});

		it("does not match empty string", () =>
		{
			expect(isHighLoadError("")).toBe(false);
		});

		it("does not match null", () =>
		{
			expect(isHighLoadError(null)).toBe(false);
		});

		it("does not match undefined", () =>
		{
			expect(isHighLoadError(undefined)).toBe(false);
		});
	});

	/** ==================== 常數驗證 ==================== */
	/** ==================== Constant verification ==================== */
	describe("constants", () =>
	{
		it("HIGH_LOAD_BONUS_DELAY_MS is 10 seconds", () =>
		{
			expect(HIGH_LOAD_BONUS_DELAY_MS).toBe(10_000);
		});

		it("HIGH_LOAD_PATTERN is a RegExp", () =>
		{
			expect(HIGH_LOAD_PATTERN).toBeInstanceOf(RegExp);
			expect(HIGH_LOAD_PATTERN).toMatchSnapshot();
		});
	});
});
