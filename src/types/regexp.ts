/**
 * 正則模式集中定義 / Regex Pattern Registry
 *
 * 所有 arise plugin 用於錯誤分類、負載偵測、提示識別的 RegExp 集中於此
 * All RegExp used for error classification, load detection, and prompt recognition centralized here
 *
 * === 語言覆蓋要求 / Language Coverage Requirement ===
 * 每個 PATTERN 應至少涵蓋四種語言：
 * Each PATTERN should cover at least four languages:
 *
 * - 英文 / English
 * - 中文（簡體 + 繁體）/ Chinese (Simplified + Traditional)
 * - 日文 / Japanese
 * - 韓文 / Korean
 *
 * 使用 zhRegExpWithPluginEnabled 自動展開 CJK 全形/半形變體
 * Uses zhRegExpWithPluginEnabled to auto-expand CJK fullwidth/halfwidth variants
 *
 * === Bun Bug Workaround ===
 * ⚠️ 必須使用字串模式（string pattern）建立實例，不可使用 RegExp 字面量
 * ⚠️ Must use string pattern to create instance, NOT RegExp literal
 *
 * 原因：Bun 的 RegExp 實作存在 bug，傳入 RegExp 字面量時
 * zhRegExpWithPluginEnabled 的 CJK 字符展開會失效或產生錯誤結果
 * Reason: Bun's RegExp implementation has a bug that causes zhRegExpWithPluginEnabled's
 * CJK character expansion to fail or produce incorrect results when a RegExp literal is passed
 *
 * @see docs/zhRegExpWithPluginEnabled.md
 */

import { zhRegExpWithPluginEnabled } from "regexp-cjk-with-plugin-enabled";

/**
 * 高負載偵測模式 / High load detection pattern
 *
 * 偵測伺服器回傳的「高負載」或「請稍後重試」等訊息
 * Detects server responses indicating "high load" or "retry later"
 *
 * === 語言覆蓋 / Language Coverage ===
 * - 英文 EN: under high load, retry after/wait, please wait, rate limit, cannot connect
 * - 中文 ZH: 高負載/高負荷, 後重試/再試行
 * - 日文 JA: 高負荷, 再試行, しばらく待って, 接続できません
 * - 韓文 KO: 과부하, 재시도, 잠시 후, 연결할 수 없, 속도 제한
 *
 * ⚠️ Bun Bug Workaround：
 * 必須使用字串模式（string pattern）建立實例，不可使用 RegExp 字面量
 * Must use string pattern to create instance, NOT RegExp literal
 *
 * ✅ 正確 / Correct：
 *   new zhRegExpWithPluginEnabled('under\\s+high\\s+load|...', 'i')
 *
 * ❌ 錯誤 / Wrong（Bun 下展開結果異常）：
 *   new zhRegExpWithPluginEnabled(/under\s+high\s+load|.../i)
 *
 * 原因：Bun 的 RegExp 實作存在 bug，傳入 RegExp 字面量時
 * zhRegExpWithPluginEnabled 的 CJK 字符展開會失效或產生錯誤結果
 * Reason: Bun's RegExp implementation has a bug that causes zhRegExpWithPluginEnabled's
 * CJK character expansion to fail or produce incorrect results when a RegExp literal is passed
 *
 * 預期展開結果 / Expected expansion：
 *   /[uｕ][nｎ][dｄ][eｅ][rｒ]\s+[hｈ][iｉ][gｇ][hｈ]\s+[lｌ][oｏ][aａ][dｄ]|.../i
 *
 * @see docs/zhRegExpWithPluginEnabled.md
 */
export const HIGH_LOAD_PATTERN: RegExp = new zhRegExpWithPluginEnabled(
	[
		/** 英文 / English */
		'under\\s+high\\s+load',
		'retry.+(?:after|wait)',
		'please.+wait',
		'rate.*limit(?:ed|s)?',
		'(?:Cannot|Unable).*connect',
		'Provider\\s*(?:returned\\s*)?error',
		/** 中文 / Chinese */
		'高負載',
		'高負荷',
		'後重試',
		'再試行',
		/** 日文 / Japanese */
		'しばらく待って',
		'接続できません',
		/** 韓文 / Korean */
		'과부하',
		'재시도',
		'잠시\\s*후',
		'연결할\\s*수\\s*없',
		'속도\\s*제한',
	].join('|'),
	'i',
);

/**
 * 永久性錯誤偵測模式 / Permanent error detection pattern
 *
 * 這些錯誤無法透過重試解決，應跳過 auto-resume
 * These errors cannot be resolved by retrying, should skip auto-resume
 *
 * === 語言覆蓋 / Language Coverage ===
 * - 英文 EN: syntax error, unauthorized, forbidden, not found, deprecated, etc.
 * - 中文 ZH: 語法錯誤, 未授權, 禁止訪問, 找不到, 已棄用
 * - 日文 JA: 構文エラー, 認証失敗, 禁止, 見つかりません, 非推奨
 * - 韓文 KO: 구문 오류, 인증 실패, 금지됨, 찾을 수 없음, 지원 중단
 *
 * 包含以下類型 / Includes the following types:
 * - 語法/編譯錯誤 / Syntax/compilation errors
 * - 認證/授權失敗 / Authentication/authorization failures
 * - 資源不存在 / Resource not found
 * - 權限拒絕 / Permission denied
 * - 無效配置 / Invalid configuration
 */
export const PERMANENT_ERROR_PATTERN: RegExp = new zhRegExpWithPluginEnabled(
	[
		/** 英文 / English */
		'syntax\\s*error',
		'cannot\\s+find\\s+(?:name|module|symbol)',
		'type\\s+.*is\\s+not\\s+assignable',
		'(?:unauthorized|unauthenticated|auth\\s*(?:error|failure))',
		'access\\s*denied',
		'permission\\s*denied',
		'invalid\\s+(?:api\\s*)?key',
		'(?:forbidden|403)',
		'not\\s+found',
		'(?:no\\s+such|does\\s+not\\s+exist)',
		'invalid\\s+config(?:uration)?',
		'unsupported\\s+(?:model|provider|operation)',
		'deprecated',
		'max\\s+(?:context|token)\\s+(?:length|limit)\\s+exceeded',
		/** 中文 / Chinese */
		'語法錯誤',
		'未授權',
		'禁止訪問',
		'找不到',
		'已棄用',
		'無效的\\s*(?:配置|金鑰)',
		/** 日文 / Japanese */
		'構文エラー',
		'認証失敗',
		'禁止',
		'見つかりません',
		'非推奨',
		'無効な\\s*(?:設定|キー)',
		/** 韓文 / Korean */
		'구문\\s*오류',
		'인증\\s*실패',
		'금지됨',
		'찾을\\s*수\\s*없',
		'지원\\s*중단',
		'잘못된\\s*(?:설정|키)',
	].join('|'),
	'i',
);

/**
 * 繼續提示偵測模式 / Continuation prompt detection pattern
 *
 * 偵測 agent 回應結尾出現的「需要繼續嗎？」類提示
 * Detects "should I continue?" type prompts at the end of agent responses
 *
 * 只有當任務 idle 且 agent 明確詢問是否繼續時才觸發 auto-resume
 * Only triggers auto-resume when task is idle AND agent explicitly asks to continue
 *
 * === 語言覆蓋 / Language Coverage ===
 * - 英文 EN: continue, Shall I continue/proceed
 * - 中文 ZH: 需要繼續嗎, 繼續, 需要我繼續, 是否繼續
 * - 日文 JA: 続けますか, 継続しますか, 続行
 * - 韓文 KO: 계속할까요, 계속 진행, 계속
 */
export const CONTINUATION_PATTERN: RegExp = new zhRegExpWithPluginEnabled(
	[
		/** 英文 / English */
		'continue',
		'Shall I (?:continue|proceed)',
		/** 中文 / Chinese */
		'需要繼續(?:進行)?嗎',
		'繼續',
		'需要我(?:繼續|往下)',
		'是否繼續(?:執行|進行)?',
		/** 日文 / Japanese */
		'続けますか',
		'継続しますか',
		'続行',
		/** 韓文 / Korean */
		'계속할까요',
		'계속\\s*진행',
		'계속',
	].join('|'),
	'i',
);

/**
 * 步驟限制截斷偵測 — 截斷訊號 / Step limit cutoff — cutoff signal
 *
 * 偵測 agent 被系統強制中斷的「截斷宣告」
 * Detects the "cutoff announcement" when agent is forcibly stopped by the system
 *
 * ⚠️ 此 PATTERN 單獨匹配不代表應觸發 auto-resume
 * ⚠️ Matching this PATTERN alone does NOT mean auto-resume should trigger
 *
 * 必須同時滿足截斷訊號 + 剩餘提示（STEP_LIMIT_REMAINING_PATTERN）兩個條件
 * Must satisfy BOTH cutoff signal + remaining indication (STEP_LIMIT_REMAINING_PATTERN)
 *
 * === 語言覆蓋 / Language Coverage ===
 * - 英文 EN: Maximum Steps Reached, step limit reached, execution limit reached
 * - 中文 ZH: 已達最大步驟, 步驟限制
 * - 日文 JA: 最大ステップ, ステップ制限
 * - 韓文 KO: 최대 단계, 단계 제한
 */
export const STEP_LIMIT_REACHED_PATTERN: RegExp = new zhRegExpWithPluginEnabled(
	[
		/** 英文 / English */
		'Maximum Steps Reached',
		'step\\s*limit.*reached',
		'execution\\s*limit.*reached',
		'agent\\s*stopped.*(?:limit|maximum)',
		/** 中文 / Chinese */
		'已達最大步驟',
		'步驟限制',
		/** 日文 / Japanese */
		'最大ステップ',
		'ステップ制限',
		/** 韓文 / Korean */
		'최대\\s*단계',
		'단계\\s*제한',
	].join('|'),
	'i',
);

/**
 * 步驟限制截斷偵測 — 剩餘提示 / Step limit cutoff — remaining indication
 *
 * 偵測系統截斷後列出的「剩餘未完成工作」
 * Detects the "remaining unfinished work" listed after system cutoff
 *
 * === 語言覆蓋 / Language Coverage ===
 * - 英文 EN: Remaining, Next steps
 * - 中文 ZH: 剩餘, 下一步
 * - 日文 JA: 残り, 次のステップ
 * - 韓文 KO: 남은, 다음 단계
 */
export const STEP_LIMIT_REMAINING_PATTERN: RegExp = new zhRegExpWithPluginEnabled(
	[
		/** 英文 / English */
		'Remaining\\s*(?:tasks?|steps?|work|items?)',
		'Next\\s*steps?',
		/** 中文 / Chinese */
		'剩餘\\s*(?:任務|步驟|工作)',
		'下一步',
		/** 日文 / Japanese */
		'残り\\s*(?:タスク|ステップ|作業)',
		'次のステップ',
		/** 韓文 / Korean */
		'남은\\s*(?:작업|단계|할\\s*일)',
		'다음\\s*단계',
	].join('|'),
	'i',
);
