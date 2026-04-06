import { Model, Provider } from "@opencode-ai/sdk";
import { ITSTypeAndStringLiteral, ITSDeepPartial } from 'ts-type';

export enum EnumOpenCodeProviderSource
{
	/** 環境變數 */
	ENV = 'env',
	/** 設定檔 */
	CONFIG = 'config',
	/** 自訂 */
	CUSTOM = 'custom',
	/** API */
	API = 'api',
}

export enum EnnumOpenCodeProviderModelStatus
{
	Alpha = "alpha",
	Beta = "beta",
	Deprecated = "deprecated",
	Active = "active",
}

/**
 * 提供者資料結構
 * Provider data structure
 *
 * 從 OpenCode SDK config.providers() 取得的完整資料
 * Full data obtained from OpenCode SDK config.providers()
 *
 * @example
 * {
 *   "id": "openrouter",
 *   "source": "api",
 *   "name": "OpenRouter",
 *   "env": ["OPENROUTER_API_KEY"],
 *   "options": { "headers": { "HTTP-Referer": "https://opencode.ai/" } },
 *   "models": { "openai/gpt-5.2-codex": { ... } }
 * }
 */
export interface IOpenCodeProviderCore extends Omit<Partial<Provider>, 'models' | 'options'>
{
	/** 提供者 ID（如 "openrouter"、"anthropic"） */
	id: string;
	/** 來源類型（如 "api"） */
	source?: ITSTypeAndStringLiteral<EnumOpenCodeProviderSource>;
	/** 提供者名稱（如 "OpenRouter"） */
	name?: string;
	/** 環境變數名稱列表 */
	env?: string[];
	/** 提供者選項 */
	options?: IOpenCodeProviderProviderOptions;
	/** 是否為預設提供者 */
	default?: boolean;
	/**
	 * API 密鑰 (此處是真實密鑰 API KEY，用於存取提供商服務，絕對要避免洩漏或意外提交至GIT)
	 *
	 * @deprecated 此欄位不應洩漏或輸出日誌
	 */
	key?: string;
}

/**
 * 提供者資料結構
 * Provider data structure
 *
 * 從 OpenCode SDK config.providers() 取得的完整資料
 * Full data obtained from OpenCode SDK config.providers()
 *
 * @example
 * {
 *   "id": "openrouter",
 *   "source": "api",
 *   "name": "OpenRouter",
 *   "env": ["OPENROUTER_API_KEY"],
 *   "options": { "headers": { "HTTP-Referer": "https://opencode.ai/" } },
 *   "models": { "openai/gpt-5.2-codex": { ... } }
 * }
 */
export interface IOpenCodeProvider extends IOpenCodeProviderCore
{
	/** 模型映射（key 為模型 ID） */
	models?: Record<string, IOpenCodeProviderCachedModel>;
}

/**
 * 模型 API 設定
 * Model API configuration
 */
export interface IOpenCodeProviderModelApi
{
	/** API 模型 ID */
	id: string;
	/** API 端點 URL */
	url: string;
	/** NPM 套件名稱 */
	npm?: string;
}

/**
 * 模型費用資訊
 * Model cost information
 */
export interface IOpenCodeProviderModelCost
{
	/** 輸入費用（每百萬 tokens） */
	input: number;
	/** 輸出費用（每百萬 tokens） */
	output: number;
	/** 快取費用 */
	cache?: {
		/** 讀取費用 */
		read: number;
		/** 寫入費用 */
		write: number;
	};
}

/**
 * 模型能力
 * Model capabilities
 */
export interface IOpenCodeProviderModelCapabilities
{
	/** 是否支援溫度參數 */
	temperature: boolean;
	/** 是否支援推理 */
	reasoning: boolean;
	/** 是否支援附件 */
	attachment: boolean;
	/** 是否支援工具呼叫 */
	toolcall: boolean;
	/** 輸入能力 */
	input: {
		/** 文字輸入支援 */
		text: boolean;
		/** 音訊輸入支援 */
		audio: boolean;
		/** 圖片輸入支援 */
		image: boolean;
		/** 影片輸入支援 */
		video: boolean;
		/** PDF 輸入支援 */
		pdf: boolean;
	};
	/** 輸出能力 */
	output: {
		/** 文字輸出支援 */
		text: boolean;
		/** 音訊輸出支援 */
		audio: boolean;
		/** 圖片輸出支援 */
		image: boolean;
		/** 影片輸出支援 */
		video: boolean;
		/** PDF 輸出支援 */
		pdf: boolean;
	};
	/** 是否支援交錯輸入輸出 */
	interleaved: boolean;
}

/**
 * 模型變體
 * Model variants
 */
export interface IOpenCodeProviderModelVariants
{
	[key: string]: {
		reasoning?: {
			/** 推理努力程度 */
			effort: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
		};
	};
}

/**
 * 單一模型資料結構
 * Single model data structure
 *
 * 從 OpenCode SDK config.providers() 取得的模型資料
 * Model data obtained from OpenCode SDK config.providers()
 */
export interface IOpenCodeProviderCachedModel extends ITSDeepPartial<Model>
{
	/** 模型 ID（如 "openai/gpt-5.2-codex"） */
	id: string;
	/** 提供者 ID（如 "openrouter"） */
	providerID: string;
	/** 模型名稱 */
	name: string;
	/** 模型系列 */
	family?: string;
	/** API 設定 */
	api?: IOpenCodeProviderModelApi;
	/** 模型狀態 */
	status?: ITSTypeAndStringLiteral<EnnumOpenCodeProviderModelStatus>;
	/** 自訂請求頭 */
	headers?: Record<string, string>;
	/** 額外選項 */
	options?: Record<string, unknown>;
	/** 費用資訊 */
	cost?: IOpenCodeProviderModelCost;
	/** 模型限制 */
	limit?: {
		/** 上下文窗口大小 */
		context?: number;
		/** 輸入限制 */
		input?: number;
		/** 輸出限制 */
		output?: number;
	};
	/** 模型能力 */
	capabilities?: IOpenCodeProviderModelCapabilities;
	/** 發布日期 */
	release_date?: string;
	/** 模型變體 */
	variants?: IOpenCodeProviderModelVariants;
}

/**
 * 提供者選項
 * Provider options
 */
export interface IOpenCodeProviderProviderOptions
{
	/** 自訂請求頭 */
	headers?: Record<string, string>;
}
