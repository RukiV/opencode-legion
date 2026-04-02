/**
 * 高負載錯誤訊息測試資料集
 * High load error message test dataset
 *
 * 定義各種錯誤訊息的測試用例，用於統一測試 isHighLoadError
 * Defines test cases for various error messages, used to test isHighLoadError
 *
 * 定義格式 / Definition format:
 * - input: 錯誤訊息字串 / Error message string
 * - expected: 是否應匹配高負載模式 / Whether it should match high load pattern
 * - note: 備註（可選）/ Note (optional)
 */

/**
 * 高負載錯誤測試用例結構
 * High load error test case structure
 */
export interface IHighLoadErrorTestCase
{
	/** 測試用例名稱 / Test case name */
	name: string;
	/** 錯誤訊息字串 / Error message string */
	input: string;
	/** 是否應匹配高負載模式 / Whether it should match high load pattern */
	expected: boolean;
	/** 備註（可選）/ Note (optional) */
	note?: string;
}

/**
 * 高負載錯誤測試群組結構
 * High load error test group structure
 */
export interface IHighLoadErrorTestGroup
{
	/** 測試群組名稱 / Test group name */
	name: string;
	/** 測試用例陣列 / Test cases array */
	testCases: IHighLoadErrorTestCase[];
}

/** ==================== 應匹配的訊息 ==================== */
/** ==================== Messages that should match ==================== */

/**
 * 應匹配高負載模式的測試群組
 * Test group for messages that should match high load pattern
 */
export const shouldMatchGroups: IHighLoadErrorTestGroup[] = [
	{
		name: "英文高負載訊息",
		testCases: [
			{
				name: "matches 'under high load'",
				input: "The server cluster is currently under high load. Please retry after a short wait.",
				expected: true,
			},
			{
				name: "matches 'retry after'",
				input: "Rate limited. Retry after 30 seconds.",
				expected: true,
			},
			{
				name: "matches 'please wait'",
				input: "Too many requests. Please wait before retrying.",
				expected: true,
			},
		],
	},
	{
		name: "中文高負載訊息",
		testCases: [
			{
				name: "matches '高負載' (Chinese)",
				input: "伺服器目前處於高負載狀態，請稍後重試",
				expected: true,
			},
			{
				name: "matches '後重試' (Chinese)",
				input: "請求過於頻繁，請於後重試",
				expected: true,
			},
			{
				name: "matches '后重试' (Simplified Chinese)",
				input: "8 秒后重试",
				expected: true,
			},
		],
	},
	{
		name: "日文高負載訊息",
		testCases: [
			{
				name: "matches Japanese high load message with retry",
				input: "8秒後に再試行: サーバークラスターは現在、高負荷となっています。しばらくお待ちいただいてから再試行してください。ご協力ありがとうございます。(2064)（第3回試行）",
				expected: true,
			},
		],
	},
	{
		name: "大小寫不敏感",
		testCases: [
			{
				name: "matches case insensitive 'UNDER HIGH LOAD'",
				input: "UNDER HIGH LOAD detected",
				expected: true,
			},
			{
				name: "matches case insensitive 'WAIT'",
				input: "Please WAIT for a moment",
				expected: true,
			},
		],
	},
	{
		name: "Provider 錯誤訊息",
		testCases: [
			{
				name: "matches 'Provider returned error' with 'rate-limited'",
				input: "Provider returned error\n\nRetrying in 2s: [Z.AI] z-ai/glm-4.5-air:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations (Attempt 1)",
				expected: true,
				note: "OpenRouter rate limit 錯誤訊息 / OpenRouter rate limit error message",
			},
			{
				name: "matches 'Provider error' without 'returned'",
				input: "Provider error: service unavailable",
				expected: true,
			},
			{
				name: "matches 'rate limited' (with space)",
				input: "API rate limited. Try again later.",
				expected: true,
			},
			{
				name: "matches 'rate limits'",
				input: "Exceeded rate limits for this endpoint",
				expected: true,
			},
		],
	},
];

/** ==================== 不應匹配的訊息 ==================== */
/** ==================== Messages that should NOT match ==================== */

/**
 * 不應匹配高負載模式的測試群組
 * Test group for messages that should NOT match high load pattern
 */
export const shouldNotMatchGroups: IHighLoadErrorTestGroup[] = [
	{
		name: "一般錯誤訊息",
		testCases: [
			{
				name: "does not match generic errors",
				input: "Connection refused",
				expected: false,
			},
			{
				name: "does not match timeout errors",
				input: "Request timeout after 30000ms",
				expected: false,
			},
			{
				name: "does not match auth errors",
				input: "Unauthorized: invalid API key",
				expected: false,
			},
		],
	},
	{
		name: "空值與無效輸入",
		testCases: [
			{
				name: "does not match empty string",
				input: "",
				expected: false,
			},
			{
				name: "does not match null (as string)",
				input: "null",
				expected: false,
				note: "null 值由 isHighLoadError 內部處理，此處測試字串 'null'",
			},
			{
				name: "does not match undefined (as string)",
				input: "undefined",
				expected: false,
				note: "undefined 值由 isHighLoadError 內部處理，此處測試字串 'undefined'",
			},
		],
	},
];
