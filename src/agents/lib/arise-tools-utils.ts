/**
 * Arise 工具函式
 * Arise tools utilities
 *
 * 工具相關的 getter 函式
 * Tool-related getter functions
 */

import type { ITSRequiredWith } from 'ts-type';
import { EnumAriseTools } from '../../types/enums';
import { ARISE_TOOLS } from '../shadows';
import { getAriseToolsMarkdown } from './tool-descriptions';

/**
 * 取得工具列表的格式化字串 (含 OpenCode 內建 task 工具)
 * Format tools list including OpenCode built-in task tool
 */
export function getAriseToolsSection(): string {
	const ariseTools = getAriseToolsMarkdown();
	return `## Available Tools
${ariseTools}
- task: OpenCode's built-in for complex multi-step delegation`;
}

/**
 * 取得工具設定項目
 * Get tool configuration entry
 *
 * 當 description 不存在時，會以 shortDescription 作為替代
 * When description is missing, falls back to shortDescription
 */
export function getAriseToolsConfigEntry<A extends EnumAriseTools>(ariseToolName: A)
{
	const ariseToolsConfigEntry = ARISE_TOOLS[ariseToolName];

	if (!ariseToolsConfigEntry)
	{
		throw new TypeError(`Tool ${ariseToolName} not found`);
	}

	// @ts-ignore
	ariseToolsConfigEntry.description ??= ariseToolsConfigEntry.shortDescription;

	return ariseToolsConfigEntry as any as ITSRequiredWith<typeof ARISE_TOOLS[A] & {
		description: string;
	}, 'description'>;
}
