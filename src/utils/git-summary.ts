/**
 * Git 狀態摘要核心邏輯
 * Git status summary core logic
 *
 * 僅依賴 Node.js 內建模組、zod、與型別定義（config/schema）
 * Only depends on Node.js built-ins, zod, and type definitions (config/schema)
 *
 * @example
 * ```typescript
 * import { getGitSummary, formatGitSummary } from './git-summary';
 *
 * const result = getGitSummary({ log_count: 5, diff_stat: true });
 * console.log(formatGitSummary(result));
 * ```
 */
import { execSync } from 'child_process';
import type { IGitSummaryOptions } from '../config/schema/entry';

/** 重新匯出選項型別，方便外部僅從此模組匯入 / Re-export options type for convenience */
export type { IGitSummaryOptions } from '../config/schema/entry';

/**
 * Git 摘要結果
 * Git summary result
 *
 * 每個欄位為對應 git 指令的原始輸出
 * Each field is the raw output of the corresponding git command
 */
export interface IGitSummaryResult
{
	/** git status 原始輸出 / git status raw output */
	status: string;
	/** git diff --stat 原始輸出（空字串表示未請求）/ git diff --stat raw output (empty string if not requested) */
	diffStat: string;
	/** git log --oneline -N 原始輸出 / git log --oneline -N raw output */
	log: string;
	/** 是否請求 diff_stat / Whether diff_stat was requested */
	hasDiffStat: boolean;
	/** log_count 值 / log_count value */
	logCount: number;
}

/**
 * 執行 shell 指令並回傳輸出
 * Execute shell command and return output
 *
 * @param command - 要執行的指令 / Command to execute
 * @param options - execSync 選項（如 cwd、timeout 等）/ execSync options (e.g. cwd, timeout)
 * @returns 指令輸出 / Command output
 */
export function execCommand(command: string, options?: { cwd?: string; timeout?: number }): string
{
	try
	{
		return execSync(command, {
			encoding: 'utf-8',
			timeout: options?.timeout ?? 10000,
			cwd: options?.cwd,
		}) as string;
	}
	catch (error: any)
	{
		const stdout = error?.stdout?.toString?.()?.trim() ?? '';
		const stderr = error?.stderr?.toString?.()?.trim() ?? '';
		if (stdout)
		{
			return stdout;
		}
		if (stderr)
		{
			return `(error) ${stderr}`;
		}
		return `(error) Command failed: ${command}`;
	}
}

/**
 * 取得 Git 狀態摘要
 * Get Git status summary
 *
 * 並行執行 git status、diff --stat、log，回傳原始結果
 * Executes git status, diff --stat, log in parallel, returns raw results
 *
 * @param options - 摘要選項 / Summary options
 * @returns 摘要結果 / Summary result
 */
export function getGitSummary(options: IGitSummaryOptions = {}): IGitSummaryResult
{
	const { log_count = 5, diff_stat = true, cwd } = options;

	const execOpts = {
		encoding: 'utf-8' as const,
		timeout: 10000,
		cwd,
	};

	const status = execCommand('git status', execOpts);
	const diffStat = diff_stat ? execCommand('git diff --stat', execOpts) : '';
	const log = execCommand(`git log --oneline -${log_count}`, execOpts);

	return {
		status,
		diffStat,
		log,
		hasDiffStat: diff_stat,
		logCount: log_count,
	};
}

/**
 * 格式化 Git 摘要為可讀文字
 * Format Git summary as readable text
 *
 * @param result - 摘要結果 / Summary result
 * @returns 格式化後的文字 / Formatted text
 */
export function formatGitSummary(result: IGitSummaryResult): string
{
	const sections: string[] = [];

	const code_block = `\\\`\\\`\\\``;

	sections.push('## git status');
	sections.push(`${code_block}\n${result.status}\n${code_block}` || '(clean working tree)');

	if (result.hasDiffStat)
	{
		sections.push('');
		sections.push('## git diff --stat');
		sections.push(`${code_block}\n${result.diffStat}\n${code_block}` || '(no diff)');
	}

	sections.push('');
	sections.push(`## git log --oneline -${result.logCount}`);
	sections.push(`${code_block}\n${result.log}\n${code_block}` || '(no commits)');

	return sections.join('\n');
}
