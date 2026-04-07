/**
 * Created by user on 2026/4/7.
 */

import { ALL_ARISE_TOOLS, EnumAriseTools } from './enums';
import type { IAriseConfig } from '../config/schema';

/**
 * Code-level 預設禁用的工具列表
 * Code-level default disabled tools list
 *
 * 這些工具在代碼中被永久禁用，無論配置如何都不會註冊
 * These tools are permanently disabled in code, will never be registered regardless of config
 *
 * 使用方式：在 ALL_ARISE_TOOLS 中選擇要禁用的工具
 * Usage: Choose tools to disable from ALL_ARISE_TOOLS
 */
const DISABLED_TOOLS_CODE_LEVEL = [
	EnumAriseTools.ARISE_COLLABORATE,
] as readonly EnumAriseTools[];

/**
 * 取得 Code-level 禁用的工具集合
 * Get code-level disabled tools set
 *
 * @returns 只讀工具集合 / Read-only tools set
 */
export function getCodeLevelDisabledTools()
{
	return DISABLED_TOOLS_CODE_LEVEL;
}

/**
 * 取得活躍的工具列表（排除被禁用的工具）
 * Get active tools list (excluding disabled tools)
 *
 * 合併兩種禁用來源：
 * 1. Code-level（代碼中永久禁用）
 * 2. Config-level（配置文件中動態禁用）
 *
 * Merge two disabled sources:
 * 1. Code-level (permanently disabled in code)
 * 2. Config-level (dynamically disabled in config file)
 *
 * @param config - Arise 配置 / Arise config
 * @returns 活躍的工具陣列 / Active tools array
 */
export function getActiveTools(config: IAriseConfig)
{
	const allDisabled = getDisabledTools(config);

	return ALL_ARISE_TOOLS.filter(tool => !allDisabled.includes(tool)) as readonly EnumAriseTools[];
}

export function getDisabledTools(config: IAriseConfig)
{
	/**
	 * 合併 Code-level 和 Config-level 的禁用列表
	 * Merge Code-level and Config-level disabled lists
	 */
	const codeLevelDisabled = new Set(DISABLED_TOOLS_CODE_LEVEL);
	const configLevelDisabled = new Set(config.disabled_tools ?? []);

	const allDisabled = new Set([...codeLevelDisabled, ...configLevelDisabled]);

	return [...allDisabled] as readonly EnumAriseTools[];
}
