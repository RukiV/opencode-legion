/**
 * Day.js 統一存取模組
 * Day.js unified access module
 *
 * 預設載入 relativeTime 外掛
 * Loads relativeTime plugin by default
 */
import { tzDayjsSafeParse } from "dayjs-tz-helper";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { DEFAULT_DATE_TIME_FORMAT } from "../../types/const-default";

/**
 * 載入 relativeTime 外掛
 * Load relativeTime plugin
 */
dayjs.extend(relativeTime);

/**
 * 解析日期（安全版本）
 * Parse date (safe version)
 *
 * @returns dayjs 物件
 */
export { tzDayjsSafeParse as tzDayjs }

/**
 * 格式化日期
 * Format date
 *
 * @param dateOrMilliseconds - 日期或毫秒時間戳
 * @param format - 格式字串
 * @returns 格式化後的字串
 */
export function formatDate(dateOrMilliseconds: dayjs.ConfigType, format: string = DEFAULT_DATE_TIME_FORMAT): string
{
	return tzDayjsSafeParse(dateOrMilliseconds).format(format);
}

/**
 * 取得相對時間（人類可讀）
 * Get relative time (human readable)
 *
 * @param dateOrMilliseconds - 日期或毫秒時間戳
 * @returns 相對時間字串，如 "5 minutes ago", "in 2 hours"
 */
export function fromNow(dateOrMilliseconds: dayjs.ConfigType): string
{
	return tzDayjsSafeParse(dateOrMilliseconds).fromNow();
}

export default dayjs;
