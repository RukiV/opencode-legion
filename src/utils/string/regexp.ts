import { HIGH_LOAD_PATTERN } from "../../types/regexp";


/**
 * 偵測錯誤訊息是否為高負載類型
 * Detect if error message indicates high load
 *
 * @param error - 錯誤訊息 / Error message
 * @returns 是否匹配高負載模式 / Whether it matches high load pattern
 */

export function isHighLoadError(error: string | undefined | null): boolean
{
  if (!error) return false;
  return HIGH_LOAD_PATTERN.test(error);
}
