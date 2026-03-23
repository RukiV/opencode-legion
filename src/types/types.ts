import { ITSPartialRecord } from "ts-type";
import { EnumAriseTools } from "../types/enums";
import { IReturnTypeOfPluginToolArise } from "./opencode";

export type IReturnHasPlugin<T extends string> = ITSPartialRecord<T, string[]>;

export type IAriseTools = {
  [k in EnumAriseTools]: IReturnTypeOfPluginToolArise<k>;
};

/**
 * Non-Null Assertion Operator
 * 配置值安全斷言 / Config value safety assertion
 *
 * 排除 undefined 和 null
 * Exclude undefined and null
 *
 * 邏輯意圖：
 * - 確保配置值在讀取時不為 null 或 undefined
 * - 配合非空斷言 (!) 使用，在編譯期確保型別安全
 * - 避免 Runtime 空值錯誤
 *
 * @example
 * type PollInterval = IValueNotPartial<IAriseConfig["background"]["poll_interval"]>
 * // 若 poll_interval 為 number | null，結果為 number
 */
export type IValueNotPartial<T> = Exclude<T, undefined | null>;
