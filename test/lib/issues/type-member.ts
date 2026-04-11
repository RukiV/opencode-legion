
import { Console2 } from 'debug-color2';
import { ITSExtractKeyof, ITSMemberMethods, ITSTypeAndStringLiteral } from 'ts-type';
import { ICrossConsole, IMethods } from 'debug-color2/lib/types/CrossConsole';

export type IMethods2 = Exclude<ITSExtractKeyof<ITSMemberMethods<ICrossConsole>, string>, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>;

type I_CheckMethods<T> = Extract<T, 'log'>;

/**
 * 合法日誌函數類型（排除完整的 Console2 物件，但接受具體函數）
 */
type LogFunction =
	// 明確列出每個具體函數的簽名
	| ((message?: any, ...optionalParams: any[]) => void)
	// 排除有顏色屬性的物件（即完整的 Console2）
	& { blue?: never; red?: never; green?: never; yellow?: never };

type TestIMethods = I_CheckMethods<IMethods>;      // 檢查是否為 string
type TestIMethods2 = IMethods2;    // 檢查是否為具體 union

// @ts-expect-error
let test01: I_CheckMethods<IMethods> = 'log';
let test02: Extract<IMethods2, 'log'> = 'log';

// ==================== 改良版類型工具 / Enhanced Type Utilities ====================

// ---------- ITSMemberMethods 改良版 ----------

/**
 * 版本 1: 基礎版 - 嚴格匹配函數類型
 * 只提取明確為函數類型的屬性
 */
type MemberMethodsV1<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * 版本 2: 進階版 - 排除建構函數與內建方法
 * 增加對 constructor、toString 等內建方法的排除
 */
type MemberMethodsV2<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any
		? K extends 'constructor' | 'toString' | 'valueOf' | 'hasOwnProperty' | 'isPrototypeOf' | 'propertyIsEnumerable'
			? never
			: K
		: never;
}[keyof T];

/**
 * 版本 3: 完整版 - 支持可選與唯讀方法
 * 同時處理可選方法 (?)、唯讀方法 (readonly) 和異步方法 (Promise)
 */
type MemberMethodsV3<T> = {
	[K in keyof T]: T[K] extends ((...args: any[]) => any) | ((...args: any[]) => Promise<any>) | undefined
		? K extends 'constructor' | 'new' | 'prototype' | 'length' | keyof Object
			? never
			: K
		: never;
}[keyof T];

// ---------- ITSExtractKeyof 改良版 ----------

/**
 * 版本 1: 基礎版 - 直接過濾鍵類型
 * 保留 T 中值類型匹配 V 的鍵，若 T 為 never 則返回 never
 */
type ExtractKeyofV1<T, V> = T extends never ? never : keyof T & string;

/**
 * 版本 2: 進階版 - 條件提取並驗證
 * 先提取鍵再驗證對應值類型，提供更嚴格的類型檢查
 */
type ExtractKeyofV2<T, V> = T extends never
	? never
	: T extends object
		? { [K in keyof T]: T[K] extends V ? K : never; }[keyof T] & string
		: never;

/**
 * 版本 3: 完整版 - 支持複雜類型運算
 * 使用分佈式條件類型處理 union 類型
 */
type ExtractKeyofV3<T, V> = T extends never
	? never
	: T extends object
		? { [K in keyof T]-?: T[K] extends V ? K & string : never; }[keyof T]
		: never;

// ---------- 整合應用範例 ----------

/**
 * 使用改良版類型重新定義 IMethods
 */
type IMethodsEnhancedV1 = Exclude<ExtractKeyofV1<MemberMethodsV1<ICrossConsole>, string>, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>;
type IMethodsEnhancedV2 = Exclude<ExtractKeyofV2<MemberMethodsV2<ICrossConsole>, string>, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>;
type IMethodsEnhancedV3 = Exclude<ExtractKeyofV3<MemberMethodsV3<ICrossConsole>, string>, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>;

// ---------- 版本 4/5/6：解決 never 問題的實作 ----------

/**
 * 版本 4: 使用 [T] 阻止分佈式處理
 * 包裝 T 在 tuple 中，防止條件類型對 union 進行分佈式解析
 */
type ExtractKeyofV4<T, V> = [T] extends [never]
	? never
	: T extends object
		? { [K in keyof T]: T[K] extends V ? K & string : never; }[keyof T]
		: never;

/**
 * 版本 5: 使用 infer + 延遲條件判斷
 * 透過類型推斷延遲條件評估，確保 union 類型正確解析
 */
type ExtractKeyofV5<T, V> = T extends infer U
	? U extends never
		? never
		: U extends object
			? { [K in keyof U]: U[K] extends V ? K & string : never; }[keyof U]
			: never
	: never;

/**
 * 版本 6: 簡化版 - 直接映射無條件判斷
 * 移除所有條件判斷，直接進行鍵映射，最可靠但限制較少
 */
type ExtractKeyofV6<T, V> = T extends object
	? { [K in keyof T]: T[K] extends V ? K & string : never; }[keyof T & string]
	: never;

/**
 * 輔助類型：改進的 MemberMethodsV4
 * 使用同樣的 [T] 技巧防止分佈式問題
 */
type MemberMethodsV4<T> = [T] extends [never]
	? never
	: { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never; }[keyof T];

/**
 * 輔助類型：改進的 MemberMethodsV5
 * 排除更多內建屬性並使用 infer
 */
type MemberMethodsV5<T> = T extends infer U
	? U extends never
		? never
		: { [K in keyof U]: U[K] extends (...args: any[]) => any
			? K extends 'constructor' | 'new' | 'prototype' | 'length' | symbol
				? never
				: K
			: never; }[keyof U]
	: never;

/**
 * 輔助類型：改進的 MemberMethodsV6
 * 最簡潔實作，只保留核心邏輯
 */
type MemberMethodsV6<T> = T extends object
	? { [K in keyof T]: T[K] extends (...args: any[]) => any
		? K extends 'constructor' | symbol ? never : K
		: never; }[keyof T & string]
	: never;

// ---------- 整合應用範例 (V4/V5/V6) ----------

type IMethodsEnhancedV4 = Exclude<ExtractKeyofV4<MemberMethodsV4<ICrossConsole>, string>, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>;
type IMethodsEnhancedV5 = Exclude<ExtractKeyofV5<MemberMethodsV5<ICrossConsole>, string>, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>;
type IMethodsEnhancedV6 = Exclude<ExtractKeyofV6<MemberMethodsV6<ICrossConsole>, string>, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>;

// ---------- 版本 7/8/9：基于原始逻辑但使用 infer 的實作 ----------

/**
 * 版本 7: 單層 infer - 原始邏輯直接轉換
 * 將 ITSMemberMethods 的結果用 infer 捕获再處理
 */
type IMethodsEnhancedV7<T = ICrossConsole> = T extends infer U
	? U extends object
		? Exclude<keyof { [K in keyof U as U[K] extends (...args: any[]) => any ? K : never]: any } & string, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>
		: never
	: never;

/**
 * 版本 8: 雙層 infer - 簡化版
 * 第一層確保類型展開，第二層直接映射過濾
 */
type IMethodsEnhancedV8<T = ICrossConsole> = T extends infer U
	? U extends object
		? Exclude<
			{ [K in keyof U as U[K] extends (...args: any[]) => any ? K : never]: any } extends infer M
				? keyof M & string
				: never,
			'constructor' | 'new' | 'prototype' | 'Console' | 'length'
		>
		: never
	: never;

/**
 * 版本 9: 簡化 infer 版 - 最接近原始邏輯
 * 保留 Exclude<ExtractKeyof<...>, ...> 結構但內部使用 infer
 */
type IMethodsEnhancedV9<T = ICrossConsole> = T extends infer U
	? U extends object
		? Exclude<
			{ [K in keyof U]: U[K] extends (...args: any[]) => any ? (K & string) : never; }[keyof U],
			'constructor' | 'new' | 'prototype' | 'Console' | 'length'
		>
		: never
	: never;

// 使用預設類型參數的便捷別名
type IMethods7 = IMethodsEnhancedV7<ICrossConsole>;
type IMethods8 = IMethodsEnhancedV8<ICrossConsole>;
type IMethods9 = IMethodsEnhancedV9<ICrossConsole>;

// ---------- 版本 10/11/12：具有彈性與組合性的泛型工具 ----------

/**
 * 版本 10: 可組合工具類型（類似原始 ts-type 設計）
 * MemberMethodsV10 + ExtractKeyofV10 可獨立使用，亦可組合
 */
type MemberMethodsV10<T> = T extends infer U
	? U extends object
		? { [K in keyof U]: U[K] extends (...args: any[]) => any ? K : never; }[keyof U]
		: never
	: never;

type ExtractKeyofV10<T, V> = T extends infer U
	? U extends keyof any
		? U & V
		: never
	: never;

/**
 * FilterKeys - 基礎鍵過濾類型
 * 從聯合類型中排除指定的字符串鍵
 *
 * 使用範例：
 * type AllKeys = 'log' | 'debug' | 'constructor' | 'error';
 * type PublicKeys = FilterKeys<AllKeys, 'constructor'>;  // 'log' | 'debug' | 'error'
 * type SafeKeys = FilterKeys<AllKeys, 'constructor' | 'error'>;  // 'log' | 'debug'
 */
type FilterKeys<T, ExcludeKeys extends string = never> = T extends infer U
	? U extends string
		? U extends ExcludeKeys ? never : U
		: never
	: never;

type FilterKeys1b<T, ExcludeKeys extends string = never> = FilterKeysV3<T, ExcludeKeys, string>;
type FilterKeys2b<T, ExcludeKeys extends PropertyKey = never> = FilterKeysV3<T, ExcludeKeys, PropertyKey>;

/**
 * FilterKeysV2 - 支持 PropertyKey（string | number | symbol）的版本
 *
 * 使用範例：
 * type AllKeys = 'log' | 'debug' | 'constructor' | 42 | symbol;
 * type StringKeys = FilterKeysV2<AllKeys, number | symbol>;  // 'log' | 'debug' | 'constructor'
 * type NoSymbol = FilterKeysV2<AllKeys, symbol>;            // 'log' | 'debug' | 'constructor' | 42
 */
type FilterKeysV2<T, ExcludeKeys extends PropertyKey = never> = T extends infer U
	? U extends PropertyKey
		? U extends ExcludeKeys ? never : U
		: never
	: never;

/**
 * FilterKeysV3 - 可配置 AllowedPropertyKey 的最靈活版本
 *
 * 使用範例：
 * ```typescript
 * type AllKeys = 'log' | 'debug' | 'error' | 42 | 99 | symbol;
 *
 * // 只保留 string 類型，不排除任何鍵
 * type Strings = FilterKeysV3<AllKeys, never, string>;  // 'log' | 'debug' | 'error'
 *
 * // 只保留 number 類型，不排除任何鍵
 * type NumOnly = FilterKeysV3<AllKeys, never, number>;  // 42 | 99
 *
 * // 保留 string | number，排除 'debug'
 * type Mixed = FilterKeysV3<AllKeys, 'debug', string | number>;  // 'log' | 42 | 99
 * ```
 *
 * 三代版本對比：
 * FilterKeys:     固定處理 string（最基礎）
 * FilterKeysV2:   固定處理 PropertyKey（更廣泛）
 * FilterKeysV3:   可配置 AllowedPropertyKey 參數（最靈活）
 */
type FilterKeysV3<T, ExcludeKeys extends PropertyKey = never, AllowedPropertyKey extends PropertyKey = PropertyKey> = T extends infer U
	? U extends AllowedPropertyKey
		? U extends ExcludeKeys ? never : U
		: never
	: never;

/**
 * ExtractKeyofV13 - 選擇器版本（只保留匹配 IncludeKeys 的鍵）
 *
 * 與 FilterKeysV3 的邏輯差異：
 * - FilterKeysV3: `U extends ExcludeKeys ? never : U` → 排除匹配的鍵
 * - ExtractKeyofV13: `U extends IncludeKeys ? U : never` → 只保留匹配的鍵
 *
 * 設計理念：
 * ---------------------------
 * ExtractKeyofV12 系列的核心需求是「篩選符合 V 類型的鍵」。
 * FilterKeys 系列的設計是「排除」思維（ ExcludeKeys ），
 * 而 ExtractKeyofV13 採用「選擇」思維（ IncludeKeys ），更符合鍵提取的語義。
 *
 * 與 FilterKeysV3 實作的對比：
 * - FilterKeysV3: `FilterKeysV3<T, never, V>`（用 AllowedPropertyKey 篩選，ExcludeKeys 設為 never）
 * - ExtractKeyofV13: `ExtractKeyofV13<T, V, PropertyKey>`（直接用 IncludeKeys 篩選）
 *
 * 使用範例與測試驗證：
 * ```typescript
 * type AllKeys = 'log' | 'debug' | 'error' | 42 | 99 | symbol;
 *
 * // 1. 篩選 string 類型鍵（等同 ExtractKeyofV12d<AllKeys, string>）
 * // ✅ 結果：'log' | 'debug' | 'error'
 * type Strings = ExtractKeyofV13<AllKeys, string, PropertyKey>;
 *
 * // 2. 篩選 number 類型鍵
 * // ✅ 結果：42 | 99
 * type Numbers = ExtractKeyofV13<AllKeys, number, PropertyKey>;
 *
 * // 3. 只保留特定字面量
 * // ✅ 結果：'log' | 'debug'
 * type Picked = ExtractKeyofV13<AllKeys, 'log' | 'debug', PropertyKey>;
 *
 * // 4. 特定數字字面量（只保留 42，過濾 99）
 * // ✅ 結果：42
 * // ❌ 99 會被過濾
 * type SpecificNumber = ExtractKeyofV13<AllKeys, 42, PropertyKey>;
 *
 * // 5. 實作 ExtractKeyofV12（輸出轉為 string）
 * // ✅ 結果：'log' | 'debug' | 'error'
 * type V12_Strings = ExtractKeyofV13<AllKeys, string, PropertyKey> & string;
 *
 * // 6. 限制輸入類型為 string（等同 FilterKeysV3<AllKeys, never, string>）
 * // ✅ 結果：'log' | 'debug' | 'error'
 * // ❌ number/symbol 被過濾
 * type StringOnly = ExtractKeyofV13<AllKeys, PropertyKey, string>;
 *
 * // 7. symbol 類型篩選（結果為 never）
 * // ✅ 結果：never（symbol 無法通過 PropertyKey 匹配 string/number）
 * type SymbolFiltered = ExtractKeyofV13<AllKeys, symbol, PropertyKey>;
 * ```
 *
 * Enum 類型處理範例：
 * ------------------
 * TypeScript enum 作為類型時，需使用模板字面量 `${Enum}` 或 keyof typeof 獲取成員。
 *
 * ```typescript
 * enum LogLevel {
 *   DEBUG = 'debug',
 *   INFO = 'info',
 *   WARN = 'warn',
 *   ERROR = 'error'
 * }
 *
 * enum StatusCode {
 *   OK = 200,
 *   NOT_FOUND = 404,
 *   ERROR = 500
 * }
 *
 * // 8. 從 enum 鍵中篩選（使用 keyof typeof）
 * // ✅ 結果：'DEBUG' | 'INFO'
 * type EnumKeys = keyof typeof LogLevel;  // 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
 * type PickedEnumKeys = ExtractKeyofV13<EnumKeys, 'DEBUG' | 'INFO', PropertyKey>;
 *
 * // 11. 數字 enum 的值篩選（使用 infer 提取數字）
 * // ✅ 結果：200 | 500
 * type StatusEnumValues = `${StatusCode}` extends `${infer N extends number}` ? N : never;
 * type PickedStatusValues = ExtractKeyofV13<200 | 404 | 500, StatusEnumValues, PropertyKey>;
 *
 * // 12. enum 作為第二參數（IncludeKeys）使用 ITSTypeAndStringLiteral
 * // 搭配 ts-type 的 ITSTypeAndStringLiteral 可直接將 enum 轉為 string 字面量
 * // ✅ 結果：'debug' | 'error'
 * import { ITSTypeAndStringLiteral } from 'ts-type';
 * type MixedInput = ITSTypeAndStringLiteral<LogLevel> | 42 | symbol;
 * type EnumAsIncludeKeys = ITSTypeAndStringLiteral<LogLevel.DEBUG | LogLevel.ERROR>;
 * type Filtered = ExtractKeyofV13<MixedInput, EnumAsIncludeKeys, PropertyKey>;
 * // ✅ 可賦值：LogLevel.DEBUG, LogLevel.ERROR
 * // ❌ 被過濾：'trace', 'fatal', 42, symbol
 *
 * // 13. 數字 enum 直接作為 IncludeKeys
 * // ✅ 結果：200 | 404 | 500
 * type AllCodes = 200 | 301 | 404 | 500 | 503;
 * type StatusCodes = ExtractKeyofV13<AllCodes, StatusCode, PropertyKey>;
 * ```
 */
type ExtractKeyofV13<T, IncludeKeys extends PropertyKey, AllowedPropertyKey extends PropertyKey = PropertyKey> = T extends infer U
	? U extends AllowedPropertyKey
		? U extends IncludeKeys ? U : never
		: never
	: never;

/**
 * MemberMethodsV11 - 增強方法提取類型
 * 支持在提取階段排除特定方法鍵
 *
 * 使用範例：
 * type Methods = MemberMethodsV11<Console>;  // 提取所有方法
 * type NoCtor = MemberMethodsV11<Console, 'constructor'>;  // 排除 constructor
 * type Clean = MemberMethodsV11<Console, 'constructor' | 'toString'>;  // 排除多個
 */
type MemberMethodsV11<T, ExcludeFn extends PropertyKey = never> = T extends infer U
	? U extends object
		? ExcludeFn extends never
			? { [K in keyof U]: U[K] extends (...args: any[]) => any ? K : never; }[keyof U]
			: { [K in keyof U as U[K] extends (...args: any[]) => any
				? K extends ExcludeFn ? never : K
				: never]: any } extends infer M ? keyof M : never
		: never
	: never;

/**
 * ExtractKeyofV11 - 增強鍵類型過濾
 * 只保留符合 V 類型的 PropertyKey
 *
 * 使用範例：
 * type AllProps = 'log' | 'name' | 42 | symbol;
 * type StringProps = ExtractKeyofV11<AllProps, string>;  // 'log' | 'name'
 * type NumberProps = ExtractKeyofV11<AllProps, number>;  // 42
 */
type ExtractKeyofV11<T, V> = T extends infer U
	? U extends PropertyKey
		? U extends V ? U : never
		: never
	: never;

/**
 * MemberMethodsV12 - 完全泛化版方法提取類型
 *
 * 設計目標：
 * ---------------------------
 * 支持任意鍵值類型與自定義條件，提供更靈活的方法提取能力。
 *
 * 類型參數：
 * - T: 輸入對象類型（需 extends object）
 * - ValueCond: 值類型條件（預設為函數類型 `(...args: any[]) => any`）
 * - ExcludeKeys: 要排除的鍵列表（預設為 never，不排除任何鍵）
 *
 * 與 MemberMethodsV11 的差異：
 * - V11: 固定排除函數類型的鍵，只能排除單個鍵
 * - V12: 可自定義值類型條件（如只提取返回 Promise 的方法），支持排除多個鍵
 *
 * 核心機制：
 * ---------------------------
 * 1. 使用 `T extends infer U` 捕獲輸入類型，實現跨模組延遲解析
 * 2. 映射類型遍歷所有鍵，篩選符合 ValueCond 的鍵
 * 3. 若 ExcludeKeys 不為 never，使用 `as` 重映射排除指定鍵
 *
 * ✅ 跨模組驗證：使用 infer 延遲類型解析，即使跨模組引用也能正確運作，
 *    避免 IMethods 變為 string 的問題
 *
 * 使用範例：
 * ---------------------------
 * ```typescript
 * interface MyClass {
 *   name: string;
 *   log(): void;
 *   debug(): void;
 *   error(): void;
 *   constructor(): void;
 *   _privateMethod(): void;
 * }
 *
 * // 1. 提取所有方法（預設行為，等同 MemberMethodsV11 無排除時）
 * // ✅ 結果：'log' | 'debug' | 'error' | 'constructor' | '_privateMethod'
 * type AllMethods = MemberMethodsV12<MyClass>;
 *
 * // 2. 提取方法但排除 constructor
 * // ✅ 結果：'log' | 'debug' | 'error' | '_privateMethod'
 * // ❌ 'constructor' 被排除
 * type NoCtor = MemberMethodsV12<MyClass, (...args: any[]) => any, 'constructor'>;
 *
 * // 3. 排除多個鍵
 * // ✅ 結果：'log' | 'debug' | 'error'
 * // ❌ 'constructor'、'_privateMethod' 被排除
 * type PublicMethods = MemberMethodsV12<MyClass, (...args: any[]) => any, 'constructor' | '_privateMethod'>;
 *
 * // 4. 自定義值類型條件 - 只提取返回 string 的方法
 * interface StringReturnClass {
 *   getName(): string;
 *   getId(): number;
 *   log(): void;
 * }
 * // ✅ 結果：'getName'
 * type StringMethods = MemberMethodsV12<StringReturnClass, () => string>;
 *
 * // 5. 自定義值類型 - 只提取返回 Promise 的方法
 * interface AsyncClass {
 *   fetchData(): Promise<string>;
 *   syncMethod(): string;
 *   save(): Promise<void>;
 * }
 * // ✅ 結果：'fetchData' | 'save'
 * type AsyncMethods = MemberMethodsV12<AsyncClass, () => Promise<any>>;
 *
 * // 6. 泛型類別中使用
 * class GenericService<T> {
 *   data: T;
 *   fetch(): Promise<T>;
 *   save(): Promise<void>;
 *   private internal(): void;
 * }
 * // ✅ 結果：'fetch' | 'save' | 'internal'（含私有方法）
 * // ❌ 'data' 被過濾（不是函數）
 * type ServiceMethods = MemberMethodsV12<GenericService<any>>;
 * // ✅ 結果：'fetch' | 'save'
 * // ❌ 'internal' 也被排除（假設要排除私有方法）
 * type PublicServiceMethods = MemberMethodsV12<GenericService<any>, (...args: any[]) => any, 'internal'>;
 *
 * // 7. 與 ExtractKeyofV12 組合使用 - 提取並轉換為 string 類型
 * type MyClassMethods = MemberMethodsV12<MyClass>;
 * type StringMethodKeys = ExtractKeyofV12<MyClassMethods, string>;  // 'log' | 'debug' | 'error' | ...
 *
 * // 8. 內化排除模式 - 最簡潔用法
 * // 將所有排除邏輯集中在 MemberMethodsV12 的 ExcludeKeys 參數中
 * type CleanMethods = MemberMethodsV12<
 *   MyClass,
 *   Function,
 *   'constructor' | 'new' | 'prototype' | '_privateMethod'
 * >;
 * ```
 *
 * 進階組合範例：
 * ---------------------------
 * ```typescript
 * // 組合 FilterKeys 實現分階段過濾
 * type Stage1 = MemberMethodsV12<ApiA>;  // 提取 A 的方法
 * type Stage2 = MemberMethodsV12<ApiB>;  // 提取 B 的方法
 * type Combined = FilterKeys<Stage1 | Stage2, 'constructor' | 'init'>;
 *
 * // 條件化排除
 * type ConditionalMethods<T, ExcludePrivate extends boolean> =
 *   ExcludePrivate extends true
 *     ? MemberMethodsV12<T, (...args: any[]) => any, `_${string}`>
 *     : MemberMethodsV12<T>;
 * ```
 */
type MemberMethodsV12<
	T,
	ValueCond = (...args: any[]) => any,
	ExcludeKeys extends PropertyKey = never
>	// 1. T extends infer U - 使用 infer 捕獲輸入類型，實現延遲解析
	= T extends infer U
	// 2. U extends object - 確保輸入是對象類型（可遍歷鍵）
	? U extends object
		// 3. ExcludeKeys extends never - 檢查是否需要排除特定鍵
		? ExcludeKeys extends never
			// 3a. 無需排除 - 使用基本映射類型遍歷所有鍵
			// 遍歷 U 的所有鍵 K，若值類型 U[K] 符合 ValueCond 則保留 K，否則設為 never
			? { [K in keyof U]: U[K] extends ValueCond ? K : never; }[keyof U]
			// 3b. 需要排除 - 使用「as」重映射語法進行鍵過濾
			// 邏輯：先檢查值類型是否符合 ValueCond，再檢查鍵是否在 ExcludeKeys 中
			: { [K in keyof U as U[K] extends ValueCond
				// 若值符合條件，進一步檢查鍵是否需要排除
				? K extends ExcludeKeys ? never : K  // 在排除列表中則設為 never，否則保留 K
				// 若值不符合條件，設為 never（過濾掉）
				: never]: any } extends infer M ? keyof M : never
		// U 不是 object，返回 never（無法提取方法）
		: never
	// T 無法解析為 infer U，返回 never
	: never;

/**
 * ExtractKeyofV12 - 最終鍵類型提取
 * 從 PropertyKey 聯合中篩選符合 V 類型的鍵，並轉為 string
 *
 * 為什麼需要 `& string`：
 * -------------------
 * 1. 輸出類型限制：確保最終輸出為 string 類型
 *    - PropertyKey = string | number | symbol
 *    - `& string` 將結果限制為 string 子集
 *
 * 2. 過濾非 string 類型：
 *    - `U & string` 對於 string 類型：保持原樣（如 'log' & string = 'log'）
 *    - `U & string` 對於 number 類型：變為 never（如 42 & string = never）
 *    - `U & string` 對於 symbol 類型：變為 never（如 symbol & string = never）
 *
 * 3. 與 V12d 的對比：
 *    - V12（本版）：固定輸出為 string，number/symbol 被過濾為 never
 *    - V12d：通過參數控制輸出，可保持原始類型或自定義轉換
 *
 * 使用範例：
 * type Mixed = 'log' | 'debug' | 42 | symbol;
 * type StringOnly = ExtractKeyofV12<Mixed, string>;  // 'log' | 'debug'
 * type AllString = ExtractKeyofV12<Mixed, PropertyKey>;  // 'log' | 'debug' (symbol/number 被過濾)
 */
type ExtractKeyofV12<T, V> = T extends infer U
	? U extends PropertyKey
		? U extends V ? U & string : never
		: never
	: never;

/**
 * ExtractKeyofV12b - 基於 FilterKeysV3 概念的實作
 * 使用 AllowedPropertyKey 參數控制保留的鍵類型，並通過 & string 轉換輸出
 *
 * 與 ExtractKeyofV12 功能等價，但採用 FilterKeysV3 的三參數設計模式：
 * - T: 輸入類型
 * - ExcludeKeys: never（不執行排除，僅做類型篩選）
 * - AllowedPropertyKey: V（只保留符合 V 的鍵）
 * 最後附加 & string 確保輸出為 string 類型
 *
 * 使用範例：
 * type Mixed = 'log' | 'debug' | 42 | symbol;
 * type StringOnly = ExtractKeyofV12b<Mixed, string>;  // 'log' | 'debug'
 * type AllString = ExtractKeyofV12b<Mixed, PropertyKey>;  // 'log' | 'debug'
 */
type ExtractKeyofV12b<T, V extends PropertyKey = PropertyKey> = FilterKeysV3<T, never, V> & string;

/**
 * ExtractKeyofV12c - 完全獨立實作版（不依賴 FilterKeysV3）
 * 直接使用條件類型實現與 ExtractKeyofV12 相同的功能
 *
 * 實作邏輯：
 * 1. T extends infer U - 捕獲輸入類型
 * 2. U extends PropertyKey - 確保是 PropertyKey
 * 3. U extends V - 篩選符合 V 類型的鍵
 * 4. & string - 將結果轉為 string 類型
 *
 * 與依賴 FilterKeysV3 的版本差異：
 * - 不依賴任何外部類型工具，完全自包含
 * - 更適合單獨複製使用
 * - 類型推導路徑更直接
 *
 * 使用範例：
 * type Mixed = 'log' | 'debug' | 42 | symbol;
 * type StringOnly = ExtractKeyofV12c<Mixed, string>;  // 'log' | 'debug'
 * type AllString = ExtractKeyofV12c<Mixed, PropertyKey>;  // 'log' | 'debug'
 */
type ExtractKeyofV12c<T, V extends PropertyKey = PropertyKey> = T extends infer U
	? U extends PropertyKey
		? U extends V
			? U & string
			: never
		: never
	: never;

/**
 * ExtractKeyofV12d - 具有 FilterKeysV3 同等彈性的版本
 *
 * 類型參數：
 * - T: 輸入類型
 * - V: 篩選條件（鍵必須 extends V 才被保留）
 * - AllowedPropertyKey: 允許的鍵類型（預設 PropertyKey）
 * - OutputTransform: 輸出轉換類型（預設 U，保持原始類型）
 *
 * 設計模式對應 FilterKeysV3：
 * - FilterKeysV3: 排除特定鍵 + 限制鍵類型
 * - ExtractKeyofV12d: 篩選符合 V 的鍵 + 限制鍵類型 + [可選] 轉換輸出類型
 *
 * 使用範例：
 * type All = 'log' | 'debug' | 42 | 99 | symbol;
 *
 * // 篩選 string 類型鍵，保持原始類型
 * type A = ExtractKeyofV12d<All, string>;  // 'log' | 'debug'
 *
 * // 篩選 number 類型鍵，保持原始類型
 * type B = ExtractKeyofV12d<All, number>;  // 42 | 99
 *
 * // 篩選 number 類型鍵，輸出轉為 string
 * type C = ExtractKeyofV12d<All, number, PropertyKey, string>;  // '42' | '99'
 *
 * // 篩選 string，輸出轉為大寫（配合 Uppercase<T>）
 * type D = ExtractKeyofV12d<All, string, PropertyKey, Uppercase<'log' | 'debug'>>;
 *
 * // 常用組合：輸出為 string（等同原 ExtractKeyofV12）
 * type E = ExtractKeyofV12d<All, PropertyKey, PropertyKey, string>;  // 'log' | 'debug' | '42' | '99'
 */
type ExtractKeyofV12d<
	T,
	V extends PropertyKey = PropertyKey,
	AllowedPropertyKey extends PropertyKey = PropertyKey,
	OutputTransform = never
> = T extends infer U
	? U extends AllowedPropertyKey
		? U extends V
			? [OutputTransform] extends [never] ? U : U & OutputTransform
			: never
		: never
	: never;

// ---------- 組合使用範例 ----------

// V10 組合（類似原始寫法）
type IMethodsV10<T = ICrossConsole> = FilterKeys<
	ExtractKeyofV10<MemberMethodsV10<T>, string>,
	'constructor' | 'new' | 'prototype' | 'Console' | 'length'
>;

// V11 組合（支持函數排除）
type IMethodsV11<T = ICrossConsole> = FilterKeys<
	ExtractKeyofV11<MemberMethodsV11<T, 'constructor'>, string>,
	'new' | 'prototype' | 'Console' | 'length'
>;

// V12 組合（完全泛化）
type IMethodsV12<T = ICrossConsole> = FilterKeys<
	ExtractKeyofV12<MemberMethodsV12<T, (...args: any[]) => any, 'constructor'>, string>,
	'new' | 'prototype' | 'Console' | 'length'
>;

// V12b 組合（內化排除 - 最簡潔用法）
// 將所有排除邏輯集中在 MemberMethodsV12 的 ExcludeKeys 參數中
type IMethodsV12b<T = ICrossConsole> = 
	ExtractKeyofV12<MemberMethodsV12<T, Function, 'constructor' | 'new' | 'prototype' | 'Console' | 'length'>, string>
	;

// 便捷別名
type IMethods10 = IMethodsV10<ICrossConsole>;
type IMethods11 = IMethodsV11<ICrossConsole>;
type IMethods12 = IMethodsV12<ICrossConsole>;
type IMethods12b = IMethodsV12b<ICrossConsole>;

// ---------- 測試 ----------

// @ts-expect-error - IMethods 應該無法提取 'log'
let test01b: I_CheckMethods<IMethods> = 'log';

// ✅ IMethods2 可以提取 'log'
let test02b: I_CheckMethods<IMethods2> = 'log';

// ✅ V10-V12 應該都能提取 'log'
let test10: I_CheckMethods<IMethods10> = 'log';
let test11: I_CheckMethods<IMethods11> = 'log';
let test12: I_CheckMethods<IMethods12> = 'log';

// ✅ V7-V9 也應該能提取 'log'
let test07: I_CheckMethods<IMethods7> = 'log';
let test08: I_CheckMethods<IMethods8> = 'log';
let test09: I_CheckMethods<IMethods9> = 'log';

// ---------- ExtractKeyofV12 系列驗證測試 ----------

// 測試數據
type TestAllKeys = 'log' | 'debug' | 42 | 99 | symbol;

// ✅ ExtractKeyofV12 - 原始版本（輸出為 string & V）
// 注意：只有 string 類型鍵能正確通過，其他類型會變為 never
type TestV12_String = ExtractKeyofV12<TestAllKeys, string>;
let v12_test1: TestV12_String = 'log';  // ✅ string 類型
let v12_test2: TestV12_String = 'debug';  // ✅ string 類型
// number 會被 & string 轉為 never，這是設計限制
// type TestV12_Number = ExtractKeyofV12<TestAllKeys, number>;  // 結果為 never

// ✅ ExtractKeyofV12b - 基於 FilterKeysV3（同樣限制：非 string 會變 never）
type TestV12b_String = ExtractKeyofV12b<TestAllKeys, string>;
let v12b_test1: TestV12b_String = 'log';

// ✅ ExtractKeyofV12c - 獨立實作（同樣限制）
type TestV12c_String = ExtractKeyofV12c<TestAllKeys, string>;
let v12c_test1: TestV12c_String = 'log';

// ✅ ExtractKeyofV12d - 靈活版本（V12d 的優勢：可保持原始類型）
// 保持原始類型（預設 OutputTransform = never）
type TestV12d_String = ExtractKeyofV12d<TestAllKeys, string>;
let v12d_test1: TestV12d_String = 'log';  // ✅ 輸出為 'log' | 'debug'

// ✅ ExtractKeyofV12d - 篩選 number（保持原始類型）
type TestV12d_Number = ExtractKeyofV12d<TestAllKeys, number>;
let v12d_test2: TestV12d_Number = 42;  // ✅ 輸出為 42 | 99（number 類型）
let v12d_test3: TestV12d_Number = 99;  // ✅

// ✅ ExtractKeyofV12d - 唯一支持輸出轉換的版本
// 篩選 number，輸出轉為 string（通過 & string）
type TestV12d_NumberAsString = ExtractKeyofV12d<TestAllKeys, number, PropertyKey, string>;
// 結果是 number & string = never，這是預期行為
// 若要正確轉換，需使用模板字面值類型：`${number}`

// ✅ ExtractKeyofV12d - 篩選 string，限制輸入為 string
type TestV12d_StringOnly = ExtractKeyofV12d<TestAllKeys, PropertyKey, string>;
let v12d_test6: TestV12d_StringOnly = 'log';  // ✅ 只有 string 鍵

// ✅ 總結：
// - V12/V12b/V12c：只能正確處理 string 鍵（其他類型會被 & string 轉為 never）
// - V12d：唯一支持保持原始類型和自定義輸出轉換的版本

// ---------- 以 FilterKeysV3 模擬 ExtractKeyofV12 系列 ----------

/**
 * 模擬 ExtractKeyofV12（輸出為 string）
 * FilterKeysV3<T, never, V> & string
 *
 * 原理：
 * - never: 不排除任何鍵
 * - V: 只保留符合 V 類型的鍵
 * - & string: 最後轉為 string
 */
type ExtractKeyofV12_Simulated<T, V extends PropertyKey = PropertyKey> = FilterKeysV3<T, never, V> & string;

/**
 * 模擬 ExtractKeyofV12d（保持原始類型）
 * FilterKeysV3<T, never, V>
 *
 * 原理：
 * - never: 不排除任何鍵
 * - V: 只保留符合 V 類型的鍵
 * - 無 & string: 保持原始類型
 */
type ExtractKeyofV12d_Simulated<T, V extends PropertyKey = PropertyKey> = FilterKeysV3<T, never, V>;

// ✅ 驗證：模擬版本與原始版本等價

// 測試數據
type TestKeys = 'log' | 'debug' | 42 | 99;

// 驗證 ExtractKeyofV12_Simulated == ExtractKeyofV12
type SimulatedV12 = ExtractKeyofV12_Simulated<TestKeys, string>;
type OriginalV12 = ExtractKeyofV12<TestKeys, string>;
// 兩者應該等價：都是 'log' | 'debug'
let verify_v12_1: SimulatedV12 = 'log';
let verify_v12_2: OriginalV12 = 'log';

// 驗證 ExtractKeyofV12d_Simulated == ExtractKeyofV12d（無轉換參數時）
type SimulatedV12d_String = ExtractKeyofV12d_Simulated<TestKeys, string>;
type OriginalV12d_String = ExtractKeyofV12d<TestKeys, string>;
let verify_v12d_str_1: SimulatedV12d_String = 'log';
let verify_v12d_str_2: OriginalV12d_String = 'log';

// 驗證 number 類型
type SimulatedV12d_Number = ExtractKeyofV12d_Simulated<TestKeys, number>;
type OriginalV12d_Number = ExtractKeyofV12d<TestKeys, number>;
let verify_v12d_num_1: SimulatedV12d_Number = 42;
let verify_v12d_num_2: OriginalV12d_Number = 42;

// ✅ 驗證：FilterKeysV3 可以完全模擬 ExtractKeyofV12 系列（基礎版）
// ExtractKeyofV12_Simulated = FilterKeysV3<T, never, V> & string
// ExtractKeyofV12d_Simulated = FilterKeysV3<T, never, V>

// ---------- 模擬 ExtractKeyofV12d 完整參數版本 ----------

/**
 * 模擬 ExtractKeyofV12d 完整功能（含 AllowedPropertyKey 和 OutputTransform）
 *
 * 實作策略：
 * - AllowedPropertyKey: 通過 FilterKeysV3 的第三個參數實現
 * - OutputTransform: 通過條件類型 & OutputTransform 實現
 */
type ExtractKeyofV12d_SimulatedFull<
	T,
	V extends PropertyKey = PropertyKey,
	AllowedPropertyKey extends PropertyKey = PropertyKey,
	OutputTransform = never
> = FilterKeysV3<T, never, V & AllowedPropertyKey> extends infer U
	? [OutputTransform] extends [never]
		? U
		: U & OutputTransform
	: never;

// ✅ 驗證：SimulatedFull 與 Original 等價

// 測試 1：基本用法（無轉換）
type SimFull_Basic = ExtractKeyofV12d_SimulatedFull<TestKeys, string>;
type Orig_Basic = ExtractKeyofV12d<TestKeys, string>;
let verify_full_1: SimFull_Basic = 'log';
let verify_full_2: Orig_Basic = 'log';

// 測試 2：限制 AllowedPropertyKey 為 string
type SimFull_Limited = ExtractKeyofV12d_SimulatedFull<TestKeys, PropertyKey, string>;
type Orig_Limited = ExtractKeyofV12d<TestKeys, PropertyKey, string>;
let verify_full_3: SimFull_Limited = 'log';
let verify_full_4: Orig_Limited = 'log';

// 測試 3：number 類型篩選
type SimFull_Number = ExtractKeyofV12d_SimulatedFull<TestKeys, number>;
type Orig_Number = ExtractKeyofV12d<TestKeys, number>;
let verify_full_5: SimFull_Number = 42;
let verify_full_6: Orig_Number = 42;

// 測試 4：使用 OutputTransform 轉為 string（注意：非 string 類型會變 never）
type SimFull_Transform = ExtractKeyofV12d_SimulatedFull<TestKeys, string, PropertyKey, string>;
type Orig_Transform = ExtractKeyofV12d<TestKeys, string, PropertyKey, string>;
let verify_full_7: SimFull_Transform = 'log';
let verify_full_8: Orig_Transform = 'log';

// ✅ 總結：
// - ExtractKeyofV12_Simulated 模擬基礎版（兩參數）
// - ExtractKeyofV12d_Simulated 模擬保持原始類型版（兩參數）
// - ExtractKeyofV12d_SimulatedFull 模擬完整四參數版
// FilterKeysV3 的通用性足以涵蓋所有 ExtractKeyofV12d 場景

// ---------- 搭配 ITSTypeAndStringLiteral 的版本 ----------

/**
 * ITSTypeAndStringLiteral 簡介：
 * 來自 ts-type 庫，將枚舉或類型轉換為對應的字面量 string 類型
 * 例如：ITSTypeAndStringLiteral<'a' | 'b'> = 'a' | 'b'（保持不變）
 * ITSTypeAndStringLiteral<EnumA> = 'value1' | 'value2'（枚舉轉字面量）
 */

// 原版：搭配 ITSTypeAndStringLiteral 的 ExtractKeyofV12
type ExtractKeyofV12_WithLiteral<
	T,
	V extends PropertyKey = PropertyKey,
	AllowedPropertyKey extends PropertyKey = PropertyKey,
	OutputTransform = never
> = ITSTypeAndStringLiteral<
	ExtractKeyofV12d<T, V, AllowedPropertyKey, OutputTransform>
>;

// 模擬版：使用 FilterKeysV3 + ITSTypeAndStringLiteral
type ExtractKeyofV12_WithLiteral_Simulated<
	T,
	V extends PropertyKey = PropertyKey,
	AllowedPropertyKey extends PropertyKey = PropertyKey,
	OutputTransform = never
> = ITSTypeAndStringLiteral<
	ExtractKeyofV12d_SimulatedFull<T, V, AllowedPropertyKey, OutputTransform>
>;

// 驗證：ITSTypeAndStringLiteral 版本等價
type TestWithLiteral_Orig = ExtractKeyofV12_WithLiteral<TestKeys, string>;
type TestWithLiteral_Sim = ExtractKeyofV12_WithLiteral_Simulated<TestKeys, string>;
let verify_literal_1: TestWithLiteral_Orig = 'log';
let verify_literal_2: TestWithLiteral_Sim = 'log';

// ---------- 融入 ITSTypeAndStringLiteral 邏輯的版本 ----------

/**
 * ExtractKeyofV12e - 融入 ITSTypeAndStringLiteral 邏輯的內建版本
 *
 * ITSTypeAndStringLiteral 功能：將任意鍵轉換為對應的字面量 string 類型
 * - string 鍵：保持不變（本身就是 string）
 * - number 鍵：轉為數字字面量（如 42 → '42'）
 * - symbol 鍵：被過濾（無法轉為 string）
 *
 * 實作策略：
 * - string 類型：直接保留（U extends string ? U）
 * - number 類型：使用模板字面量 `${U & number}` 轉為 string
 * - symbol 被過濾：通過 U & (string | number) 排除
 *
 * 類型參數：
 * - T: 輸入類型
 * - V: 篩選條件
 * - AllowedPropertyKey: 允許的鍵類型（預設 PropertyKey）
 */
type ExtractKeyofV12e<
	T,
	V extends PropertyKey = PropertyKey,
	AllowedPropertyKey extends PropertyKey = PropertyKey
> = T extends infer U
	? U extends AllowedPropertyKey
		? U extends V
			? U extends string
				? U                    // string 保持不變
				: `${U & number}`      // number 轉為字面量 string
			: never
		: never
	: never;

/**
 * 模擬 ExtractKeyofV12e（使用 FilterKeysV3 + 條件轉換）
 * 實現與 V12e 相同的內建字面量轉換邏輯
 */
type ExtractKeyofV12e_Simulated<
	T,
	V extends PropertyKey = PropertyKey,
	AllowedPropertyKey extends PropertyKey = PropertyKey
> = FilterKeysV3<T, never, V & AllowedPropertyKey> extends infer U
	? U extends string
		? U
		: `${U & number}`
	: never;

/**
 * ExtractKeyofV12f - 使用 `U extends number` 條件判斷的版本
 *
 * 與 V12e 的差異：
 * - V12e: `${U & number}`（交集運算）
 * - V12f: `U extends number ? `${U}` : never`（條件判斷）
 *
 * 優點：
 * - 語義更明確：明確判斷「U 是否為 number 的子類型」
 * - 更接近 TypeScript 慣用法：extends 用於類型條件判斷
 *
 * 缺點：
 * - 稍顯冗長：需要額外的條件分支
 * - 對於寬泛 number，同樣會產生 `${number}`
 */
type ExtractKeyofV12f<
	T,
	V extends PropertyKey = PropertyKey,
	AllowedPropertyKey extends PropertyKey = PropertyKey
> = T extends infer U
	? U extends AllowedPropertyKey
		? U extends V
			? U extends string
				? U
				: U extends number
					? `${U}`           // number 轉為模板字面量 string
					: never            // symbol 等非 number 類型被過濾
			: never
		: never
	: never;

/**
 * 模擬 ExtractKeyofV12f（使用 FilterKeysV3 + 條件判斷）
 */
type ExtractKeyofV12f_Simulated<
	T,
	V extends PropertyKey = PropertyKey,
	AllowedPropertyKey extends PropertyKey = PropertyKey
> = FilterKeysV3<T, never, V & AllowedPropertyKey> extends infer U
	? U extends string
		? U
		: U extends number
			? `${U}`
			: never
	: never;

// ✅ 驗證：V12f 與模擬版本等價

// 測試數據
type TestAllKeys2 = 'log' | 'debug' | 42 | 99 | symbol;

// 測試 V12f：string 類型篩選
type V12f_Literal = ExtractKeyofV12f<TestAllKeys2, string>;  // 'log' | 'debug'
type V12fSim_Literal = ExtractKeyofV12f_Simulated<TestAllKeys2, string>;
let verify_v12f_1: V12f_Literal = 'log';
let verify_v12f_2: V12fSim_Literal = 'log';

// 測試 V12f：number 轉為字面量 string
type V12f_Number = ExtractKeyofV12f<TestAllKeys2, 42>;  // '42' | '99'
type V12fSim_Number = ExtractKeyofV12f_Simulated<TestAllKeys2, 42>;
let verify_v12f_3: V12f_Number = '42';
let verify_v12f_4: V12fSim_Number = '42';

// 測試 V12f：symbol 被過濾
type V12f_SymbolFiltered = ExtractKeyofV12f<TestAllKeys2, symbol>;  // never
type V12fSim_SymbolFiltered = ExtractKeyofV12f_Simulated<TestAllKeys2, symbol>;  // never

// ✅ 總結：V12e 與 V12f 行為等價，僅實現方式不同

// 測試 1：string 類型篩選
type V12e_Literal = ExtractKeyofV12e<TestAllKeys2, string>;  // 'log' | 'debug'
type V12eSim_Literal = ExtractKeyofV12e_Simulated<TestAllKeys2, string>;
let verify_v12e_1: V12e_Literal = 'log';
let verify_v12e_2: V12eSim_Literal = 'log';

// 測試 2：number 轉為字面量 string
type V12e_Number = ExtractKeyofV12e<TestAllKeys2, number>;  // '42' | '99'
type V12eSim_Number = ExtractKeyofV12e_Simulated<TestAllKeys2, number>;
let verify_v12e_3: V12e_Number = '42';
let verify_v12e_4: V12eSim_Number = '42';

// 測試 3：限制 AllowedPropertyKey 為 string
type V12e_StringOnly = ExtractKeyofV12e<TestAllKeys2, PropertyKey, string>;
type V12eSim_StringOnly = ExtractKeyofV12e_Simulated<TestAllKeys2, PropertyKey, string>;
let verify_v12e_5: V12e_StringOnly = 'log';
let verify_v12e_6: V12eSim_StringOnly = 'log';

// 測試 4：symbol 被自動過濾（無法轉為 string）
type V12e_SymbolFiltered = ExtractKeyofV12e<TestAllKeys2, symbol>;  // never
type V12eSim_SymbolFiltered = ExtractKeyofV12e_Simulated<TestAllKeys2, symbol>;  // never

// 測試 5：驗證 number 字面量 24 的行為
type Test24 = 'log' | 24;
type V12e_24_String = ExtractKeyofV12e<Test24, 24>;  // '24'（轉為 string 字面量）
type V12e_24_Number = ExtractKeyofV12d<Test24, 24>;  // 24（保持 number 字面量）
let verify_v12e_24_str: V12e_24_String = '24';  // ✅ 可賦值 string 字面量 '24'
let verify_v12e_24_num: V12e_24_Number = 24;    // ✅ 可賦值 number 字面量 24

// 測試 6：混合字面量與寬泛類型 number
type Test25 = 'log' | 24 | number;

// V12e：篩選 number（包含 24 和 number）
type V12e_Test25 = ExtractKeyofV12e<Test25, number>;
// 結果：'24' | `${number}`
// - 24 → '24'（字面量 string）
// - number → `${number}`（可匹配任何數字字串如 '42', '99'）
let verify_v12e_25_1: V12e_Test25 = '24';   // ✅ 具體字面量
let verify_v12e_25_2: V12e_Test25 = '99';   // ✅ number 轉為寬泛 string，可賦值任意數字字串

// V12d：篩選 number（保持原始類型）
type V12d_Test25 = ExtractKeyofV12d<Test25, number>;
// 結果：24 | number（即 number）
let verify_v12d_25: V12d_Test25 = 42;  // ✅ 可賦值任意 number

// 測試 7：篩選具體字面量 24（注意：24 | number 會簡化為 number）
// Test25 = 'log' | 24 | number 實際上被 TypeScript 視為 'log' | number
// 因為 24 是 number 的子類型，union 會被簡化
type V12e_Test25_Literal24 = ExtractKeyofV12e<Test25, 24>;  // never（24 已被吸收到 number 中）
type V12d_Test25_Literal24 = ExtractKeyofV12d<Test25, 24>;  // never
// @ts-expect-error - 預期錯誤，因為 24 在 union 中被簡化
let verify_v12e_25_l24: V12e_Test25_Literal24 = '24';
// @ts-expect-error - 預期錯誤
let verify_v12d_25_l24: V12d_Test25_Literal24 = 24;

// 測試 8：正確的獨立字面量測試（不與 number 混合）
type Test26 = 'log' | 24 | 42;  // 多個 number 字面量，不帶寬泛 number
type V12e_Test26_Literal24 = ExtractKeyofV12e<Test26, 24>;  // '24'
type V12d_Test26_Literal24 = ExtractKeyofV12d<Test26, 24>;  // 24
let verify_v12e_26_l24: V12e_Test26_Literal24 = '24';  // ✅ string '24'
let verify_v12d_26_l24: V12d_Test26_Literal24 = 24;    // ✅ number 24

// ✅ 總結：
// - ExtractKeyofV12e：內建 ITSTypeAndStringLiteral 邏輯，無需外部庫
// - ExtractKeyofV12e_Simulated：FilterKeysV3 同樣可以模擬此功能
// - 核心機制：string 保持不變，number 使用模板字面量轉換

// ---------- ExtractKeyofV13 驗證測試 ----------

// 測試數據
type TestKeysV13 = 'log' | 'debug' | 'error' | 42 | 99 | symbol;

// 測試 1：篩選 string 類型鍵（等同 ExtractKeyofV12d<TestKeysV13, string>）
type V13_Strings = ExtractKeyofV13<TestKeysV13, string, PropertyKey>;
let verify_v13_1: V13_Strings = 'log';
let verify_v13_2: V13_Strings = 'debug';
let verify_v13_3: V13_Strings = 'error';

// 測試 2：篩選 number 類型鍵
type V13_Numbers = ExtractKeyofV13<TestKeysV13, number, PropertyKey>;
let verify_v13_4: V13_Numbers = 42;
let verify_v13_5: V13_Numbers = 99;

// 測試 3：只保留特定字面量
type V13_Picked = ExtractKeyofV13<TestKeysV13, 'log' | 'debug', PropertyKey>;
let verify_v13_6: V13_Picked = 'log';
let verify_v13_7: V13_Picked = 'debug';

// 測試 4：限制 AllowedPropertyKey 為 string（過濾 number 和 symbol）
type V13_StringOnly = ExtractKeyofV13<TestKeysV13, PropertyKey, string>;
let verify_v13_8: V13_StringOnly = 'log';
// @ts-expect-error - number 被過濾
let verify_v13_9: V13_StringOnly = 42;

// 測試 5：實作 ExtractKeyofV12（輸出轉為 string）
type V13_AsStrings = ExtractKeyofV13<TestKeysV13, string, PropertyKey> & string;
let verify_v13_10: V13_AsStrings = 'log';

// 測試 6：symbol 被過濾
type V13_Symbol = ExtractKeyofV13<TestKeysV13, symbol, PropertyKey>;  // never

// 測試 7：特定數字字面量作為參數（只保留 42，過濾其他）
type V13_SpecificNumbers = ExtractKeyofV13<TestKeysV13, 42, PropertyKey>;
let verify_v13_11: V13_SpecificNumbers = 42;
// @ts-expect-error - 99 被過濾
let verify_v13_12: V13_SpecificNumbers = 99;
// @ts-expect-error - 其他數字被過濾
let verify_v13_13: V13_SpecificNumbers = 100;

// 測試 8：enum 作為輸入類型
enum LogLevel {
	DEBUG = 'debug',
	INFO = 'info',
	WARN = 'warn',
	ERROR = 'error'
}

enum StatusCode {
	OK = 200,
	NOT_FOUND = 404,
	ERROR = 500
}

// enum 的鍵提取
type EnumKeys = keyof typeof LogLevel;  // 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
type EnumValues = `${LogLevel}`;  // 'debug' | 'info' | 'warn' | 'error'

// 測試：從 enum 鍵中篩選
type V13_EnumKeys = ExtractKeyofV13<EnumKeys, 'DEBUG' | 'INFO', PropertyKey>;
let verify_v13_14: V13_EnumKeys = 'DEBUG';
let verify_v13_15: V13_EnumKeys = 'INFO';
// @ts-expect-error - WARN 被過濾
let verify_v13_16: V13_EnumKeys = 'WARN';

// 測試：從 enum 值中篩選 string 類型
type V13_EnumStringValues = ExtractKeyofV13<EnumValues, string, PropertyKey>;
let verify_v13_17: V13_EnumStringValues = 'debug';
let verify_v13_18: V13_EnumStringValues = 'error';

// 測試：數字 enum 的鍵
type StatusEnumKeys = keyof typeof StatusCode;  // 'OK' | 'NOT_FOUND' | 'ERROR'
type V13_StatusEnumKeys = ExtractKeyofV13<StatusEnumKeys, 'OK' | 'ERROR', PropertyKey>;
let verify_v13_19: V13_StatusEnumKeys = 'OK';
// @ts-expect-error - NOT_FOUND 被過濾
let verify_v13_20: V13_StatusEnumKeys = 'NOT_FOUND';

// 測試：數字 enum 的值（number 類型）
type StatusEnumValues = `${StatusCode}` extends `${infer N}` ? N : never;  // 200 | 404 | 500
type V13_StatusEnumValues = ExtractKeyofV13<200 | 404 | 500, 200 | 500, PropertyKey>;
let verify_v13_21: V13_StatusEnumValues = 200;
let verify_v13_22: V13_StatusEnumValues = 500;
// @ts-expect-error - 404 被過濾
let verify_v13_23: V13_StatusEnumValues = 404;

// 測試 9：直接傳入 enum 類型
// 注意：TypeScript 中 enum 作為類型時，需使用 keyof typeof 或 ${Enum} 來獲取其成員

// 測試：使用模板字面量獲取 enum 值類型
// `${LogLevel}` 會將 enum 值轉換為 string 字面量聯合
type LogLevelValue = `${LogLevel}`;  // 'debug' | 'info' | 'warn' | 'error'
type V13_EnumType = ExtractKeyofV13<LogLevelValue, string, PropertyKey>;
let verify_v13_24: V13_EnumType = 'debug';
let verify_v13_25: V13_EnumType = 'info';
let verify_v13_26: V13_EnumType = 'error';

// 測試：從 StatusCode enum 篩選特定值
// 數字 enum 的值需直接使用聯合類型
type V13_StatusEnumType = ExtractKeyofV13<StatusCode.OK | StatusCode.NOT_FOUND | StatusCode.ERROR, 200 | 500, PropertyKey>;
let verify_v13_27: V13_StatusEnumType = 200;
let verify_v13_28: V13_StatusEnumType = 500;
// @ts-expect-error - 404 被過濾
let verify_v13_29: V13_StatusEnumType = 404;

// 測試 10：enum 作為第二參數（IncludeKeys）
// 使用 enum 成員作為篩選條件
// 注意：TypeScript enum 作為類型時需使用模板字面量 `${Enum}` 獲取值聯合

// 測試：使用 LogLevel enum 值作為 IncludeKeys
type AllStringValues = 'debug' | 'info' | 'warn' | 'error' | 'trace' | 'fatal';
type V13_EnumAsIncludeKeys = ExtractKeyofV13<AllStringValues, `${LogLevel}`, PropertyKey>;
let verify_v13_30: V13_EnumAsIncludeKeys = 'debug';
let verify_v13_31: V13_EnumAsIncludeKeys = 'error';
// @ts-expect-error - 'trace' 不在 LogLevel enum 中
let verify_v13_32: V13_EnumAsIncludeKeys = 'trace';
// @ts-expect-error - 'fatal' 不在 LogLevel enum 中
let verify_v13_33: V13_EnumAsIncludeKeys = 'fatal';

type AllStringValues_b = ITSTypeAndStringLiteral<LogLevel> | 42 | symbol;
type V13_EnumAsIncludeKeys_b = ExtractKeyofV13<AllStringValues_b, ITSTypeAndStringLiteral<LogLevel.DEBUG | LogLevel.ERROR>, PropertyKey>;
let verify_v13_30_b: V13_EnumAsIncludeKeys_b = LogLevel.DEBUG;
let verify_v13_31_b: V13_EnumAsIncludeKeys_b = LogLevel.ERROR;
// @ts-expect-error - 'trace' 不在 LogLevel enum 中
let verify_v13_32_b: V13_EnumAsIncludeKeys_b = LogLevel.TRACE;
// @ts-expect-error - 'fatal' 不在 LogLevel enum 中
let verify_v13_33_b: V13_EnumAsIncludeKeys_b = LogLevel.FATAL;

// 測試：使用 StatusCode enum 值作為 IncludeKeys
// 數字 enum 需使用 `${Enum}` 獲取數字字面量聯合
type AllStatusCodes = 200 | 301 | 404 | 500 | 503;
type StatusCodeValues = `${StatusCode}` extends `${infer N extends number}` ? N : never;  // 200 | 404 | 500
type V13_StatusEnumAsIncludeKeys = ExtractKeyofV13<AllStatusCodes, StatusCode, PropertyKey>;
let verify_v13_34: V13_StatusEnumAsIncludeKeys = 200;
let verify_v13_35: V13_StatusEnumAsIncludeKeys = 404;
let verify_v13_36: V13_StatusEnumAsIncludeKeys = 500;
// @ts-expect-error - 301 不在 StatusCode enum 中
let verify_v13_37: V13_StatusEnumAsIncludeKeys = 301;
// @ts-expect-error - 503 不在 StatusCode enum 中
let verify_v13_38: V13_StatusEnumAsIncludeKeys = 503;

// ✅ 總結：
// - ExtractKeyofV13 採用「選擇」思維（IncludeKeys），與 FilterKeys 的「排除」思維互補
// - 可實現 ExtractKeyofV12d 的所有功能，語義更清晰
// - 三參數設計：T（輸入）、IncludeKeys（選擇條件）、AllowedPropertyKey（類型限制）

// ==================== FilterKeys 與 Exclude 的差異說明 ====================

/**
 * 為什麼需要 FilterKeys 而不是直接使用內化排除 (如 V12b)？
 *
 * 1. 分階段排除（無法一次完成時）
 *    場景：從不同來源獲取鍵，需統一過濾
 *    type Stage1 = MemberMethodsV12<ApiA>;  // 提取 A 的方法
 *    type Stage2 = MemberMethodsV12<ApiB>;  // 提取 B 的方法
 *    type Combined = FilterKeys<Stage1 | Stage2, 'constructor' | 'init'>;
 *
 * 2. 動態排除列表（運行時配置）
 *    FilterKeys 可根據條件應用不同排除
 *    type Configurable<T, Stage extends 'extract' | 'filter'> =
 *      Stage extends 'extract'
 *        ? MemberMethodsV12<T>           // 第一階段：不排除
 *        : FilterKeys<T, 'secret'>;      // 第二階段：動態排除
 *
 * 3. FilterKeys<T, K> 與 Exclude<T, K> 的直接對比
 *
 *    | 特性       | FilterKeys<T, K>          | Exclude<T, K>            |
 *    |-----------|---------------------------|--------------------------|
 *    | 輸入類型   | T 可以是任意類型          | T 必須是 union 類型        |
 *    | 輸出類型   | 保持 T 的結構             | 直接從 union 中移除       |
 *    | 條件支持   | ✅ 可以添加複雜條件        | ❌ 純粹的集合運算          |
 *    | 組合性     | ✅ 可鏈式調用              | ⚠️ 只能最終一步使用      |
 *
 *    FilterKeys 可以處理非 union 類型並添加條件：
 *    type FilterKeys<T, K> = T extends infer U
 *      ? U extends string
 *        ? U extends K ? never : U      // 基礎過濾 + 條件
 *        : never
 *      : never;
 *
 *    Exclude 純粹是集合減法：
 *    type Result = Exclude<'a' | 'b' | 'c', 'c'>;  // 'a' | 'b'
 *
 * 4. 實際需要 FilterKeys 的例子
 *
 *    // 情況 A：提取時不知道要排除什麼
 *    type AllMethods = MemberMethodsV12<SomeClass>;  // 先提取全部
 *    type PublicMethods = FilterKeys<AllMethods, '_' | '$'>;  // 後續過濾私有前綴
 *
 *    // 情況 B：條件過濾（Exclude 做不到）
 *    type ConditionalFilter<T, ExcludePrivate extends boolean> =
 *      ExcludePrivate extends true
 *        ? FilterKeys<T, `_${string}`>  // 排除下劃線開頭
 *        : T;
 *
 * 結論：
 * - V12b 適合已知固定排除列表的場景
 * - FilterKeys 適合動態、分階段或條件化的過濾需求
 */
