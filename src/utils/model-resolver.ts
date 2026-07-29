/**
 * Model resolver utilities
 * 模型解析工具函數
 *
 * 本模組負責處理模型字串的解析、標準化、AUTO 檢測與 fallback 邏輯。
 * This module handles model string parsing, normalization, AUTO detection, and fallback logic.
 *
 * 模型指定流程概覽 / Model specification flow overview:
 * 1. 用戶透過工具參數或 config 檔案指定模型 → userInput / config
 * 2. getEffectiveModelWithFallback 決定有效模型 → effectiveModel
 * 3. parseModelString 解析並檢測 AUTO → IParseModelStringResult
 * 4. resolveModelContext 組裝完整解析流程 → IModelBody
 * 5. 最終傳入 OpenCode SDK 的 session.prompt / session.promptAsync
 */

import { AUTO_MODEL, DEFAULT_MODEL } from "../types/const-default";
import type { IAriseConfig } from "../config/schema";
import { SHADOW_AGENTS } from "../agents/shadows";
import { EnumDetectAutoModelBody, type IAllShadowAgentsName } from "../types/enums";
import { _isEmpty, _isNotEmpty, _trimLazy, normalizeModelString } from "./string/string-utils";
import { IModelBody } from "../types/types-opencode";
import { runtimeCache } from "./session/session-cache";

/**
 * 預設模型
 * Default model fallback
 *
 * 當沒有指定任何模型時使用的 fallback
 * Used when no model is specified at all
 */
export { DEFAULT_MODEL } from "../types/const-default";

// ============================================================
// 模型字串格式化 / Model String Formatting
// ============================================================

/**
 * 將 IModelBody 格式化為可讀的字串描述
 * Format IModelBody into readable string description
 *
 * @param modelBody - 模型主體物件 / Model body object
 * @returns 格式化後的字串（如 "openai/gpt-4o"）/ Formatted string (e.g., "openai/gpt-4o")
 *
 * @example
 * formatModelBodyDescription({ providerID: "openai", modelID: "gpt-4o" });
 * // Returns: "openai/gpt-4o"
 */
export function formatModelBodyDescription(modelBody: IModelBody): string
{
	return `${modelBody.providerID}/${modelBody.modelID}`;
}

// ============================================================
// 配置模型讀取 / Config Model Reading
// ============================================================

/**
 * 從 Arise 配置中取得指定 Shadow Agent 的模型設定
 * Get model setting for a specific Shadow Agent from Arise config
 *
 * @param config - Arise 配置物件 / Arise config object
 * @param shadowName - Shadow Agent 名稱 / Shadow Agent name
 * @returns 配置中指定的模型字串，若無則回傳 undefined / Model string from config, or undefined
 *
 * @example
 * getModelFromConfig(config, EnumShadowSubAgentsName.Nightmare);
 * // Returns: "anthropic/claude-sonnet-4" 或 undefined
 */
export function getModelFromConfig(
	config: IAriseConfig | undefined,
	shadowName: IAllShadowAgentsName,
): string | undefined
{
	return config?.agents?.[shadowName]?.model;
}

// ============================================================
// 模型字串解析 / Model String Parsing
// ============================================================

/**
 * parseModelString 的回傳結果
 * Return result of parseModelString
 *
 * detectAutoModelBody 數值說明：
 * detectAutoModelBody value explanation:
 *
 * | 數值 | 意義 | 使用情境 |
 * |------|------|----------|
 * | 0 | 完整模型 | providerID 和 modelID 都有效，可直接使用 |
 * |   | Full model | Both providerID and modelID are valid, ready to use |
 * | 1 | 完全 AUTO | 兩者都是 AUTO、空白、undefined、null 或字串 "undefined"/"null" |
 * |   | Fully AUTO | Both are AUTO, empty, undefined, null, or string "undefined"/"null" |
 * | 2 | provider 為 AUTO | 僅 modelID 有效，providerID 需要自動搜尋 |
 * |   | Provider is AUTO | Only modelID is valid, providerID needs auto-discovery |
 * | 3 | modelID 為 AUTO | 僅 providerID 有效，modelID 需要自動搜尋 |
 * |   | modelID is AUTO | Only providerID is valid, modelID needs auto-discovery |
 */
export type IParseModelStringResult = ReturnType<typeof _detectAutoModelBody>;

/**
 * 解析模型字串為 providerID 和 modelID
 * Parse model string into providerID and modelID
 *
 * 這是模型解析的核心函數，負責將用戶輸入的模型字串轉換為結構化資料。
 * This is the core parsing function that converts user input model strings into structured data.
 *
 * 處理流程：
 * Processing flow:
 *
 * ```
 * 輸入 (Input)
 *   │
 *   ▼
 * ┌─────────────────────────┐
 * │ 1. _trimLazy            │  去除首尾空白 / Trim leading/trailing whitespace
 * │    " AUTO " → "AUTO"    │
 * └────────┬────────────────┘
 *          ▼
 * ┌─────────────────────────┐
 * │ 2. _isEmpty 檢查        │  空值 → detectAutoModelBody=1
 * │    "" → undefined       │  Empty → detectAutoModelBody=1
 * └────────┬────────────────┘
 *          ▼
 * ┌─────────────────────────┐
 * │ 3. normalizeModelString │  去除開頭/結尾的 /、/.、./
 * │    "AUTO/." → "AUTO"    │  Remove leading/trailing /, /., ./
 * └────────┬────────────────┘
 *          ▼
 * ┌─────────────────────────┐
 * │ 4. _isAutoModel 檢查    │  寬鬆匹配 AUTO（trim + toUpperCase）
 * │    "AUTO" → type=1      │  Lenient AUTO match
 * └────────┬────────────────┘
 *          ▼
 * ┌─────────────────────────┐
 * │ 5. split("/") 解析      │  分割為 providerID / modelID
 * │    "openai/gpt-4"       │  Split into providerID / modelID
 * └────────┬────────────────┘
 *          ▼
 * ┌─────────────────────────┐
 * │ 6. 分別 normalize       │  對 providerID 和 modelID 各自標準化
 * │    + _detectAutoModelBody│  Normalize each + detect AUTO
 * └────────┬────────────────┘
 *          ▼
 * 輸出 (Output): IParseModelStringResult
 *   { detectAutoModelBody: 0|1|2|3, modelBody: {...} | undefined }
 * ```
 *
 * @param model - 模型字串，格式為 "provider/modelID" / Model string in "provider/modelID" format
 * @returns 包含 detectAutoModelBody 和 modelBody 的結果物件 / Result object
 *
 * @example
 * // 完整模型解析
 * parseModelString("openai/gpt-4o");
 * // Returns: { detectAutoModelBody: 0, modelBody: { providerID: "openai", modelID: "gpt-4o" } }
 *
 * // AUTO 變體 — 全部回傳 detectAutoModelBody=1
 * parseModelString("AUTO");       // 標準格式
 * parseModelString("auto");       // 小寫
 * parseModelString(" AUTO ");     // 含空白
 * parseModelString("AUTO/.");     // 尾隨 /.
 * parseModelString("/AUTO");      // 開頭 /
 * parseModelString("./AUTO/.");   // 多重分隔符
 *
 * // 部分 AUTO — detectAutoModelBody=2 或 3
 * parseModelString("AUTO/gpt-4");       // { detectAutoModelBody: 2, modelBody: { providerID: undefined, modelID: "gpt-4" } }
 * parseModelString("openai/AUTO");      // { detectAutoModelBody: 3, modelBody: { providerID: "openai", modelID: undefined } }
 *
 * // 無效輸入 — detectAutoModelBody=1
 * parseModelString(undefined);          // { detectAutoModelBody: 1, modelBody: undefined }
 * parseModelString("");                 // { detectAutoModelBody: 1, modelBody: undefined }
 * parseModelString("claude-sonnet-4");  // 缺少斜線 → { detectAutoModelBody: 1, modelBody: undefined }
 */
export function parseModelString(
	model: string | undefined,
	opts?: {
		throwError?: boolean;
	},
): IParseModelStringResult
{
	model = _trimLazy(model);

	if (_isEmpty(model))
	{
		return _detectAutoModelBody(void 0);
	}

	/** 步驟 1：標準化模型字串（去除開頭/結尾的多餘分隔符） */
	/** Step 1: Normalize model string (remove leading/trailing excess separators) */
	const normalized = model.replace(/^[.\s]+|[.\s]+$/g, '');

	/** 步驟 2：標準化後再次檢查 AUTO（處理 "AUTO/."、"/AUTO" 等變體） */
	/** Step 2: Re-check AUTO after normalization (handles variants like "AUTO/.", "/AUTO") */
	if (_isAutoModel(normalized))
	{
		return _detectAutoModelBody(void 0);
	}

	let [providerID, modelID, ...rest] = normalized.split("/");
	// if (!providerID || !modelID)
	// {
	// 	return _detectAutoModelBody({
	// 		providerID,
	// 		modelID: modelID?.length ? [modelID, ...rest].join('/') : modelID,
	// 	});
	// }

	if (rest.length)
	{
		if (!modelID?.length)
		{
			throw new RangeError(`Invalid model string "${model}": empty segment detected (consecutive slashes or leading/trailing slash)`);
		}

		for (let n of rest)
		{
			if (n?.length)
			{
				modelID += '/' + n;
			}
			else if (opts?.throwError)
			{
				// Double slash (//) or trailing slash (/xxx/) produces empty string in split
				throw new RangeError(`Invalid model string "${model}": empty segment detected (consecutive slashes or leading/trailing slash)`);
			}
		}
	}

	if (!model.includes('/'))
	{
		[modelID, providerID] = [providerID, void 0 as any];
	}

	/**
	 * 步驟 3：對 providerID 和 modelID 分別進行標準化 + AUTO 檢測
	 * Step 3: Normalize providerID and modelID separately + AUTO detection
	 */
	providerID = normalizeModelString(providerID);
	modelID = normalizeModelString(modelID);

	return _detectAutoModelBody({
		providerID,
		modelID,
	});
}

/**
 * AUTO 模型主體檢測
 * AUTO model body detection
 *
 * 檢測 providerID 和 modelID 是否為 AUTO 或無效值，並回傳對應的檢測類型。
 * Detects whether providerID and modelID are AUTO or invalid values, returns corresponding detection type.
 *
 * 檢測規則：
 * Detection rules:
 * - 空字串 → 視為 AUTO
 * - 符合 _isAutoModel（trim + toUpperCase 後等於 "AUTO"）→ 視為 AUTO
 * - 字串 "undefined" 或 "null"（不區分大小寫）→ 視為 AUTO
 *
 * detectAutoModelBody 數值說明：
 * detectAutoModelBody value explanation:
 * - 0: 完整模型（providerID 和 modelID 都有效）/ Full model (both providerID and modelID are valid)
 * - 1: 完全 AUTO（兩者都是 AUTO 或空白）/ Fully AUTO (both are AUTO or empty)
 * - 2: provider 為 AUTO，僅 modelID 有效 / Provider is AUTO, only modelID is valid
 * - 3: modelID 為 AUTO，僅 providerID 有效 / modelID is AUTO, only providerID is valid
 *
 * @param modelBody - 模型主體（可為 undefined 或部分欄位）/ Model body (can be undefined or partial)
 * @returns 包含 detectAutoModelBody 和 modelBody 的結果物件 / Result object
 *
 * @example
 * // 完整模型
 * _detectAutoModelBody({ providerID: "openai", modelID: "gpt-4o" });
 * // { detectAutoModelBody: 0, modelBody: { providerID: "openai", modelID: "gpt-4o" } }
 *
 * // 完全 AUTO
 * _detectAutoModelBody(void 0);
 * // { detectAutoModelBody: 1, modelBody: undefined }
 *
 * // provider 為 AUTO
 * _detectAutoModelBody({ providerID: "AUTO", modelID: "gpt-4o" });
 * // { detectAutoModelBody: 2, modelBody: { providerID: undefined, modelID: "gpt-4o" } }
 *
 * // modelID 為 AUTO
 * _detectAutoModelBody({ providerID: "openai", modelID: "AUTO" });
 * // { detectAutoModelBody: 3, modelBody: { providerID: "openai", modelID: undefined } }
 *
 * // 字串 "undefined" 視為 AUTO
 * _detectAutoModelBody({ providerID: "undefined", modelID: "gpt-4o" });
 * // { detectAutoModelBody: 2, modelBody: { providerID: undefined, modelID: "gpt-4o" } }
 */
export function _detectAutoModelBody(modelBody: Partial<IModelBody> | undefined)
{
	const providerID = normalizeModelString(modelBody?.providerID ?? '').toUpperCase();
	const modelID = normalizeModelString(modelBody?.modelID ?? '').toUpperCase();

	const detectAutoProvider = !providerID.length || _isAutoModel(providerID) || [
		'UNDEFINED',
		'NULL',
		'.',
	].includes(providerID);
	const detectAutoModel = !modelID.length || _isAutoModel(modelID) || ['UNDEFINED', 'NULL', '.'].includes(modelID);

	if (detectAutoProvider)
	{
		if (detectAutoModel)
		{
			return {
				detectAutoModelBody: EnumDetectAutoModelBody.Auto as const,
				modelBody: void 0,
			};
		}

		return {
			/**
			 * @todo: 未來也許可以嘗試實作：依照模型名稱自動搜尋可用的提供商
			 * @todo: Future possibility: auto-discover available providers by model name
			 */
			detectAutoModelBody: EnumDetectAutoModelBody.AutoWithModel as const,
			modelBody: {
				providerID: void 0,
				modelID: modelBody!.modelID!,
			},
		}
	}

	if (detectAutoModel && modelBody?.modelID !== 'auto')
	{
		return {
			/**
			 * @todo: 未來也許可以嘗試實作：依照提供商自動搜尋可用的模型
			 * @todo: Future possibility: auto-discover available models by provider
			 */
			detectAutoModelBody: EnumDetectAutoModelBody.AutoWithProvider as const,
			modelBody: {
				providerID: modelBody!.providerID!,
				modelID: void 0,
			},
		};
	}

	return {
		detectAutoModelBody: EnumDetectAutoModelBody.Normal as const,
		modelBody: {
			providerID: modelBody!.providerID!,
			modelID: modelBody!.modelID!,
		},
	};
}

// ============================================================
// 模型字串組合 / Model String Combining
// ============================================================

/**
 * 將 providerID 和 modelID 組合成模型字串
 * Combine providerID and modelID into a model string
 *
 * @param providerID - Provider ID（如 "openai"）或 IModelBody 物件 / Provider ID or IModelBody object
 * @param modelID - Model ID（如 "gpt-4o"），僅在第一個參數為字串時使用 / Model ID, only used when first param is string
 * @returns 組合後的模型字串（格式 "provider/model"）/ Combined model string
 *
 * @example
 * // 基本用法：兩個字串參數
 * combineModelID("openai", "gpt-4o");
 * // Returns: "openai/gpt-4o"
 *
 * // 傳入 IModelBody 物件
 * combineModelID({ providerID: "openai", modelID: "gpt-4o" });
 * // Returns: "openai/gpt-4o"
 *
 * // Azure 部署路徑（多段 modelID）
 * combineModelID("azure", "gpt-4/deployment-name");
 * // Returns: "azure/gpt-4/deployment-name"
 */
export function combineModelID(
	providerID: string,
	modelID: string,
	opts?: {
		noThrowError?: boolean;
	},
): string
export function combineModelID(
	modelBody: IModelBody,
	modelID?: undefined,
	opts?: {
		noThrowError?: boolean;
	},
): string
export function combineModelID(
	providerID: string | IModelBody,
	modelID?: string,
	opts?: {
		noThrowError?: boolean;
	},
): string
{
	if (typeof providerID === "object")
	{
		if (!providerID.providerID || !providerID.modelID)
		{
			if (!opts?.noThrowError)
			{
				throw new RangeError(`Invalid model body: ${JSON.stringify(providerID)}`);
			}
		}
		return `${providerID.providerID}/${providerID.modelID}`;
	}
	return `${providerID}/${modelID}`;
}

// ============================================================
// 模型字串解析為 IModelBody / Parse Model String to IModelBody
// ============================================================

/**
 * 將模型字串解析為 IModelBody
 * Parse model string into IModelBody
 *
 * 這是 combineModelID 的反向操作。
 * This is the reverse operation of combineModelID.
 *
 * 內部使用 parseModelString 進行解析，已包含：
 * Uses parseModelString internally, which includes:
 * - _trimLazy 去除首尾空白 / Trim leading/trailing whitespace
 * - normalizeModelString 標準化分隔符 / Normalize separators
 * - _isAutoModel 寬鬆 AUTO 檢測 / Lenient AUTO detection
 * - _detectAutoModelBody 部分 AUTO 檢測 / Partial AUTO detection
 *
 * @param providerID - Provider ID（如 "openai"）、模型字串（如 "openai/gpt-4o"）或 IModelBody / Provider ID, model string, or IModelBody
 * @param modelID - Model ID（如 "gpt-4o"），僅在第一個參數為 providerID 字串時使用 / Model ID, only used when first param is providerID string
 * @returns 解析後的 IModelBody / Parsed IModelBody
 * @throws RangeError 當模型字串無效或為 AUTO 時拋出 / Throws when model string is invalid or AUTO
 *
 * @example
 * // 基本用法：兩個字串參數
 * parseModelBody("openai", "gpt-4o");
 * // Returns: { providerID: "openai", modelID: "gpt-4o" }
 *
 * // 傳入 IModelBody（直接回傳）
 * parseModelBody({ providerID: "openai", modelID: "gpt-4o" });
 * // Returns: { providerID: "openai", modelID: "gpt-4o" }
 *
 * // 傳入模型字串
 * parseModelBody("openai/gpt-4o");
 * // Returns: { providerID: "openai", modelID: "gpt-4o" }
 *
 * // 拋出錯誤：AUTO 模型
 * parseModelBody("AUTO");
 * // Throws: RangeError: Invalid model string: "AUTO"
 *
 * // 拋出錯誤：無效格式
 * parseModelBody("invalid-format");
 * // Throws: RangeError: Invalid model string: "invalid-format"
 */
export function parseModelBody(
	providerID: string,
	modelID: string,
): IModelBody
export function parseModelBody(
	modelBody: IModelBody,
	modelID?: undefined,
): IModelBody
export function parseModelBody(
	model: string,
	modelID?: undefined,
): IModelBody
export function parseModelBody(
	providerID: string | IModelBody,
	modelID?: string,
): IModelBody
{

	let parsed: IParseModelStringResult;
	let modelString: string;

	if (typeof providerID === "object")
	{
		modelString = `${providerID.providerID}/${providerID.modelID}`;
	}
	else
	{
		/** 組合 providerID 和 modelID（如果有 modelID） */
		modelString = modelID ? `${providerID}/${modelID}` : providerID;
	}

	parsed = parseModelString(modelString);

	if (parsed.detectAutoModelBody || !parsed.modelBody)
	{
		throw new RangeError(`Invalid model string: "${modelString}"`);
	}

	return parsed.modelBody;
}

// ============================================================
// 模型上下文解析 / Model Context Resolution
// ============================================================

/**
 * 解析 Shadow Agent 的模型上下文
 * Resolve model context for a shadow agent
 *
 * 這是模型解析的主要入口函數，協調完整的解析流程。
 * This is the main entry point for model resolution, orchestrating the complete parsing flow.
 *
 * 解析流程：
 * Resolution flow:
 *
 * ```
 * 輸入參數 (Input Parameters)
 *   │
 *   ├── parentModel   ← getSessionModel(sessionId) 從快取取得
 *   ├── shadow        ← Shadow Agent 名稱（enum）
 *   ├── config        ← IAriseConfig（可選）
 *   └── userModel     ← 用戶呼叫工具時指定的模型
 *
 *   ▼
 * ┌─────────────────────────────────────────┐
 * │ 1. getModelFromConfig(config, shadow)   │  從 config 取得模型
 * │    → configModel                        │  From config file
 * └────────┬────────────────────────────────┘
 *          ▼
 * ┌─────────────────────────────────────────┐
 * │ 2. SHADOW_AGENTS[shadow]?.model         │  從 Shadow 定義取得預設模型
 * │    → defaultModel                       │  From Shadow agent definition
 * └────────┬────────────────────────────────┘
 *          ▼
 * ┌─────────────────────────────────────────┐
 * │ 3. getEffectiveModelWithFallback()      │  決定有效模型
 * │    → effectiveModel                     │  Determine effective model
 * │                                         │
 * │    優先順序 / Priority:                 │
 * │    userModel（AUTO → 跳至 parentModel）  │
 * │    configModel → defaultModel →          │
 * │    parentModel → DEFAULT_MODEL           │
 * └────────┬────────────────────────────────┘
 *          ▼
 * ┌─────────────────────────────────────────┐
 * │ 4. parseModelString(effectiveModel)     │  解析模型字串
 * │    → IParseModelStringResult            │  Parse model string
 * └────────┬────────────────────────────────┘
 *          ▼
 *   detectAutoModelBody !== 0 ?
 *          │
 *    ┌─────┴─────┐
 *    │ 是        │ 否
 *    ▼           ▼
 *  fallback    回傳 parsed.modelBody
 *  DEFAULT_MODEL  Return parsed.modelBody
 * ```
 *
 * @param parentModel - 父會話模型（從 session cache 取得）/ Parent session model (from session cache)
 * @param shadow - Shadow Agent 名稱（枚舉值）/ Shadow Agent name (enum value)
 * @param config - Arise 配置物件（可選）/ Arise config object (optional)
 * @param userModel - 用戶指定的模型覆寫（最高優先級）/ User-specified model override (highest priority)
 * @returns 解析後的 IModelBody / Resolved IModelBody
 *
 * @example
 * // 完整解析：用戶指定模型
 * resolveModelContext(
 *   "anthropic/claude-sonnet-4",  // parentModel
 *   EnumShadowSubAgentsName.Nightmare, // shadow
 *   config,                       // config
 *   "openai/gpt-4o"              // userModel (最高優先級)
 * );
 * // Returns: { providerID: "openai", modelID: "gpt-4o" }
 *
 * // AUTO 模型：沿用父會話模型
 * resolveModelContext(
 *   "anthropic/claude-sonnet-4",  // parentModel
 *   EnumShadowSubAgentsName.Nightmare,
 *   config,
 *   "AUTO"                        // userModel = AUTO → 使用 parentModel
 * );
 * // Returns: { providerID: "anthropic", modelID: "claude-sonnet-4" }
 *
 * // 完全 fallback：無任何模型時使用 DEFAULT_MODEL
 * resolveModelContext(
 *   undefined,                    // parentModel
 *   'Fake-Shadow' as any,         // shadow（無預設模型）
 *   undefined,                    // config
 *   undefined                     // userModel
 * );
 * // Returns: { providerID: "opencode", modelID: "big-pickle" }
 */
export function resolveModelContext(
	parentModel: string | undefined,
	shadow: IAllShadowAgentsName,
	config?: IAriseConfig,
	userModel?: string,
): IModelBody
{
	/** 1. 從 config 取得模型設定 / 1. Get model config from config */
	const configModel = runtimeCache.hasUserConfigModelIsAuto(shadow) ? AUTO_MODEL : getModelFromConfig(config, shadow);

	/** 2. 從 SHADOW_AGENTS 取得預設模型 / 2. Get default model from SHADOW_AGENTS */
	const defaultModel = SHADOW_AGENTS[shadow]?.model;

	/** 3. 決定有效模型 / 3. Determine effective model */
	const effectiveModel = getEffectiveModelWithFallback(
		parentModel,
		defaultModel,
		configModel,
		userModel,
	);

	/** 4. 解析模型字串為 providerID 和 modelID / 4. Parse model string to providerID and modelID */
	const parsed = parseModelString(effectiveModel);

	/** 5. 若解析結果無有效 modelBody，使用 DEFAULT_MODEL / 5. If no valid modelBody, use DEFAULT_MODEL */
	if (parsed.detectAutoModelBody || !parsed.modelBody)
	{
		return parseModelString(DEFAULT_MODEL).modelBody as IModelBody;
	}

	return parsed.modelBody;
}

// ============================================================
// AUTO 模型檢測 / AUTO Model Detection
// ============================================================

/**
 * 判斷模型是否為 AUTO（寬鬆匹配）
 * Check if model is AUTO (lenient matching)
 *
 * 支援以下變體：
 * Supports the following variants:
 * - `"AUTO"` — 標準格式 / Standard format
 * - `"auto"`、`"Auto"`、`"AuTo"` — 大小寫不敏感 / Case-insensitive
 * - `" AUTO "`、`"AUTO\n"`、`"\tAUTO\t"` — 首尾空白/換行/tab 會被 trim
 *
 * @param model - 模型字串 / Model string
 * @returns 若為 AUTO 則回傳 true / Returns true if model is AUTO
 *
 * @example
 * _isAutoModel("AUTO");       // true
 * _isAutoModel("auto");       // true
 * _isAutoModel("Auto");       // true
 * _isAutoModel(" AUTO ");     // true
 * _isAutoModel("AUTO\n");     // true
 * _isAutoModel("openai/gpt-4"); // false
 * _isAutoModel(undefined);    // false
 * _isAutoModel("");           // false
 */
export function _isAutoModel(model?: string): model is typeof AUTO_MODEL
{
	if (typeof model !== "string")
	{
		return false;
	}

	/** 嚴格匹配：精確等於 AUTO / Strict match: exactly equals AUTO */
	if (model === AUTO_MODEL)
	{
		return true;
	}

	/** 寬鬆匹配：trim + 大寫後等於 AUTO / Lenient match: trim + uppercase equals AUTO */
	return model.trim().toUpperCase() === AUTO_MODEL;
}

/**
 * 判斷模型是否為有效模型（非空且非 AUTO）
 * Check if model is a valid model (non-empty and not AUTO)
 *
 * @param model - 模型字串 / Model string
 * @returns 若為有效模型則回傳 true / Returns true if model is valid
 *
 * @example
 * _isDefinedAndNotAutoModel("openai/gpt-4o"); // true
 * _isDefinedAndNotAutoModel("AUTO");          // false
 * _isDefinedAndNotAutoModel("");              // false
 * _isDefinedAndNotAutoModel(undefined);       // false
 */
export function _isDefinedAndNotAutoModel<T extends string>(model?: T): model is NonNullable<T>
{
	return _isNotEmpty(model) && !_isAutoModel(model)
}

// ============================================================
// AUTO 模型回退邏輯 / AUTO Model Fallback Logic
// ============================================================

/**
 * AUTO 回退的基礎邏輯
 * AUTO fallback base logic
 *
 * 當模型為 AUTO 時，根據以下優先順序回退：
 * When model is AUTO, fallback based on priority:
 * 1. parentModel — 若存在且非 AUTO
 * 2. defaultModel — 若存在且非 AUTO
 * 3. DEFAULT_MODEL — 全域預設
 *
 * @param parentModel - 父會話模型 / Parent session model
 * @param defaultModel - 預設模型 / Default model
 * @returns 回退後的模型字串（必定有值）/ Fallback model string (always has value)
 *
 * @example
 * _resolveAutoModelBase("anthropic/claude", "openai/gpt-4");
 * // Returns: "anthropic/claude" (parentModel 優先)
 *
 * _resolveAutoModelBase(undefined, "openai/gpt-4");
 * // Returns: "openai/gpt-4" (fallback 到 defaultModel)
 *
 * _resolveAutoModelBase(undefined, undefined);
 * // Returns: "opencode/big-pickle" (fallback 到 DEFAULT_MODEL)
 *
 * _resolveAutoModelBase("AUTO", "openai/gpt-4");
 * // Returns: "openai/gpt-4" (parentModel 為 AUTO，跳過)
 */
export function _resolveAutoModelBase(parentModel?: string, defaultModel?: string): string
{
	if (_isDefinedAndNotAutoModel(parentModel))
	{
		return parentModel;
	}

	return _isDefinedAndNotAutoModel(defaultModel) ? defaultModel : DEFAULT_MODEL;
}

/**
 * 解析模型的核心邏輯
 * Core model resolution logic
 *
 * 處理以下情況：
 * Handle cases:
 * - 空值/undefined → 回傳 undefined（讓 ?? 鏈繼續）
 * - AUTO → 呼叫 _resolveAutoModelBase 回退
 * - 有效模型 → 回傳該模型
 *
 * @param model - 待解析的模型 / Model to resolve
 * @param parentModel - 父會話模型（用於 AUTO 回退）/ Parent session model (for AUTO fallback)
 * @param defaultModel - 預設模型（用於 AUTO 回退）/ Default model (for AUTO fallback)
 * @returns 解析後的模型或 undefined / Resolved model or undefined
 *
 * @example
 * _resolveAutoModelCore("openai/gpt-4", "anthropic/claude", "default/model");
 * // Returns: "openai/gpt-4" (有效模型直接回傳)
 *
 * _resolveAutoModelCore("AUTO", "anthropic/claude", "default/model");
 * // Returns: "anthropic/claude" (AUTO → 使用 parentModel)
 *
 * _resolveAutoModelCore(undefined, "anthropic/claude", "default/model");
 * // Returns: undefined (讓 ?? 鏈繼續)
 */
export function _resolveAutoModelCore(model?: string, parentModel?: string, defaultModel?: string): string | undefined
{
	if (_isNotEmpty(model))
	{
		if (_isAutoModel(model))
		{
			return _resolveAutoModelBase(parentModel, defaultModel);
		}
		return model;
	}
}

// ============================================================
// 有效模型解析（含 fallback）/ Effective Model Resolution with Fallback
// ============================================================

/**
 * 取得有效模型並包含 fallback 邏輯
 * Get effective model with fallback logic
 *
 * 優先順序（由高到低）：
 * Priority (highest to lowest):
 *
 * ```
 * 1. userModel（用戶指定）
 *    │
 *    ├─ 有效模型 → 直接回傳
 *    ├─ AUTO → 直接回退到 parentModel → defaultModel → DEFAULT_MODEL
 *    │          （不檢查 configModel，AUTO 表示「沿用父會話模型」）
 *    └─ undefined/空值 → 往下檢查
 *    ▼
 * 2. configModel（opencode-legion.json 中 agents.<agent>.model）
 *    │
 *    ├─ 有效模型 → 直接回傳
 *    ├─ AUTO → 回退到 parentModel → defaultModel
 *    └─ undefined/空值 → 往下檢查
 *    ▼
 * 3. defaultModel（SHADOW_AGENTS[shadow].model）
 *    │
 *    ├─ 有效模型 → 直接回傳
 *    ├─ AUTO → 回退到 parentModel → DEFAULT_MODEL
 *    └─ undefined/空值 → 往下檢查
 *    ▼
 * 4. parentModel（父會話模型，從 session cache 取得）
 *    │
 *    ├─ 有效模型 → 直接回傳
 *    └─ AUTO/undefined → 回退到 DEFAULT_MODEL
 *    ▼
 * 5. DEFAULT_MODEL（全域預設：opencode/big-pickle）
 * ```
 *
 * 特殊處理：
 * Special handling:
 * - userModel 為 AUTO 時，**直接回退到 parentModel**，不檢查 configModel
 *   When userModel is AUTO, **fallback directly to parentModel**, skip configModel
 * - configModel 為 AUTO 時，回退到 parentModel
 *   When configModel is AUTO, fallback to parentModel
 * - 所有 AUTO 變體（大小寫、空白、分隔符）都會被正規化為 AUTO_MODEL
 *   All AUTO variants (case, whitespace, separators) are normalized to AUTO_MODEL
 *
 * @param parentModel - 父會話模型 / Parent session model
 * @param defaultModel - Shadow 預設模型 / Shadow default model
 * @param configModel - Config 中的模型 / Model from config
 * @param userModel - 用戶指定的模型 / User-specified model
 * @returns 有效模型字串（必定有值）/ Effective model string (always has value)
 *
 * @example
 * // 用戶指定優先
 * getEffectiveModelWithFallback("parent/model", "default/model", "config/model", "user/model");
 * // Returns: "user/model"
 *
 * // 用戶指定 AUTO → 直接回退到 parentModel（不檢查 configModel）
 * getEffectiveModelWithFallback("parent/model", "default/model", "config/model", "AUTO");
 * // Returns: "parent/model"
 *
 * // 用戶未指定且 config 為 undefined → 使用 defaultModel
 * getEffectiveModelWithFallback("parent/model", "default/model", undefined, undefined);
 * // Returns: "default/model"
 *
 * // configModel 為 AUTO → 回退到 parentModel
 * getEffectiveModelWithFallback("parent/model", "default/model", "AUTO", undefined);
 * // Returns: "parent/model"
 *
 * // 全部 undefined → 使用 DEFAULT_MODEL
 * getEffectiveModelWithFallback(undefined, undefined, undefined, undefined);
 * // Returns: "opencode/big-pickle"
 */
export function getEffectiveModelWithFallback(
	parentModel: string | undefined,
	defaultModel: string | undefined,
	configModel: string | undefined,
	userModel?: string,
): string
{
	if (_trimLazy(userModel)?.length)
	{
		if (parseModelString(userModel).detectAutoModelBody)
		{
			userModel = AUTO_MODEL;
		}
	}
	else
	{
		userModel = void 0;
	}

	if (_trimLazy(configModel)?.length)
	{
		if (parseModelString(configModel).detectAutoModelBody === 1)
		{
			configModel = AUTO_MODEL;
		}
	}
	else
	{
		configModel = void 0;
	}

	/** 用戶指定的模型擁有最高優先級 */
	return _resolveAutoModelCore(userModel, parentModel, defaultModel)
		/** Config 模型 (configModel) */
		?? _resolveAutoModelCore(configModel, parentModel, defaultModel)
		/**
		 * Shadow 預設模型 (defaultModel) - 若為 AUTO 则使用父模型
		 */
		?? _resolveAutoModelCore(defaultModel, parentModel, void 0)
		/**
		 * 父模型（檢查 parentModel 在 DEFAULT_MODEL 之前）
		 * -> 最終 fallback (DEFAULT_MODEL)
		 */
		?? _resolveAutoModelBase(parentModel, void 0)
		;
}
