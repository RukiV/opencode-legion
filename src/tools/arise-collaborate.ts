/**
 * arise_collaborate 工具主體檔案
 * arise_collaborate tool main file
 *
 * 實現多個 Shadow Agent 協作的功能
 * Implements multi-Shadow Agent collaboration functionality
 */

import type { PluginInput, ToolContext } from "@opencode-ai/plugin";
import type { IAriseConfig } from "../config/schema";
import { EnumAriseTools, EnumCollaborateMode, ALLOWED_SHADOWS, BackgroundTaskStatus } from "../types/enums";
import { getAriseToolsConfigEntry } from "../agents/lib/arise-tools-utils";
import { tool2 } from '../types/types-opencode';
import { logArise2WithLevel } from "../utils/debug-control";
import {
	formatAriseMsgError,
	formatAriseMsgSuccessMultiLine,
} from "../utils/string/arise-message";
import {
	DEFAULT_COLLABORATE_TOTAL_ROUNDS,
	MAX_COLLABORATE_TOTAL_ROUNDS,
	DEFAULT_COLLABORATE_MAX_CONCURRENT,
	MAX_COLLABORATE_MAX_CONCURRENT,
	DEFAULT_COLLABORATE_ROUND_TIMEOUT_MS,
} from "../types/const-default";
import type { BackgroundManager } from "./lib/background-manager";

/**
 * Collaborate 工具參數類型
 * Collaborate tool arguments type
 */
interface ICollaborateArgs
{
	/** 協作模式 / Collaboration mode */
	mode: EnumCollaborateMode;
	/** 參與的 Shadow Agent 列表 / List of participating Shadow agents */
	shadows: typeof ALLOWED_SHADOWS[number][];
	/** 任務提示 / Task prompt */
	prompt: string;
	/** 任務描述（可選）/ Task description (optional) */
	description?: string;
	/** 指定模型（可選）/ Specified model (optional) */
	model?: string;
	/** 總回合數（可選）/ Total rounds (optional) */
	total_rounds?: number;
	/** 最大並行數（可選）/ Max concurrent (optional) */
	max_concurrent?: number;
	/** 回合超時（毫秒，可選）/ Round timeout in ms (optional) */
	round_timeout_ms?: number;
	/** 每個 agent 回合數（可選）/ Per-agent rounds (optional) */
	per_agent_rounds?: number;
}

/**
 * 解析並合併 Config 與工具參數
 * Resolve and merge Config with tool arguments
 *
 * @param config - Arise 配置
 * @param args - 工具參數
 * @returns 合併後的 Collaborate 配置
 */
function resolveCollaborateConfig(config: IAriseConfig, args: ICollaborateArgs)
{
	/**
	 * 預設值：從 config.collaborate 取得，若無則使用預設常數
	 * Default values: get from config.collaborate, otherwise use default constants
	 */
	const configCollaborate = config.collaborate ?? {};

	return {
		/** 協作模式 / Collaboration mode */
		mode: args.mode,
		/** 參與的 Shadow Agent 列表 / List of participating Shadow agents */
		shadows: args.shadows,
		/** 任務提示 / Task prompt */
		prompt: args.prompt,
		/** 總回合數 / Total rounds */
		total_rounds: args.total_rounds ?? configCollaborate.total_rounds ?? DEFAULT_COLLABORATE_TOTAL_ROUNDS,
		/** 最大並行數 / Maximum concurrent agents */
		max_concurrent: args.max_concurrent ?? configCollaborate.max_concurrent ?? DEFAULT_COLLABORATE_MAX_CONCURRENT,
		/** 回合超時（毫秒）/ Round timeout in milliseconds */
		round_timeout_ms: args.round_timeout_ms ?? configCollaborate.round_timeout_ms ?? DEFAULT_COLLABORATE_ROUND_TIMEOUT_MS,
		/** 任務描述 / Task description */
		description: args.description,
		/** 指定模型 / Specified model */
		model: args.model,
	};
}

/**
 * 驗證參數並截斷超過上限的值
 * Validate args and truncate values exceeding maximum limits
 *
 * @param args - 工具參數
 * @returns 驗證後的參數
 */
function validateCollaborateArgs(args: ICollaborateArgs): ICollaborateArgs
{
	/**
	 * 截斷總回合數到上限
	 * Truncate total_rounds to maximum
	 */
	const total_rounds = Math.min(args.total_rounds ?? DEFAULT_COLLABORATE_TOTAL_ROUNDS, MAX_COLLABORATE_TOTAL_ROUNDS);

	/**
	 * 截斷最大並行數到上限
	 * Truncate max_concurrent to maximum
	 */
	const max_concurrent = Math.min(args.max_concurrent ?? DEFAULT_COLLABORATE_MAX_CONCURRENT, MAX_COLLABORATE_MAX_CONCURRENT);

	/**
	 * 驗證 shadows 列表不為空
	 * Validate shadows list is not empty
	 */
	if (!args.shadows || args.shadows.length === 0)
	{
		throw new Error("At least one shadow agent is required");
	}

	/**
	 * 驗證 max_concurrent 不超過 shadows 數量
	 * Validate max_concurrent does not exceed shadows count
	 */
	if (max_concurrent > args.shadows.length)
	{
		throw new Error(`max_concurrent (${max_concurrent}) cannot exceed shadows count (${args.shadows.length})`);
	}

	return {
		...args,
		total_rounds,
		max_concurrent,
	};
}

/**
 * 建立 arise_collaborate 工具
 * Create arise_collaborate tool
 *
 * 提供多個 Shadow Agent 協作完成任務的功能
 * Provides functionality for multiple Shadow Agents to collaborate on completing tasks
 *
 * @param ctx - Plugin 上下文
 * @param config - Arise 配置
 * @param backgroundManager - 背景任務管理器
 */
export function createAgentToolAriseCollaborate(ctx: PluginInput,
	config: IAriseConfig,
	backgroundManager: BackgroundManager,
)
{
	const {
		description,
		args,
	} = getAriseToolsConfigEntry(EnumAriseTools.ARISE_COLLABORATE);

	return tool2<EnumAriseTools.ARISE_COLLABORATE>({
		description,
		args,

		/**
		 * 執行工具
		 * Execute tool
		 *
		 * 處理多個 Shadow Agent 的協作請求
		 * Handles multi-Shadow Agent collaboration requests
		 *
		 * @param args - 工具參數
		 * @param context - 執行上下文
		 * @returns 執行結果訊息
		 */
		async execute(args, context: ToolContext)
		{
			/**
			 * 狀態日誌：開始協作
			 * Status log: starting collaboration
			 */
			logArise2WithLevel("debug", () => [
				`[arise-collaborate]`,
				`Starting collaborate: mode=${args.mode}, shadows=${args.shadows?.join(', ')}`,
			], { force: true });

			try
			{
				/**
				 * 驗證參數
				 * Validate arguments
				 */
				const validatedArgs = validateCollaborateArgs(args);

				/**
				 * 解析配置
				 * Resolve configuration
				 */
				const collaborateConfig = resolveCollaborateConfig(config, validatedArgs);

				/**
				 * 狀態日誌：配置解析完成
				 * Status log: configuration resolved
				 */
				logArise2WithLevel("debug", () => [
					`[arise-collaborate]`,
					`Config resolved: total_rounds=${collaborateConfig.total_rounds}, max_concurrent=${collaborateConfig.max_concurrent}`,
				], { force: true });

				/**
				 * 根據模式執行協作
				 * Execute collaboration based on mode
				 */
				let result: string;

				switch (collaborateConfig.mode)
				{
					case EnumCollaborateMode.PLANNING:
						result = await executePlanningMode(backgroundManager, collaborateConfig, context);
						break;
					case EnumCollaborateMode.PARALLEL:
						result = await executeParallelMode(backgroundManager, collaborateConfig, context);
						break;
					case EnumCollaborateMode.CHAIN:
						result = await executeChainMode(backgroundManager, collaborateConfig, context);
						break;
					default:
						result = formatAriseMsgError(`Unknown collaboration mode: ${collaborateConfig.mode}`);
				}

				return result;
			}
			catch (error)
			{
				/**
				 * 錯誤處理
				 * Error handling
				 */
				const message = error instanceof Error ? error.message : String(error);

				logArise2WithLevel("error", () => [
					`[arise-collaborate]`,
					`Error: ${message}`,
				], { force: true });

				return formatAriseMsgError(`Collaborate failed: ${message}`);
			}
		},
	});
}

/**
 * 執行規劃模式 - 多個 agent 討論並達成共識
 * Execute planning mode - multiple agents discuss and reach consensus
 *
 * @param backgroundManager - 背景任務管理器
 * @param config - 協作配置
 * @param context - 工具上下文
 * @returns 執行結果
 */
async function executePlanningMode(backgroundManager: BackgroundManager, config: {
	mode: EnumCollaborateMode;
	shadows: typeof ALLOWED_SHADOWS[number][];
	prompt: string;
	total_rounds: number;
	round_timeout_ms: number;
	description?: string;
	model?: string;
}, context: ToolContext): Promise<string>
{
	/**
	 * 回合迭代追蹤
	 * Round iteration tracking
	 */
	let currentPrompt = config.prompt;
	const allResponses: string[] = [];

	logArise2WithLevel("debug", () => [
		`[arise-collaborate:planning]`,
		`Starting planning mode with ${config.shadows.length} agents`,
	], { force: true });

	/**
	 * 迴圈執行直到達到總回合數
	 * Loop until total rounds reached
	 */
	for (let round = 1; round <= config.total_rounds; round++)
	{
		logArise2WithLevel("debug", () => [
			`[arise-collaborate:planning]`,
			`Round ${round}/${config.total_rounds}`,
		], { force: true });

		/**
		 * 依次召喚每個 agent
		 * Summon each agent in sequence
		 */
		const roundResponses: string[] = [];

		for (const shadow of config.shadows)
		{
			/**
			 * 構建包含前一回應的提示
			 * Build prompt with previous responses
			 */
			const promptWithContext = allResponses.length > 0
				? `${currentPrompt}\n\nPrevious discussions:\n${allResponses.map((r,
					i,
				) => `${config.shadows[i % config.shadows.length]}: ${r}`).join('\n\n')}`
				: currentPrompt;

			/**
			 * 啟動背景任務
			 * Launch background task
			 */
			const task = await backgroundManager.launch({
				shadow,
				prompt: promptWithContext,
				description: config.description ?? `planning round ${round}`,
				parentSessionId: context.sessionID,
				model: config.model,
			});

			/**
			 * 等待結果
			 * Wait for result
			 */
			let completed = false;
			let responseText = "";
			let startTime = Date.now();

			while (!completed && (Date.now() - startTime) < config.round_timeout_ms)
			{
				await new Promise(resolve => setTimeout(resolve, 500));

				const currentTask = backgroundManager.getTask(task.id);
				if (currentTask?.status === BackgroundTaskStatus.Completed)
				{
					responseText = currentTask.result ?? "No response";
					completed = true;
				}
				else if (currentTask?.status === BackgroundTaskStatus.Error)
				{
					responseText = `Error: ${currentTask.error ?? "Unknown error"}`;
					completed = true;
				}
			}

			if (!completed)
			{
				backgroundManager.cancelTask(task.id);
				responseText = "Timeout waiting for agent response";
			}

			roundResponses.push(responseText);
			allResponses.push(responseText);
		}

		/**
		 * 檢查是否達成共識（所有回應相同或相似）
		 * Check if consensus reached (all responses same or similar)
		 */
		if (roundResponses.every(r => r === roundResponses[0]) && roundResponses.length > 0)
		{
			logArise2WithLevel("debug", () => [
				`[arise-collaborate:planning]`,
				`Consensus reached at round ${round}`,
			], { force: true });

			break;
		}
	}

	/**
	 * 組合最終結果
	 * Compose final result
	 */
	const details = [
		`Rounds: ${Math.min(config.total_rounds, allResponses.length / config.shadows.length)}`,
		`Agents: ${config.shadows.join(', ')}`,
		`Mode: planning`,
		"",
		"Final consensus:",
		allResponses[allResponses.length - 1] ?? "No consensus reached",
	].join('\n');

	return formatAriseMsgSuccessMultiLine(
		`Planning collaboration completed: ${config.shadows.join(', ')}`,
		details,
	);
}

/**
 * 執行平行模式 - 多個 agent 同時執行不同任務
 * Execute parallel mode - multiple agents execute different tasks simultaneously
 *
 * @param backgroundManager - 背景任務管理器
 * @param config - 協作配置
 * @param context - 工具上下文
 * @returns 執行結果
 */
async function executeParallelMode(backgroundManager: BackgroundManager, config: {
	mode: EnumCollaborateMode;
	shadows: typeof ALLOWED_SHADOWS[number][];
	prompt: string;
	max_concurrent: number;
	round_timeout_ms: number;
	description?: string;
	model?: string;
}, context: ToolContext): Promise<string>
{
	logArise2WithLevel("debug", () => [
		`[arise-collaborate:parallel]`,
		`Starting parallel mode with ${config.shadows.length} agents, max ${config.max_concurrent} concurrent`,
	], { force: true });

	/**
	 * 批次啟動任務
	 * Batch launch tasks
	 */
	const tasks: Array<{
		shadow: typeof config.shadows[number];
		task: { id: string };
		response: string;
	}> = [];

	/**
	 * 分批執行，每批不超過 max_concurrent
	 * Execute in batches, each batch no more than max_concurrent
	 */
	for (let i = 0; i < config.shadows.length; i += config.max_concurrent)
	{
		const batch = config.shadows.slice(i, i + config.max_concurrent);

		/**
		 * 並行啟動這批任務
		 * Launch this batch of tasks in parallel
		 */
		const batchPromises = batch.map(async (shadow) =>
		{
			const task = await backgroundManager.launch({
				shadow,
				prompt: config.prompt,
				description: config.description ?? `parallel task ${i}`,
				parentSessionId: context.sessionID,
				model: config.model,
			});

			return { shadow, task, response: "" as string };
		});

		/**
		 * 等待這批任務完成
		 * Wait for this batch to complete
		 */
		const batchResults = await Promise.all(batchPromises);

		/**
		 * 收集結果
		 * Collect results
		 */
		for (const result of batchResults)
		{
			let completed = false;
			let startTime = Date.now();

			while (!completed && (Date.now() - startTime) < config.round_timeout_ms)
			{
				await new Promise(resolve => setTimeout(resolve, 500));

				const currentTask = backgroundManager.getTask(result.task.id);
				if (currentTask?.status === BackgroundTaskStatus.Completed)
				{
					result.response = currentTask.result ?? "No response";
					completed = true;
				}
				else if (currentTask?.status === BackgroundTaskStatus.Error)
				{
					result.response = `Error: ${currentTask.error ?? "Unknown error"}`;
					completed = true;
				}
			}

			if (!completed)
			{
				backgroundManager.cancelTask(result.task.id);
				result.response = "Timeout waiting for agent response";
			}

			tasks.push(result);
		}
	}

	/**
	 * 組合最終結果
	 * Compose final result
	 */
	const resultsText = tasks.map(t =>
		`${t.shadow}: ${t.response}`,
	).join('\n\n');

	const details = [
		`Total agents: ${config.shadows.length}`,
		`Max concurrent: ${config.max_concurrent}`,
		`Mode: parallel`,
		"",
		"Results:",
		resultsText,
	].join('\n');

	return formatAriseMsgSuccessMultiLine(
		`Parallel collaboration completed: ${config.shadows.join(', ')}`,
		details,
	);
}

/**
 * 執行鏈式模式 - 多個 agent 依序執行，結果傳遞
 * Execute chain mode - multiple agents execute in sequence, passing results
 *
 * @param backgroundManager - 背景任務管理器
 * @param config - 協作配置
 * @param context - 工具上下文
 * @returns 執行結果
 */
async function executeChainMode(backgroundManager: BackgroundManager, config: {
	mode: EnumCollaborateMode;
	shadows: typeof ALLOWED_SHADOWS[number][];
	prompt: string;
	round_timeout_ms: number;
	description?: string;
	model?: string;
}, context: ToolContext): Promise<string>
{
	logArise2WithLevel("debug", () => [
		`[arise-collaborate:chain]`,
		`Starting chain mode with ${config.shadows.length} agents`,
	], { force: true });

	/**
	 * 累積的結果
	 * Accumulated results
	 */
	let previousResult = "";
	const chainResults: Array<{ shadow: typeof config.shadows[number]; result: string }> = [];

	/**
	 * 依序執行每個 agent
	 * Execute each agent in sequence
	 */
	for (const shadow of config.shadows)
	{
		/**
		 * 構建包含前一次結果的提示
		 * Build prompt with previous result
		 */
		const promptWithResult = previousResult
			? `${config.prompt}\n\nPrevious agent result:\n${previousResult}\n\nPlease build upon this result and continue the task.`
			: config.prompt;

		/**
		 * 啟動任務
		 * Launch task
		 */
		const task = await backgroundManager.launch({
			shadow,
			prompt: promptWithResult,
			description: config.description ?? `chain ${shadow}`,
			parentSessionId: context.sessionID,
			model: config.model,
		});

		/**
		 * 等待結果
		 * Wait for result
		 */
		let completed = false;
		let responseText = "";
		let startTime = Date.now();

		while (!completed && (Date.now() - startTime) < config.round_timeout_ms)
		{
			await new Promise(resolve => setTimeout(resolve, 500));

			const currentTask = backgroundManager.getTask(task.id);
			if (currentTask?.status === BackgroundTaskStatus.Completed)
			{
				responseText = currentTask.result ?? "No response";
				completed = true;
			}
			else if (currentTask?.status === BackgroundTaskStatus.Error)
			{
				responseText = `Error: ${currentTask.error ?? "Unknown error"}`;
				completed = true;
			}
		}

		if (!completed)
		{
			backgroundManager.cancelTask(task.id);
			responseText = "Timeout waiting for agent response";
		}

		previousResult = responseText;
		chainResults.push({ shadow, result: responseText });
	}

	/**
	 * 組合最終結果
	 * Compose final result
	 */
	const resultsText = chainResults.map(r =>
		`${r.shadow}:\n${r.result}`,
	).join('\n\n---\n\n');

	const details = [
		`Total agents: ${config.shadows.length}`,
		`Mode: chain`,
		"",
		"Chain execution results:",
		resultsText,
	].join('\n');

	return formatAriseMsgSuccessMultiLine(
		`Chain collaboration completed: ${config.shadows.join(', ')}`,
		details,
	);
}
