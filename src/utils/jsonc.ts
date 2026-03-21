/**
 * JSONC 讀寫器
 * JSONC Reader/Writer
 *
 * 使用 jsonc-parser 作為核心的 JSON/JSONC 處理模組
 * JSON/JSONC processing module using jsonc-parser as core
 *
 * 功能說明 (Functionality):
 * - parse: 解析 JSON 或 JSONC（支援註解與尾隨逗號）
 * - JsonHandler: 完整的讀寫處理類（基於 Staging Area 模式）
 *
 * ⚠️ 重要：JsonHandler.stringify() 會保留原始文字的格式與註解
 *
 * Design Pattern:
 * - JsonHandler uses Staging Area pattern: modifications are stored in staging area first,
 *   and are only actually applied when stringify is called
 *
 * ⚠️ Important: JsonHandler.stringify() preserves original text's formatting and comments
 */

import {
	applyEdits,
	format,
	parse,
	createScanner,
	SyntaxKind,
	FormattingOptions as IJsonHandlerFormattingOptions,
	modify,
	ParseError as IParseError,
	printParseErrorCode,
	JSONPath as IJSONPath,
	ModificationOptions as IModificationOptions,
} from 'jsonc-parser';

/* ============ 類型定義 / Type Definitions ============ */

/**
 * JSON 處理器選項
 * JSON Handler options
 *
 * 用於配置 JsonHandler 的行為
 * Used to configure JsonHandler behavior
 */
export interface IJsonHandlerOptions
{
	/**
	 * 是否允許註解 (預設: true)
	 * @default true
	 */
	allowComments?: boolean;

	/**
	 * 是否允許尾隨逗號 (預設: true)
	 * @default true
	 */
	allowTrailingComma?: boolean;

	/** 自訂格式化選項 */
	formattingOptions?: IJsonHandlerFormattingOptions;

	/** 暫存區 - 存放未提交的修改 (key: JSON path string, value: any) */
	staging?: IStagingInput;
}

/**
 * JSON 解析選項
 * JSON parse options
 *
 * 控制 JSON 解析時的行為
 * Controls behavior during JSON parsing
 */
export interface IJsonHandlerParseOptions
{
	disallowComments?: boolean;
	allowTrailingComma?: boolean;
	allowEmptyContent?: boolean;
}

/**
 * JSON 處理錯誤
 * JSON handling error
 *
 * 當 JSON 解析失敗或發生其他處理錯誤時拋出此異常
 * Thrown when JSON parsing fails or other handling errors occur
 */
export class JsonHandlerError extends Error
{
	constructor(
		message: string,
		public readonly errors: IParseError[],
		public readonly originalText: string,
	)
	{
		super(message);
		this.name = 'JsonHandlerError';
	}

	/**
	 * 取得錯誤的詳細描述
	 * Get detailed error description
	 *
	 * @returns 錯誤描述陣列，每個元素包含行號、錯誤碼和位置資訊
	 */
	getErrorDetails(): string[]
	{
		return this.errors.map(err =>
		{
			const codeName = printParseErrorCode(err.error);
			const line = this.originalText.substring(0, err.offset).split('\n').length;
			return `行 ${line}: ${codeName} (位置: ${err.offset}, 長度: ${err.length})`;
		});
	}
}

/* ============ 常量 / Constants ============ */

/**
 * 安全上限 - 用於格式偵測的效能保護
 * Safety limits - performance protection for format detection
 *
 * @type {number}
 */
const MAX_CHARS = 2000;
const MAX_LINES = 30;

/* ============ 輔助函式 / Helper Functions ============ */

/**
 * 偵測 JSON 文字的格式選項
 * Detect formatting options from JSON text
 *
 * 此函式會掃描 JSON 文字的前 N 行，自動偵測使用的縮排類型（空格或 Tab）
 * 以及縮排的寬度（2 個或 4 個空格）
 * This function scans the first N lines of JSON text to automatically detect
 * the indentation type (spaces or tab) and indentation width (2 or 4 spaces)
 *
 * @param text - JSON 文字
 * @returns 格式化選項 (insertSpaces, tabSize, keepLines)
 */
export function detectFormat(text: string): IJsonHandlerFormattingOptions
{
	// 預設值
	const options: IJsonHandlerFormattingOptions = {
		insertSpaces: true,
		tabSize: 2,
		keepLines: true,
	};

	text = text.slice(0, MAX_CHARS);

	// true 表示忽略註解
	const scanner = createScanner(text, false);
	let kind = scanner.scan();
	let lineCount = 0;
	let preKind: SyntaxKind | undefined;

	while (kind !== SyntaxKind.EOF && lineCount < MAX_LINES)
	{
		const value = scanner.getTokenValue();

		if (kind === SyntaxKind.LineBreakTrivia)
		{
			lineCount++;
		}
		else if (kind === SyntaxKind.Trivia && preKind === SyntaxKind.LineBreakTrivia)
		{
			const indent = value.match(/^\n?( +|\t+)$/)?.[1];
			if (indent)
			{
				if (indent[0] === '\t')
				{
					options.insertSpaces = false;
				}
				else if (indent.length === 2 || indent.length === 4)
				{
					options.insertSpaces = true;
					// tabSize only work for space indent
					options.tabSize = indent.length;
				}
				break;
			}
		}
		preKind = kind;

		kind = scanner.scan();
	}

	return options;
}

/**
 * 處理解析選項的核心邏輯
 * Core logic for handling parse options
 *
 * 將 IJsonHandlerOptions 轉換為 IJsonHandlerParseOptions
 * @param options - JSON 處理器選項
 * @returns 解析選項
 */
export function _handleJsonHandlerParseOptionsCore(options: IJsonHandlerOptions = {})
{
	return {
		disallowComments: options.allowComments === false,
		allowTrailingComma: options.allowTrailingComma !== false,
		allowEmptyContent: false,
	};
}

/**
 * 處理格式化選項的核心邏輯
 * Core logic for handling formatting options
 *
 * 自動偵測 JSON 格式，並與使用者提供的選項合併
 * Automatically detects JSON format and merges with user-provided options
 *
 * @param text - JSON 文字
 * @param formattingOptions - 使用者提供的格式化選項
 * @returns 合併後的格式化選項
 */
export function _handleJsonHandlerFormattingOptionsCore(text: string,
	formattingOptions: IJsonHandlerFormattingOptions = {},
)
{
	const detect = detectFormat(text);

	formattingOptions = {
		...formattingOptions,
	};

	for (const key in detect)
	{
		if (typeof formattingOptions[key as keyof IJsonHandlerFormattingOptions] === 'undefined')
		{
			// @ts-ignore
			formattingOptions[key] = detect[key];
		}
	}

	return formattingOptions;
}

/**
 * 將解析錯誤轉換為日誌訊息
 * Convert parse errors to log messages
 *
 * @param parseErrors - 解析錯誤陣列
 * @returns 日誌訊息陣列
 */
export function _handleJsonHandlerParseErrorsToLogs(parseErrors: IParseError[])
{
	const logs: string[] = [];

	// 如果有解析錯誤，發出警告
	if (parseErrors.length > 0)
	{
		logs.push(
			`[JsonHandler] 解析 JSON 時發現 ${parseErrors.length} 個問題：\n` +
			parseErrors.map(err =>
				`  - ${printParseErrorCode(err.error)} (位置: ${err.offset})`,
			).join('\n'),
		);
	}

	return logs;
}

/**
 * 列印日誌訊息
 * Print log messages
 *
 * @param logs - 日誌訊息陣列
 * @param fnOrType - 日誌函式或 console 方法名稱 (預設: 'log')
 */
export function _printLogs(logs: unknown[], fnOrType?: keyof typeof console | typeof console.log)
{
	const fn = typeof fnOrType === 'function' ? fnOrType : (log: unknown) => console[fnOrType as 'log'](log);

	logs.every((log, i) =>
	{
		fn(log);
		return i < 5
	});
}

/**
 * 將 JSON 路徑轉換為鍵值字串
 * Convert JSON path to key string
 *
 * @param path - JSON 路徑 (例如: ['a', 'b'] 或 ['editor', 'tabSize'])
 * @returns 鍵值字串 (JSON 格式)
 * @throws TypeError 如果 path 不是陣列
 */
export function _pathToKey(path: IJSONPath): string
{
	const key = JSON.stringify(path);
	if (!path?.length || !Array.isArray(path))
	{
		throw new TypeError(`path should be Array. but got ${key}`);
	}

	return key;
}

/**
 * 將鍵值字串轉換為 JSON 路徑
 * Convert key string to JSON path
 *
 * @param key - 鍵值字串 (JSON 格式)
 * @returns JSON 路徑陣列
 */
export function _keyToPath(key: string): IJSONPath
{
	return JSON.parse(key);
}

/**
 * 遍歷暫存區的產生器函式
 * Generator function to iterate through staging area
 *
 * @param staging - 暫存區 Map
 * @yield { key, value, path } - 每次迭代回傳鍵、值和路徑
 */
export function* _eachStaging(staging: Map<string, unknown>)
{
	for (const [key, value] of staging)
	{
		const path = _keyToPath(key);

		yield { key, value, path };
	}
}

export type IStagingInput = Map<string, unknown> | JsonHandler;

export function _getStaging(staging: IStagingInput)
{
	if (staging instanceof JsonHandler)
	{
		staging = staging.getStagedChanges();
	}

	return new Map(staging);
}

/* ============ 核心函式 / Core Functions ============ */

/**
 * 建立 JsonHandler 的工廠函數
 * Factory function to create JsonHandler
 *
 * 這是建立 JsonHandler 的推薦方式
 * This is the recommended way to create JsonHandler
 *
 * @param text - JSON/JSONC 文字
 * @param options - 解析選項
 * @returns JsonHandler 實例
 * @throws JsonHandlerError 如果解析失敗
 */
export function createJsonHandler(text: string, options?: IJsonHandlerOptions): JsonHandler
{
	const handler = new JsonHandler(text, options);

	// 檢測解析錯誤並拋出
	if (handler.hasErrors())
	{
		throw new JsonHandlerError(
			`JSON 解析失敗，发现 ${handler.getErrors().length} 個錯誤`,
			handler.getErrors(),
			text,
		);
	}

	return handler;
}

/* ============ JsonHandler 類 / JsonHandler Class ============ */

/**
 * JSON 處理器
 * A class for handling JSON with jsonc-parser as the core
 *
 * 功能說明 (Functionality):
 * - 分析: parse 與 detectFormat - 解析 JSON 並偵測格式
 * - 寫入: set 將修改存入暫存區 (staging)
 * - 讀取: get 先讀取暫存區，若不存在則讀取解析後的物件
 * - 刪除: delete 從暫存區刪除或標記為 undefined
 * - 字串化: stringify 將暫存修改應用到原始 JSON 字串，然後套用 format + applyEdits
 * - 錯誤處理: 發生錯誤時記錄並提供詳細資訊
 *
 * 設計模式 (Design Pattern):
 * - 使用 Staging Area 模式: 修改先存入暫存區，直到呼叫 stringify 才實際應用
 * - 支援原地修改: 可在呼叫 stringify 前多次 set/delete
 *
 * @example
 * ```ts
 * const handler = new JsonHandler('{"a": 1}');
 * handler.set(['b'], 2);
 * console.log(handler.get(['a'])); // 1
 * console.log(handler.get(['b'])); // 2
 * console.log(handler.stringify()); // '{"a": 1, "b": 2}'
 * ```
 */
export class JsonHandler
{
	/** 原始 JSON 文字 */
	protected sourceText: string;

	/** 解析後的 JSON 物件 (包含暫存區的修改) */
	protected parsedData: unknown;

	/** 暫存區 - 存放未提交的修改 (key: JSON path string, value: any) */
	protected staging: Map<string, unknown> = new Map();

	/** 解析錯誤陣列 */
	protected parseErrors: IParseError[] = [];

	/** 格式化選項 (insertSpaces, tabSize, keepLines) */
	protected formattingOptions: IJsonHandlerFormattingOptions;

	/** 解析選項 (disallowComments, allowTrailingComma, allowEmptyContent) */
	protected parseOptions: IJsonHandlerParseOptions;

	/**
	 * 建立一個 JsonHandler 實例
	 * Create a JsonHandler instance
	 *
	 * @param text - JSON 文字 (可包含註解或尾隨逗號)
	 * @param options - 選項 (allowComments, allowTrailingComma, formattingOptions)
	 * @throws JsonHandlerError 如果解析失敗且有嚴重錯誤
	 */
	constructor(text: string, options: IJsonHandlerOptions = {})
	{
		this.sourceText = text;

		// 設定解析選項
		this.parseOptions = _handleJsonHandlerParseOptionsCore(options);

		this.reset();

		if (options.staging)
		{
			this.staging = _getStaging(options.staging);
		}

		// 偵測格式
		this.formattingOptions = _handleJsonHandlerFormattingOptionsCore(text, options.formattingOptions);

		// 如果有解析錯誤，發出警告
		if (this.parseErrors.length > 0)
		{
			_handleJsonHandlerParseErrorsToLogs(this.parseErrors).forEach(log => console.warn(log));
		}
	}

	/**
	 * 重置為原始狀態
	 * Reset to original state
	 *
	 * 清空暫存區，並重新解析原始 JSON 文字
	 */
	reset(): void
	{
		this.staging.clear();
		// 解析 JSON
		this.parsedData = this.getParsedData(true);
	}

	/**
	 * 取得解析後的資料
	 * Get parsed data
	 *
	 * @param raw - 若為 true，清除錯誤並重新解析
	 * @returns 解析後的 JSON 物件
	 */
	getParsedData(raw?: boolean)
	{
		return parse(
			this.sourceText,
			raw ? (this.parseErrors = []) : this.parseErrors,
			this.parseOptions,
		);
	}

	/**
	 * 從解析後的物件中取得指定路徑的值 (不含暫存區)
	 * Get value from parsed object by path (excluding staging)
	 *
	 * @param path - JSON 路徑
	 * @returns 路徑對應的值，若不存在則返回 undefined
	 */
	protected getValueFromParsed(path: IJSONPath): unknown
	{
		let current = this.parsedData;
		for (const segment of path)
		{
			if (current === null || current === undefined)
			{
				return undefined;
			}
			current = (current as Record<string, unknown>)[String(segment)];
		}
		return current;
	}

	/**
	 * 讀取指定路徑的值
	 * Read value at the specified path
	 *
	 * 優先順序 (Priority):
	 * 1. 暫存區 (staging) 中的值 - 先檢查此處
	 * 2. 解析後物件中的值 - 若暫存區沒有則讀取此處
	 *
	 * @param path - JSON 路徑 (例如: ['a'] 或 ['user', 'name'])
	 * @returns 路徑對應的值，若不存在則返回 undefined
	 */
	get<T = unknown>(path: IJSONPath): T
	{
		const key = _pathToKey(path);

		// 先檢查暫存區
		if (this.staging.has(key))
		{
			return this.staging.get(key) as T;
		}

		// 再從解析後的物件讀取
		return this.getValueFromParsed(path) as T;
	}

	/**
	 * 設定指定路徑的值 (存入暫存區)
	 * Set value at the specified path (stored in staging)
	 *
	 * 設定的值會存入暫存區，直到呼叫 stringify 才會應用到原始 JSON
	 * @param path - JSON 路徑
	 * @param value - 要設定的值
	 */
	set<T = unknown>(path: IJSONPath, value: T)
	{
		const key = _pathToKey(path);
		this.staging.set(key, value);
	}

	/**
	 * 刪除指定路徑的值
	 * Delete value at the specified path
	 *
	 * 從暫存區刪除，若原始資料中存在則設為 undefined (stringify 時會移除)
	 * @param path - JSON 路徑
	 * @returns 是否成功刪除
	 */
	delete(path: IJSONPath): boolean
	{
		const key = _pathToKey(path);

		// 從暫存區刪除
		const deletedFromStaging = this.staging.delete(key);

		// 如果原始資料中存在，則設為 undefined（在 stringify 時會被移除）
		if (this.getValueFromParsed(path) !== undefined)
		{
			this.staging.set(key, undefined);
			return true;
		}

		return deletedFromStaging;
	}

	/**
	 * 檢查指定路徑是否存在
	 * Check if the specified path exists
	 *
	 * 優先檢查暫存區，再檢查解析後的物件
	 * @param path - JSON 路徑
	 * @returns 是否存在 (值為 undefined 也視為不存在)
	 */
	has(path: IJSONPath): boolean
	{
		const key = _pathToKey(path);

		// 檢查暫存區
		if (this.staging.has(key))
		{
			return this.staging.get(key) !== undefined;
		}

		// 檢查解析後的物件
		return this.getValueFromParsed(path) !== undefined;
	}

	/**
	 * 覆寫暫存區
	 * Overwrite staging area
	 *
	 * @param staging - 新的暫存區資料
	 * @returns this (鏈式呼叫)
	 */
	overwriteStaged(staging: IStagingInput)
	{
		this.staging = _getStaging(staging);

		return this;
	}

	/**
	 * 合併到暫存區
	 * Merge into staging area
	 *
	 * @param staging - 要合併的暫存區資料
	 * @returns this (鏈式呼叫)
	 */
	applyStaged(staging: IStagingInput)
	{
		_getStaging(staging).forEach((v, k) =>
		{
			this.staging.set(k, v);
		});

		return this;
	}

	/**
	 * 取得所有暫存區的修改 (深拷貝)
	 * Get all staged modifications (deep copy)
	 *
	 * @returns 新的 Map 包含所有暫存區的鍵值對
	 */
	getStagedChanges(): Map<string, unknown>
	{
		return new Map(this.staging);
	}

	/**
	 * 檢查暫存區是否有變更
	 * Check if staging area has changes
	 *
	 * 回傳 staging area 的大小（非布林值）
	 * Returns the size of staging area (not a boolean)
	 *
	 * 使用情境：
	 * - if (handler.isStagedChanged()) // size > 0 視為 true
	 * - 直接比較大小：isStagedChanged() > 0
	 *
	 * @returns staging area 的大小
	 */
	isStagedChanged()
	{
		return this.staging.size
	}

	/**
	 * 清空暫存區
	 * Clear the staging area
	 *
	 * 清空後，get 將只回傳解析後物件中的值
	 */
	clearStaging(): void
	{
		this.staging.clear();
	}

	/**
	 * 取得格式化選項 (拷貝)
	 * Get formatting options (copy)
	 *
	 * @returns 格式化選項物件的拷貝
	 */
	getFormattingOptions(): IJsonHandlerFormattingOptions
	{
		return { ...this.formattingOptions };
	}

	/**
	 * 設定格式化選項
	 * Set formatting options
	 *
	 * @param options - 部分格式化選項 (會與現有選項合併)
	 */
	setFormattingOptions(options: Partial<IJsonHandlerFormattingOptions>): void
	{
		this.formattingOptions = { ...this.formattingOptions, ...options };
	}

	/**
	 * 取得解析錯誤
	 * Get parse errors
	 *
	 * @returns 解析錯誤陣列的拷貝
	 */
	getErrors(): IParseError[]
	{
		return [...this.parseErrors];
	}

	/**
	 * 檢查是否有解析錯誤
	 * Check if there are parse errors
	 *
	 * @returns 是否有錯誤
	 */
	hasErrors(): boolean
	{
		return this.parseErrors.length > 0;
	}

	/**
	 * 取得解析後的完整物件 (包含暫存修改)
	 * Get the complete parsed object (including staged changes)
	 *
	 * 將解析後的資料與暫存區的修改合併後回傳
	 * @returns 合併後的完整 JSON 物件
	 */
	valueOf(): unknown
	{
		return parse(this.stringify());
	}

	/**
	 * 字串化 - 將暫存修改應用到原始 JSON 字串
	 * Stringify - Apply staged modifications to the original JSON string
	 *
	 * 流程 (Process):
	 * 1. 使用 modify 將暫存區的修改應用到原始字串
	 * 2. 使用 format 格式化結果
	 * 3. 使用 applyEdits 應用所有編輯
	 *
	 * @returns 修改並格式化後的 JSON 字串
	 */
	stringify(): string
	{
		let currentText = this.sourceText;

		// 依序應用暫存區的修改
		for (const { key, value, path } of _eachStaging(this.staging))
		{
			const modifyOptions: IModificationOptions = {
				formattingOptions: this.formattingOptions,
			};

			const edits = modify(currentText, path, value, modifyOptions);
			currentText = applyEdits(currentText, edits);
		}

		// 格式化最終結果
		const formatEdits = format(currentText, undefined, this.formattingOptions);
		return applyEdits(currentText, formatEdits);
	}

	/**
	 * 取得原始 JSON 文字
	 * Get original JSON text
	 *
	 * @returns 原始輸入的 JSON 字串 (未經過任何修改)
	 */
	getSourceText(): string
	{
		return this.sourceText;
	}
}
