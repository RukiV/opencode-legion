/**
 * arise_collaborate 工具主體檔案
 * arise_collaborate tool main file
 *
 * 實現多個 Shadow Agent 協作的功能
 * Implements multi-Shadow Agent collaboration functionality
 */

import type { PluginInput, ToolContext } from '@opencode-ai/plugin';
import type { IAriseConfig } from '../config/schema';
import {
	EnumAriseTools,
	EnumCollaborateMode,
	ALLOWED_SHADOWS,
	BackgroundTaskStatus,
	EnumCollaborationSessionStatus,
	EnumCollaborateTermination,
} from '../types/enums';
import { getAriseToolsConfigEntry } from '../agents/lib/arise-tools-utils';
import { tool2 } from '../types/types-opencode';
import { logArise2WithLevel } from '../utils/debug-control';
import {
	formatAriseMsgError,
	formatAriseMsgSuccessMultiLine,
} from '../utils/string/arise-message';
import {
	DEFAULT_COLLABORATE_TOTAL_ROUNDS,
	MAX_COLLABORATE_TOTAL_ROUNDS,
	DEFAULT_COLLABORATE_MAX_CONCURRENT,
	MAX_COLLABORATE_MAX_CONCURRENT,
	DEFAULT_COLLABORATE_ROUND_TIMEOUT_MS,
	COLLABORATE_ROUND_TIMEOUT_MS_MAX,
} from '../types/const-default';
import type { BackgroundManager } from './lib/background-manager';
import {
	getMaxConcurrent,
	getRoundTimeoutMs,
	getTotalRounds,
} from './lib/arise-collaborate-validator';
import { checkTermination } from './lib/arise-collaborate-termination';
import {
	normalizeShadowsEntries,
	getShadowDisplayName,
	type INormalizedCollaborateShadowEntry,
} from './lib/arise-collaborate-normalizer';
import {
	collaborationSessionManager,
	type ICollaborationSession,
} from './lib/collaboration-session';

// ==================== 共用常數 / Shared Constants ====================

/**
 * 輪詢間隔（毫秒）
 * Poll interval in milliseconds
 */
const POLL_INTERVAL_MS = 500;

// ==================== 共用工具函式 / Shared Utility Functions ====================

/**
 * 等待任務完成的工具函式
 * Utility function to wait for task completion
 *
 * @param backgroundManager - 背景任務管理器
 * @param taskId - 任務 ID
 * @param timeoutMs - 超時時間（毫秒）
 * @returns 任務結果或超時錯誤訊息
 */
async function waitForTaskCompletion(
	backgroundManager: BackgroundManager,
	taskId: string,
	timeoutMs: number,
): Promise<string>
{
	let completed = false;
	let responseText = "";
	let startTime = Date.now();

	while (!completed && (Date.now() - startTime) < timeoutMs)
	{
		await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

		const currentTask = backgroundManager.getTask(taskId);
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
		backgroundManager.cancelTask(taskId);
		responseText = "Timeout waiting for agent response";
	}

	return responseText;
}

/**
 * 啟動 Shadow Agent 任務
 * Launch Shadow Agent task
 *
 * @param backgroundManager - 背景任務管理器
 * @param shadow - Shadow Agent 名稱
 * @param prompt - 任務提示
 * @param description - 任務描述
 * @param context - 工具上下文
 * @param model - 指定模型（可選）
 * @param existingSessionId - 現有 session ID（可選，用於重用 session）
 * @returns 啟動的任務
 */
async function launchShadowTask(
	backgroundManager: BackgroundManager,
	shadow: string,
	prompt: string,
	description: string,
	context: ToolContext,
	model?: string,
	existingSessionId?: string,
)
{
	return backgroundManager.launch({
		shadow,
		prompt,
		description,
		parentSessionId: context.sessionID,
		model,
		existingSessionId,
	});
}

/**
 * 構建包含討論歷史的提示
 * Build prompt with discussion history
 *
 * @param basePrompt - 基礎提示
 * @param previousResponses - 前次回應列表
 * @param shadowNames - Shadow Agent 名稱列表
 * @returns 包含討論歷史的提示
 */
function buildPromptWithDiscussionHistory(
	basePrompt: string,
	previousResponses: string[],
	shadowEntries: INormalizedCollaborateShadowEntry[],
): string
{
	if (previousResponses.length === 0) return basePrompt;

	const shadowNames = shadowEntries.map(e => getShadowDisplayName(e));

	return `${basePrompt}\n\nPrevious discussions from all agents:\n${previousResponses.map((r,
		idx,
	) => `${shadowNames[idx % shadowNames.length]}: ${r}`).join('\n\n')}`;
}

/**
 * 構建包含前一次結果的提示
 * Build prompt with previous result
 *
 * @param basePrompt - 基礎提示
 * @param previousResult - 前一次結果
 * @returns 包含前一次結果的提示
 */
function buildPromptWithPreviousResult(
	basePrompt: string,
	previousResult: string,
): string
{
	if (!previousResult) return basePrompt;

	return `${basePrompt}\n\nPrevious agent result:\n${previousResult}\n\nPlease build upon this result and continue the task.`;
}

/**
 * 分批執行任務
 * Execute tasks in batches
 *
 * @param items - 要處理的項目列表
 * @param maxConcurrent - 每批最大並行數
 * @param processor - 處理每個項目的非同步函式
 * @returns 所有批次的結果陣列
 */
async function executeInBatches<TInput, TOutput>(
	items: TInput[],
	maxConcurrent: number,
	processor: (item: TInput) => Promise<TOutput>,
): Promise<TOutput[]>
{
	// TODO: [refactor] 可使用此函式簡化分批執行邏輯
	// 此函式目前未使用，因為現有邏輯需要更多自定義處理
	// This function is not currently used because existing logic requires more custom handling
	const results: TOutput[] = [];

	for (let i = 0; i < items.length; i += maxConcurrent)
	{
		const batch = items.slice(i, i + maxConcurrent);
		const batchPromises = batch.map(processor);
		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults);
	}

	return results;
}

// ==================== 類型定義 / Type Definitions ====================

/**
 * Collaborate 工具參數類型
 * Collaborate tool arguments type
 */
interface ICollaborateArgs
{
	/** 協作模式 / Collaboration mode */
	mode: EnumCollaborateMode;
	/** 參與的 Shadow Agent 列表 / List of participating Shadow agents */
	shadows: {
		/** Shadow agent 名稱 / Shadow agent name */
		agent: typeof ALLOWED_SHADOWS[number];
		/** 模型名稱，預設 "AUTO" / Model name, default "AUTO" */
		model?: string;
		/** 自訂標籤，選填 / Custom label, optional */
		label?: string;
	}[];
	/** 任務提示 / Task prompt */
	prompt: string;
	/** 任務描述（可選）/ Task description (optional) */
	description?: string;
	/** 總回合數（可選）/ Total rounds (optional) */
	total_rounds?: number;
	/** 最大並行數（可選）/ Max concurrent (optional) */
	max_concurrent?: number;
	/** 回合超時（毫秒，可選）/ Round timeout in ms (optional) */
	round_timeout_ms?: number;
	/** 每個 agent 回合數（可選）/ Per-agent rounds (optional) */
	per_agent_rounds?: number;
	/** 是否創建持久化 session / Whether to create persistent session */
	persistent?: boolean;
	/** 現有 session ID（繼續協作）/ Existing session ID (continue collaboration) */
	session_id?: string;
	/** 結束 session / End session */
	end_session?: boolean;
	/** 暫停 session / Pause session */
	pause_session?: boolean;
}

// ==================== 解析並合併 Config 與工具參數
// ==================== Resolve and merge Config with tool arguments

/**
 * 解析並合併 Config 與工具參數
 * Resolve and merge Config with tool arguments
 *
 * 使用新的驗證策略處理參數
 * Use new validation strategy for parameters
 *
 * @param config - Arise 配置
 * @param args - 工具參數
 * @returns 合併後的 Collaborate 配置
 */
/**
 * 合併後的 Collaborate 配置類型
 * Merged collaborate configuration type
 */
interface IResolvedCollaborateConfig
{
	mode: EnumCollaborateMode;
	shadows: INormalizedCollaborateShadowEntry[];
	prompt: string;
	total_rounds: number;
	max_concurrent: number;
	round_timeout_ms: number;
	description?: string;
	reuse_agent_session?: boolean;
	block_subagent_tools?: boolean;
}

function resolveCollaborateConfig(config: IAriseConfig, args: ICollaborateArgs): IResolvedCollaborateConfig
{
	return {
		/** 協作模式 / Collaboration mode */
		mode: args.mode,
		/** 已正規化的 Shadows 列表 / Normalized shadows list */
		shadows: normalizeShadowsEntries(args.shadows),
		/** 任務提示 / Task prompt */
		prompt: args.prompt,
		/** 總回合數 / Total rounds */
		total_rounds: getTotalRounds(args.total_rounds, config),
		/** 最大並行數 / Maximum concurrent agents */
		max_concurrent: getMaxConcurrent(args.max_concurrent, config),
		/** 回合超時（毫秒）/ Round timeout in milliseconds */
		round_timeout_ms: getRoundTimeoutMs(args.round_timeout_ms, config),
		/** 任務描述 / Task description */
		description: args.description,
		reuse_agent_session: args.reuse_agent_session,
		block_subagent_tools: args.block_subagent_tools,
	};
}

/**
 * 驗證參數
 * Validate arguments
 *
 * 參數值驗證已移至 resolveCollaborateConfig 中的專用驗證函式
 * Parameter value validation has been moved to dedicated validation functions in resolveCollaborateConfig
 *
 * @param args - 工具參數
 * @returns 驗證後的參數
 */
function validateCollaborateArgs(args: ICollaborateArgs): ICollaborateArgs
{
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
	 *
	 * 注意：此時 max_concurrent 尚未經過 getMaxConcurrent 處理
	 * 需要從 config 計算安全預設值來驗證
	 */

	return args;
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
			 * Session 操作優先路由
			 * Session operations take priority over new collaboration creation
			 */

			// 結束 session
			if (args.end_session && args.session_id)
			{
				logArise2WithLevel("debug", () => [
					`[arise-collaborate]`,
					`Ending session: ${args.session_id}`,
				], { force: true });

				return executeEndSession(args.session_id);
			}

			// 暫停 session
			if (args.pause_session && args.session_id)
			{
				logArise2WithLevel("debug", () => [
					`[arise-collaborate]`,
					`Pausing session: ${args.session_id}`,
				], { force: true });

				return executePauseSession(args.session_id);
			}

			// 繼續現有 session
			if (args.session_id)
			{
				const session = collaborationSessionManager.get(args.session_id);
				if (!session)
				{
					return formatAriseMsgError(`Session not found: ${args.session_id}`);
				}

				logArise2WithLevel("debug", () => [
					`[arise-collaborate]`,
					`Continuing session: ${args.session_id}, currentRound=${session.currentRound}`,
				], { force: true });

				return await executeContinueSession(session, backgroundManager, context);
			}

			// 列出所有 session（無 mode 也無 session_id 時）
			if (!args.mode)
			{
				return executeListSessions();
			}

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
				 * 持久化模式：創建 session 並執行第一回合
				 * Persistent mode: create session and execute first round
				 */
				if (args.persistent)
				{
					return await executePersistentCollaboration(
						backgroundManager,
						collaborateConfig,
						context,
					);
				}

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
	shadows: INormalizedCollaborateShadowEntry[];
	prompt: string;
	total_rounds: number;
	max_concurrent: number;
	round_timeout_ms: number;
	description?: string;
}, context: ToolContext): Promise<string>
{
	/**
	 * 回合迭代追蹤
	 * Round iteration tracking
	 */
	const allResponses: string[] = [];

	/**
	 * 判斷執行策略：傳統回合制 vs 分批並行
	 * Determine execution strategy: traditional round-based vs batched concurrent
	 *
	 * max_concurrent <= 1 或未設定時，使用傳統回合制（依序執行）
	 * When max_concurrent <= 1 or not set, use traditional round-based (sequential)
	 */
	const useBatchedExecution = config.max_concurrent > 1;

	logArise2WithLevel("debug", () => [
		`[arise-collaborate:planning]`,
		`Starting planning mode with ${config.shadows.length} agents, max_concurrent: ${config.max_concurrent}, mode: ${useBatchedExecution
			? 'batched'
			: 'sequential'}`,
	], { force: true });

	/**
	 * 迴圈執行直到達到總回合數
	 * Loop until total rounds reached
	 */
	for (let round = 1; round <= config.total_rounds; round++)
	{
		logArise2WithLevel("debug", () => [
			`[arise-collaborate:planning]`,
			`Round ${round}/${config.total_rounds}, mode: ${useBatchedExecution ? 'batched' : 'sequential'}`,
		], { force: true });

		/**
		 * 回合回應收集
		 * Round responses collection
		 */
		const roundResponses: string[] = [];

		/**
		 * 根據 max_concurrent 選擇執行方式
		 * Choose execution method based on max_concurrent
		 */
		if (useBatchedExecution)
		{
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
				const batchPromises = batch.map(async (entry) =>
				{
					/**
					 * 構建包含所有前次回應的提示
					 * Build prompt with all previous responses
					 */
					const promptWithContext = buildPromptWithDiscussionHistory(
						config.prompt,
						allResponses,
						config.shadows,
					);

					const task = await launchShadowTask(
						backgroundManager,
						entry.agent,
						promptWithContext,
						config.description ?? `planning round ${round}`,
						context,
						entry.model,
					);

					/**
					 * 等待結果
					 * Wait for result
					 */
					const responseText = await waitForTaskCompletion(
						backgroundManager,
						task.id,
						config.round_timeout_ms,
					);

					return { shadow: getShadowDisplayName(entry), response: responseText };
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
					roundResponses.push(result.response);
					allResponses.push(result.response);
				}
			}
			// Close the if block
		}

		else
		{
			/**
			 * 傳統回合制執行 - 依序執行每個 agent
			 * Traditional round-based execution - execute each agent sequentially
			 */
			for (const entry of config.shadows)
			{
				/**
				 * 構建包含所有前次回應的提示
				 * Build prompt with all previous responses
				 */
				const promptWithContext = buildPromptWithDiscussionHistory(
					config.prompt,
					allResponses,
					config.shadows,
				);

				const task = await launchShadowTask(
					backgroundManager,
					entry.agent,
					promptWithContext,
					config.description ?? `planning round ${round}`,
					context,
					entry.model,
				);

				/**
				 * 等待結果
				 * Wait for result
				 */
				const responseText = await waitForTaskCompletion(
					backgroundManager,
					task.id,
					config.round_timeout_ms,
				);

				roundResponses.push(responseText);
				allResponses.push(responseText);
			}
		}

		/**
		 * 檢查終止標記
		 * Check termination markers
		 */
		for (const response of roundResponses)
		{
			const termination = checkTermination(response);
			if (termination.shouldStop)
			{
				logArise2WithLevel("debug", () => [
					`[arise-collaborate:planning]`,
					`Termination marker detected: ${termination.terminationType} at round ${round}`,
				], { force: true });

				/**
				 * 組合終止結果
				 * Compose termination result
				 */
				const details = [
					`Rounds: ${round}`,
					`Agents: ${config.shadows.map(s => getShadowDisplayName(s)).join(", ")}`,
					`Mode: planning`,
					`Termination: ${termination.terminationType}`,
					"",
					"Final response:",
					termination.finalResponse,
				].join("\n");

				return formatAriseMsgSuccessMultiLine(
					`Planning collaboration terminated: ${termination.terminationType}`,
					details,
				);
			}
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
		`Agents: ${config.shadows.map(s => getShadowDisplayName(s)).join(', ')}`,
		`Mode: planning`,
		"",
		"Final consensus:",
		allResponses[allResponses.length - 1] ?? "No consensus reached",
	].join('\n');

	return formatAriseMsgSuccessMultiLine(
		`Planning collaboration completed: ${config.shadows.map(s => getShadowDisplayName(s)).join(', ')}`,
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
	shadows: INormalizedCollaborateShadowEntry[];
	prompt: string;
	max_concurrent: number;
	round_timeout_ms: number;
	description?: string;
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
	const tasks: Array<INormalizedCollaborateShadowEntry & {
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
		 * 並行啟動這批任務並等待結果
		 * Launch this batch of tasks in parallel and wait for results
		 */
		const batchResults = await Promise.all(
			batch.map(async (entry) =>
			{
				const task = await launchShadowTask(
					backgroundManager,
					entry.agent,
					config.prompt,
					config.description ?? `parallel task ${i}`,
					context,
					entry.model,
				);

				const response = await waitForTaskCompletion(
					backgroundManager,
					task.id,
					config.round_timeout_ms,
				);

				return { ...entry, task, response };
			}),
		);

		tasks.push(...batchResults);
	}

	/**
	 * 檢查終止標記
	 * Check termination markers
	 */
	for (const task of tasks)
	{
		const termination = checkTermination(task.response);
		if (termination.shouldStop)
		{
			logArise2WithLevel("debug", () => [
				`[arise-collaborate:parallel]`,
				`Termination marker detected: ${termination.terminationType}`,
			], { force: true });

			const resultsText = tasks.map(t =>
				`${getShadowDisplayName(t)}: ${t.response}`,
			).join('\n\n');

			const details = [
				`Total agents: ${config.shadows.length}`,
				`Max concurrent: ${config.max_concurrent}`,
				`Mode: parallel`,
				`Termination: ${termination.terminationType}`,
				"",
				"Results:",
				resultsText,
			].join('\n');

			return formatAriseMsgSuccessMultiLine(
				`Parallel collaboration terminated: ${termination.terminationType}`,
				details,
			);
		}
	}

	/**
	 * 組合最終結果
	 * Compose final result
	 */
	const resultsText = tasks.map(t =>
		`${getShadowDisplayName(t)}: ${t.response}`,
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
		`Parallel collaboration completed: ${config.shadows.map(s => getShadowDisplayName(s)).join(', ')}`,
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
	shadows: INormalizedCollaborateShadowEntry[];
	prompt: string;
	max_concurrent: number;
	round_timeout_ms: number;
	description?: string;
}, context: ToolContext): Promise<string>
{
	/**
	 * 判斷執行策略：傳統回合制 vs 分批並行
	 * Determine execution strategy: traditional round-based vs batched concurrent
	 *
	 * max_concurrent <= 1 或未設定時，使用傳統回合制（依序執行）
	 * When max_concurrent <= 1 or not set, use traditional round-based (sequential)
	 */
	const useBatchedExecution = config.max_concurrent > 1;

	logArise2WithLevel("debug", () => [
		`[arise-collaborate:chain]`,
		`Starting chain mode with ${config.shadows.length} agents, max_concurrent: ${config.max_concurrent}, mode: ${useBatchedExecution
			? 'batched'
			: 'sequential'}`,
	], { force: true });

	/**
	 * 累積的結果
	 * Accumulated results
	 */
	let previousResult = "";
	const chainResults: Array<INormalizedCollaborateShadowEntry & { result: string }> = [];

	/**
	 * 根據 max_concurrent 選擇執行方式
	 * Choose execution method based on max_concurrent
	 */
	if (useBatchedExecution)
	{
		/**
		 * 分批執行，每批不超過 max_concurrent
		 * Execute in batches, each batch no more than max_concurrent
		 */
		for (let i = 0; i < config.shadows.length; i += config.max_concurrent)
		{
			const batch = config.shadows.slice(i, i + config.max_concurrent);

			/**
			 * 這批 agents 同時執行
			 * This batch of agents executes simultaneously
			 */
			const batchResults = await Promise.all(
				batch.map(async (entry) =>
				{
					/**
					 * 構建包含上一次結果的提示
					 * Build prompt with previous result
					 */
					const promptWithResult = buildPromptWithPreviousResult(
						config.prompt,
						previousResult,
					);

					const task = await launchShadowTask(
						backgroundManager,
						entry.agent,
						promptWithResult,
						config.description ?? `chain ${getShadowDisplayName(entry)}`,
						context,
						entry.model,
					);

					/**
					 * 等待結果
					 * Wait for result
					 */
					const result = await waitForTaskCompletion(
						backgroundManager,
						task.id,
						config.round_timeout_ms,
					);

					return { ...entry, result };
				}),
			);

			/**
			 * 收集結果並更新 previousResult
			 * Collect results and update previousResult
			 */
			for (const result of batchResults)
			{
				previousResult = result.result;
				chainResults.push(result);

				/**
				 * 檢查終止標記
				 * Check termination markers
				 */
				const termination = checkTermination(result.result);
				if (termination.shouldStop)
				{
					logArise2WithLevel("debug", () => [
						`[arise-collaborate:chain]`,
						`Termination marker detected: ${termination.terminationType}`,
					], { force: true });

					const resultsText = chainResults.map(r =>
						`${getShadowDisplayName(r)}:\n${r.result}`,
					).join('\n\n---\n\n');

					const details = [
						`Total agents: ${config.shadows.length}`,
						`Max concurrent: ${config.max_concurrent}`,
						`Mode: chain`,
						`Termination: ${termination.terminationType}`,
						"",
						"Chain execution results:",
						resultsText,
					].join('\n');

					return formatAriseMsgSuccessMultiLine(
						`Chain collaboration terminated: ${termination.terminationType}`,
						details,
					);
				}
			}
		}
		// End of if (useBatchedExecution) for loop
		// Close the if block
	}

	else
	{
		for (const entry of config.shadows)
		{
			/**
			 * 構建包含上一次結果的提示
			 * Build prompt with previous result
			 */
			const promptWithResult = buildPromptWithPreviousResult(
				config.prompt,
				previousResult,
			);

			const task = await launchShadowTask(
				backgroundManager,
				entry.agent,
				promptWithResult,
				config.description ?? getShadowDisplayName(entry),
				context,
				entry.model,
			);

			/**
			 * 等待結果
			 * Wait for result
			 */
			const responseText = await waitForTaskCompletion(
				backgroundManager,
				task.id,
				config.round_timeout_ms,
			);

			previousResult = responseText;
			chainResults.push({ ...entry, result: responseText });

			/**
			 * 檢查終止標記
			 * Check termination markers
			 */
			const termination = checkTermination(responseText);
			if (termination.shouldStop)
			{
				logArise2WithLevel("debug", () => [
					`[arise-collaborate:chain]`,
					`Termination marker detected: ${termination.terminationType}`,
				], { force: true });

				const resultsText = chainResults.map(r =>
					`${getShadowDisplayName(r)}:\n${r.result}`,
				).join('\n\n---\n\n');

				const details = [
					`Total agents: ${config.shadows.length}`,
					`Max concurrent: ${config.max_concurrent}`,
					`Mode: chain`,
					`Termination: ${termination.terminationType}`,
					"",
					"Chain execution results:",
					resultsText,
				].join('\n');

				return formatAriseMsgSuccessMultiLine(
					`Chain collaboration terminated: ${termination.terminationType}`,
					details,
				);
			}
		}
	}

	/**
	 * 組合最終結果
	 * Compose final result
	 */
	const resultsText = chainResults.map(r =>
		`${getShadowDisplayName(r)}:\n${r.result}`,
	).join('\n\n---\n\n');

	const details = [
		`Total agents: ${config.shadows.length}`,
		`Max concurrent: ${config.max_concurrent}`,
		`Mode: chain`,
		"",
		"Chain execution results:",
		resultsText,
	].join('\n');

	return formatAriseMsgSuccessMultiLine(
		`Chain collaboration completed: ${config.shadows.map(s => getShadowDisplayName(s)).join(', ')}`,
		details,
	);
}

// ==================== 持久化 Session 操作
// ==================== Persistent Session Operations

/**
 * 構建下一回合提示（用於持久化 session 的後續回合）
 * Build next turn prompt (for subsequent rounds in persistent session)
 */
function buildNextTurnPrompt(agentLabel: string, round: number, session: ICollaborationSession): string
{
	const otherAgents = session.shadows.filter(e => e.label !== agentLabel).map(e => e.label);
	return `Round ${round}. Continue the discussion. Other participants: ${otherAgents.join(", ")}.`;
}

/**
 * 構建 session 狀態詳情
 */
function buildSessionStatusDetails(session: ICollaborationSession): string
{
	const agentStatus = session.shadows.map(e =>
	{
		const roundCount = session.perAgentRoundCount.get(e.label) ?? 0;
		const hasSession = session.agentSessionIds.has(e.label);
		return `  - ${getShadowDisplayName(e)}: ${roundCount} rounds, session: ${hasSession
			? "active"
			: "not yet created"}`;
	}).join("\n");

	return [
		`Session ID: ${session.id}`,
		`Mode: ${session.mode}`,
		`Status: ${session.status}`,
		`Round: ${session.currentRound}/${session.totalRounds}`,
		`Agents: ${session.shadows.length}`,
		`Terminated: ${session.terminated ? "Yes" : "No"}`,
		"",
		"Agent status:",
		agentStatus,
		"",
		`Use session_id: "${session.id}" to continue, or end_session: true to finish.`,
	].join("\n");
}

/**
 * 構建最終摘要
 */
function buildFinalSummary(session: ICollaborationSession): string
{
	const allResponses = session.allResponses;
	if (allResponses.length === 0) return "No responses collected.";
	return `Total rounds: ${session.currentRound}\nTotal responses: ${allResponses.length}\nTermination: ${session.terminatedBy ?? "manual"}\n\nFinal response:\n${allResponses[allResponses.length - 1]}`;
}

/**
 * 構建 session 結束詳情
 */
function buildSessionEndDetails(session: ICollaborationSession): string
{
	return [
		`Session ID: ${session.id}`,
		`Mode: ${session.mode}`,
		`Total rounds executed: ${session.currentRound}`,
		`Termination: ${session.terminatedBy ?? "manual"}`,
		`Reason: ${session.terminationReason ?? "N/A"}`,
		"",
		"Final summary:",
		session.finalSummary ?? "No summary available.",
	].join("\n");
}

/**
 * 執行持久化協作（創建 session 並執行第一回合）
 */
async function executePersistentCollaboration(
	backgroundManager: BackgroundManager,
	config: {
		mode: EnumCollaborateMode;
		shadows: INormalizedCollaborateShadowEntry[];
		prompt: string;
		total_rounds: number;
		max_concurrent: number;
		round_timeout_ms: number;
		description?: string
	},
	context: ToolContext,
): Promise<string>
{
	logArise2WithLevel("debug", () => [
		`[arise-collaborate:persistent]`,
		`Creating persistent session: mode=${config.mode}, agents=${config.shadows.length}`,
	], { force: true });

	const session = collaborationSessionManager.create({
		mode: config.mode,
		shadows: config.shadows,
		prompt: config.prompt,
		description: config.description,
		totalRounds: config.total_rounds,
		maxConcurrent: config.max_concurrent,
		roundTimeoutMs: config.round_timeout_ms,
		parentSessionId: context.sessionID,
		context,
		config: context as unknown as IAriseConfig,
		reuseAgentSession: config.reuse_agent_session,
		blockSubagentTools: config.block_subagent_tools,
	});

	const result = await executeNextRound(session, backgroundManager);
	session.lastActivityAt = Date.now();

	return formatAriseMsgSuccessMultiLine(`Persistent collaboration created: ${session.id}`, buildSessionStatusDetails(session));
}

/**
 * 執行 session 的下一回合
 */
async function executeNextRound(session: ICollaborationSession, backgroundManager: BackgroundManager): Promise<string>
{
	if (session.terminated)
	{
		return formatAriseMsgError(`Session ${session.id} is already terminated: ${session.terminatedBy}`);
	}

	if (session.currentRound >= session.totalRounds)
	{
		session.status = EnumCollaborationSessionStatus.Completed;
		session.terminated = true;
		session.terminatedBy = EnumCollaborateTermination.STOP;
		session.terminatedAt = Date.now();
		session.terminationReason = "Max rounds reached";
		session.finalSummary = buildFinalSummary(session);
		return formatAriseMsgSuccessMultiLine(`Session completed: max rounds reached`, buildSessionEndDetails(session));
	}

	session.currentRound++;
	const round = session.currentRound;
	session.status = EnumCollaborationSessionStatus.Executing;

	logArise2WithLevel("debug", () => [
		`[arise-collaborate:persistent]`,
		`Executing round ${round}/${session.totalRounds} for session ${session.id}`,
	], { force: true });

	const roundResponses: string[] = [];
	const useBatchedExecution = session.maxConcurrent > 1;
	/** 是否重用子代理 session / Whether to reuse sub-agent session */
	const reuseAgentSession = session.reuseAgentSession !== false;

	/** 構建子代理指令 (如果需要阻止使用召喚工具) / Build sub-agent instructions (if blocking summoning tools) */
	function buildAgentInstructions(basePrompt: string): string
	{
		let instructions = basePrompt;

		/**
		 * 如果需要阻止子代理使用召喚工具
		 * If need to block sub-agent from using summoning tools
		 */
		if (session.blockSubagentTools)
		{
			instructions += `\n\nIMPORTANT RESTRICTIONS:
- You MUST NOT use arise_summon, arise_background, or task tools
- Complete all tasks yourself using available tools
- Do not delegate work to other agents`;
		}

		return instructions;
	}

	if (useBatchedExecution)
	{
		for (let i = 0; i < session.shadows.length; i += session.maxConcurrent)
		{
			const batch = session.shadows.slice(i, i + session.maxConcurrent);
			const batchResults = await Promise.all(batch.map(async (entry) =>
			{
				/**
				 * Session 重用邏輯
				 * Session reuse logic
				 *
				 * reuse_agent_session=true (默認): 使用保存的 session
				 * reuse_agent_session=false: 每次創建新的 session
				 */
				let sessionId = reuseAgentSession ? session.agentSessionIds.get(entry.label) : undefined;
				let prompt = buildAgentInstructions(sessionId ? buildNextTurnPrompt(entry.label, round, session) : session.prompt);

				const task = await launchShadowTask(backgroundManager, entry.agent, prompt, session.description ?? `round ${round}`, session.context, entry.model, sessionId);
				if (!sessionId) session.agentSessionIds.set(entry.label, task.sessionId);

				const responseText = await waitForTaskCompletion(backgroundManager, task.id, session.roundTimeoutMs);
				const currentCount = session.perAgentRoundCount.get(entry.label) ?? 0;
				session.perAgentRoundCount.set(entry.label, currentCount + 1);

				return { label: entry.label, response: responseText };
			}));

			for (const result of batchResults)
			{
				roundResponses.push(result.response);
				session.allResponses.push(result.response);
				if (!session.roundResponses.has(round)) session.roundResponses.set(round, new Map());
				session.roundResponses.get(round)!.set(result.label, result.response);
			}
		}
	}
	else
	{
		for (const entry of session.shadows)
		{
			/**
			 * Session 重用邏輯
			 * Session reuse logic
			 *
			 * reuse_agent_session=true (默認): 使用保存的 session
			 * reuse_agent_session=false: 每次創建新的 session
			 */
			let sessionId = reuseAgentSession ? session.agentSessionIds.get(entry.label) : undefined;
			let prompt = buildAgentInstructions(sessionId ? buildNextTurnPrompt(entry.label, round, session) : session.prompt);

			const task = await launchShadowTask(backgroundManager, entry.agent, prompt, session.description ?? `round ${round}`, session.context, entry.model, sessionId);
			if (!sessionId) session.agentSessionIds.set(entry.label, task.sessionId);

			const responseText = await waitForTaskCompletion(backgroundManager, task.id, session.roundTimeoutMs);
			const currentCount = session.perAgentRoundCount.get(entry.label) ?? 0;
			session.perAgentRoundCount.set(entry.label, currentCount + 1);

			roundResponses.push(responseText);
			session.allResponses.push(responseText);
			if (!session.roundResponses.has(round)) session.roundResponses.set(round, new Map());
			session.roundResponses.get(round)!.set(entry.label, responseText);

			const termination = checkTermination(responseText);
			if (termination.shouldStop)
			{
				session.terminated = true;
				session.terminatedBy = termination.terminationType ?? undefined;
				session.terminatedAt = Date.now();
				session.terminationReason = `Auto-detected: ${termination.terminationType}`;
				session.terminationMarkers.push(termination.terminationType!);
				session.finalSummary = buildFinalSummary(session);
				session.status = EnumCollaborationSessionStatus.Completed;
				return formatAriseMsgSuccessMultiLine(`Session terminated: ${termination.terminationType}`, buildSessionEndDetails(session));
			}
		}
	}

	if (roundResponses.every(r => r === roundResponses[0]) && roundResponses.length > 0)
	{
		session.terminated = true;
		session.terminatedBy = EnumCollaborateTermination.STOP;
		session.terminatedAt = Date.now();
		session.terminationReason = "Consensus reached";
		session.finalSummary = buildFinalSummary(session);
		session.status = EnumCollaborationSessionStatus.Completed;
	}

	session.status = session.terminated ? EnumCollaborationSessionStatus.Completed : EnumCollaborationSessionStatus.Idle;
	return formatAriseMsgSuccessMultiLine(`Round ${round} completed`, buildSessionStatusDetails(session));
}

/**
 * 繼續現有 session
 */
async function executeContinueSession(session: ICollaborationSession,
	backgroundManager: BackgroundManager,
	context: ToolContext,
): Promise<string>
{
	if (session.status === EnumCollaborationSessionStatus.Completed)
	{
		return formatAriseMsgError(`Session ${session.id} is already completed. Create a new session to start fresh.`);
	}

	if (session.status === EnumCollaborationSessionStatus.Paused)
	{
		session.status = EnumCollaborationSessionStatus.Idle;
	}

	if (session.terminated)
	{
		return formatAriseMsgSuccessMultiLine(`Session already terminated: ${session.terminatedBy}`, `Reason: ${session.terminationReason ?? "No reason provided"}`);
	}

	session.context = context;
	const result = await executeNextRound(session, backgroundManager);
	session.lastActivityAt = Date.now();
	return result;
}

/**
 * 結束 session
 */
function executeEndSession(sessionId: string): string
{
	const session = collaborationSessionManager.get(sessionId);
	if (!session) return formatAriseMsgError(`Session not found: ${sessionId}`);

	session.status = EnumCollaborationSessionStatus.Completed;
	session.terminated = true;
	session.terminatedBy = EnumCollaborateTermination.STOP;
	session.terminatedAt = Date.now();
	session.terminationReason = "Manually ended by user";
	session.finalSummary = buildFinalSummary(session);

	return formatAriseMsgSuccessMultiLine(`Collaboration session ended: ${session.id}`, buildSessionEndDetails(session));
}

/**
 * 暫停 session
 */
function executePauseSession(sessionId: string): string
{
	const session = collaborationSessionManager.get(sessionId);
	if (!session) return formatAriseMsgError(`Session not found: ${sessionId}`);

	if (session.status === EnumCollaborationSessionStatus.Completed || session.status === EnumCollaborationSessionStatus.Cancelled)
	{
		return formatAriseMsgError(`Cannot pause session in ${session.status} state.`);
	}

	session.status = EnumCollaborationSessionStatus.Paused;
	session.lastActivityAt = Date.now();

	return formatAriseMsgSuccessMultiLine(`Session paused: ${session.id}`, `Round: ${session.currentRound}/${session.totalRounds}\nUse session_id: "${session.id}" to resume.`);
}

/**
 * 列出所有協作 session
 */
function executeListSessions(): string
{
	const sessions = collaborationSessionManager.list();
	const stats = collaborationSessionManager.getStats();

	if (sessions.length === 0)
	{
		return formatAriseMsgSuccessMultiLine("No active collaboration sessions", "Use persistent: true to create one.");
	}

	const sessionList = sessions.map(s =>
	{
		const statusIcon = s.status === EnumCollaborationSessionStatus.Idle ? "⏸" :
			s.status === EnumCollaborationSessionStatus.Executing ? "▶" :
				s.status === EnumCollaborationSessionStatus.Paused ? "⏸" :
					s.status === EnumCollaborationSessionStatus.Completed ? "✅" : "❌";
		return `${statusIcon} ${s.id} | ${s.mode} | Round ${s.currentRound}/${s.totalRounds} | ${s.status} | ${s.shadows.map(e => e.label)
			.join(", ")}`;
	}).join("\n");

	return formatAriseMsgSuccessMultiLine(`Collaboration sessions (total: ${stats.total}, active: ${stats.active}, completed: ${stats.completed})`, sessionList);
}
