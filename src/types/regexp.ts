import { zhRegExpWithPluginEnabled } from "regexp-cjk-with-plugin-enabled";

/**
 * 高負載偵測模式 / High load detection pattern
 *
 * 偵測伺服器回傳的 "高負載" 或 "請稍後重試" 等訊息
 * Detects server responses indicating "high load" or "retry later"
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
export const HIGH_LOAD_PATTERN: RegExp = new zhRegExpWithPluginEnabled('under\\s+high\\s+load|retry.+(?:after|wait)|please.+wait|高負載|後重試|再試行|高負荷|Provider\\s*(?:returned\\s*)?error|rate.*limit(?:ed|s)?', 'i');
