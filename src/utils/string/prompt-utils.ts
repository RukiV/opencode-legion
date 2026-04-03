/**
 * Prompt 組合工具
 * Prompt composition utilities
 */

import { _isNonNullable } from '../type/type-guard';

/**
 * 將陣列過濾並 join 的工具函數
 * Utility function to filter and join array
 *
 * @param arr - 要處理的陣列 / Array to process
 * @param separator - join 的分隔符 / Separator (default: '\n')
 * @param predicate - 過濾條件 / Filter predicate (default: only filter null/undefined)
 * @returns 處理後的字串 / Processed string
 */
export function processArray(
	arr: string[],
	separator: string = '\n',
	predicate: (value: string) => boolean = _isNonNullable
): string
{
	return arr.filter(predicate).join(separator);
}

/**
 * Prompt 區塊結構
 * Prompt block structure
 */
export interface IPromptBlock
{
	header: string[];
	body: string[];
	footer: string[];
}

export interface IPromptComposeOptions
{
	separatorMain?: string;
	separatorSub?: string;
	separatorHeader?: string;
	separatorBody?: string;
	separatorFooter?: string;
}

/**
 * 組合單個 Prompt 區塊
 * Compose a single Prompt block
 *
 * @param block - IPromptBlock 區塊
 * @returns 組合後的字串
 */
export function composePrompt(block: IPromptBlock, opts?: IPromptComposeOptions): string
{
	opts ??= {};

	const defaultSub = '\n\n';
	const defaultMain = '\n\n\n';

	const headerPart = processArray(block.header, opts.separatorHeader ?? opts.separatorSub ?? defaultSub);
	const bodyPart = processArray(block.body, opts.separatorBody ?? opts.separatorSub ?? defaultSub);
	const footerPart = processArray(block.footer, opts.separatorFooter ?? opts.separatorSub ?? defaultSub);

	return processArray([headerPart, bodyPart, footerPart], opts.separatorMain ?? defaultMain);
}
