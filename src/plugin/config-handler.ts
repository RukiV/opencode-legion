/**
 * 配置處理器
 * Config handler
 *
 * 處理 OpenCode config 鉤子的純邏輯部分
 * Handles pure logic parts of OpenCode config hook
 */

import type { IAriseConfig } from "../config/schema";
import { EnumAriseTools, EnumShadowAgentsName, type IAllShadowAgentsName } from "../types/enums";
import type { IShadowAgent } from "../agents/shadows";
import { SHADOW_AGENTS, OPENCODE_OVERRIDES } from "../agents/shadows";
import { _isAutoModel, DEFAULT_MODEL, getEffectiveModelWithFallback, parseModelString } from "../utils/model-resolver";
import { deepMerge } from "../utils/config/config-merge";
import { type Config } from "@opencode-ai/sdk";
import { _handlePermission } from "../config/schema/utils";
import { logArise2WithLevel, logArise2WithLevelMulti } from "../utils/debug-control";
import { runtimeCache } from "../utils/session/session-cache";
import { tsObjectEntries } from "ts-type-object-entries";
import { AUTO_MODEL } from "../types/const-default";
import { EnumOpencodeAgentPermission } from "../types/enum-opencode";
import { IShadowAgentPermission } from "../types/types-opencode";

/**
 * OpenCode 配置介面
 * OpenCode config interface
 *
 * 代表 OpenCode 的配置物件結構
 * Represents the OpenCode configuration object structure
 *
 * 使用 index signature 允許動態屬性
 * Uses index signature to allow dynamic properties
 */
export interface IOpencodeConfig extends Config
{
	/** 預設代理 / Default agent */
	default_agent?: string;
}

/**
 * 設定 Shadow Agent 配置參數
 * Set Shadow agent config parameters
 *
 * @param params - 參數物件 / Parameters object
 * @param params.config - Arise 配置 / Arise config
 * @param params.opencodeConfig - OpenCode 配置 / OpenCode config
 * @param params.parentModel - 父任務模型 / Parent task model
 */
export function setShadowAgentsConfig(params: {
	ariseConfig: IAriseConfig;
	opencodeConfig: IOpencodeConfig;
}): void
{
	const { ariseConfig, opencodeConfig } = params;

	logArise2WithLevel('debug', () => [
		'[config-handler] setShadowAgentsConfig called',
		`  disabled_shadows: ${JSON.stringify(ariseConfig.disabled_shadows ?? [])}`,
		`  opencodeConfig.model: ${JSON.stringify(opencodeConfig.model)}`,
		`  agents count before: ${Object.keys(opencodeConfig.agent ?? {}).length}`,
	]);

	/** 初始化 agent 設定 / Initialize agent config */
	opencodeConfig.agent = opencodeConfig.agent ?? {};
	const agents = opencodeConfig.agent!;

	/**
	 * 添加 Shadow Subagents
	 * Add Shadow subagents
	 *
	 * 遍歷所有 Shadow Agent，根據配置決定是否註冊
	 * Iterate through all Shadow agents, decide whether to register based on config
	 */
	const disabledShadows = new Set(ariseConfig.disabled_shadows ?? []);
	const registeredAgents: string[] = [];
	const skippedAgents: string[] = [];

	const opencodeModel = parseModelString(opencodeConfig.model).detectAutoModelBody ? DEFAULT_MODEL : opencodeConfig.model!;

	opencodeConfig.experimental ??= {};
	opencodeConfig.experimental.primary_tools ??= [];

	/**
	 * 防止子代理無限呼叫子代理
	 */
	opencodeConfig.experimental.primary_tools = [...new Set([
		...opencodeConfig.experimental.primary_tools,
		EnumAriseTools.ARISE_SYNC_SUMMON,
		EnumAriseTools.ARISE_ASYNC_BACKGROUND,
		EnumAriseTools.ARISE_ASYNC_BACKGROUND_CANCEL,
		EnumAriseTools.ARISE_CONTINUE,
		EnumAriseTools.ARISE_COLLABORATE,
		'task',
	])];

	for (const [name, shadow] of tsObjectEntries(SHADOW_AGENTS))
	{
		const shadowName = name;
		/** 跳過已停用的 Shadow / Skip disabled shadows */
		if (disabledShadows.has(shadowName))
		{
			skippedAgents.push(`${name} (disabled_shadows)`);
			continue;
		}

		const userOverride = ariseConfig.agents?.[shadowName];
		/** 跳過使用者已停用的 Shadow / Skip shadows disabled by user */
		if (userOverride?.disabled)
		{
			skippedAgents.push(`${name} (user disabled)`);
			continue;
		}

		let resolvedModel = getEffectiveModelWithFallback(
			AUTO_MODEL,
			opencodeModel,
			shadow.model,
			userOverride?.model,
		);

		const parsed = parseModelString(resolvedModel);

		/** 記錄 agent 的 user config 模型為 AUTO / Record agent's user config model is AUTO */
		if (parsed.detectAutoModelBody)
		{
			runtimeCache.addUserConfigModelIsAuto(name);
			resolvedModel = opencodeModel;
		}

		logArise2WithLevel('debug', () => [
			`  [register] ${name}`,
			`    default model: ${shadow.model}`,
			`    user override model: ${userOverride?.model ?? '(none)'}`,
			`    resolved model: ${JSON.stringify(resolvedModel)}`,
			`    is auto: ${parsed.detectAutoModelBody}`,
		]);

		/** 註冊 Shadow Agent / Register Shadow agent */
		agents[name] = {
			description: shadow.description,
			mode: shadow.mode,
			model: resolvedModel,
			steps: shadow.steps,
			...(shadow.prompt && { prompt: shadow.prompt }),
			...(shadow.permission && { permission: _handlePermission(shadow.permission, { agentsName: name }) } as any),
			...(shadow.options && { options: shadow.options }),
		};

		registeredAgents.push(name);
	}

	logArise2WithLevelMulti('debug', () => [
		`[config-handler] Shadow agents summary:`,
		`  registered (${registeredAgents.length}): ${registeredAgents.join(', ')}`,
		`  skipped (${skippedAgents.length}): ${skippedAgents.join(', ')}`,
		`  agents count after: ${Object.keys(agents).length}`,
	]);
}

/**
 * 套用 OpenCode 代理覆寫
 * Apply OpenCode agent overrides
 *
 * @param agents - 代理配置物件 / Agent configuration object
 */
export function applyOpencodeAgentOverrides(agents: Record<string, unknown>): void
{
	logArise2WithLevel('debug', () => [
		'[config-handler] applyOpencodeAgentOverrides called',
		`  existing agent keys: ${Object.keys(agents).join(', ')}`,
		`  override keys: ${Object.keys(OPENCODE_OVERRIDES).join(', ')}`,
	]);

	/**
	 * 套用 OpenCode 代理覆寫
	 * Apply OpenCode agent overrides
	 *
	 * - 讓 build/plan 可被呼叫
	 * - 隱藏 explore/general
	 * - Make build/plan invokable
	 * - Hide explore/general
	 */
	for (const [name, override] of Object.entries(OPENCODE_OVERRIDES))
	{
		agents[name] = deepMerge((agents[name] as Record<string, unknown>) ?? {}, override as Record<string, unknown>);
	}

	logArise2WithLevel('debug', () => [
		'[config-handler] applyOpencodeAgentOverrides done',
		`  final agent keys: ${Object.keys(agents).join(', ')}`,
	]);
}

/**
 * 創建 config 鉤子處理函式
 * Create config hook handler function
 *
 * @param ariseConfig - Arise 配置 / Arise config
 * @returns config 鉤子函式 / Config hook function
 */
export function createConfigHandler(ariseConfig: IAriseConfig)
{
	return async function configHook(opencodeConfig: IOpencodeConfig): Promise<void>
	{
		logArise2WithLevel('debug', () => [
			'[config-handler] configHook called',
			`  opencodeConfig.model: ${JSON.stringify(opencodeConfig.model)}`,
			`  opencodeConfig.default_agent (before): ${JSON.stringify(opencodeConfig.default_agent)}`,
			`  opencodeConfig.agent keys (before): ${Object.keys(opencodeConfig.agent ?? {}).join(', ') || '(empty)'}`,
		]);

		try
		{
			/** 設定 Monarch 為預設代理 / Set Monarch as default agent */
			opencodeConfig.default_agent ??= EnumShadowAgentsName.ShadowMonarch;

			/** 設定 Shadow Agent 配置 / Set Shadow agents config */
			setShadowAgentsConfig({
				ariseConfig,
				opencodeConfig
			});

			/** 套用 OpenCode 代理覆寫 / Apply OpenCode agent overrides */
			if (opencodeConfig.agent)
			{
				applyOpencodeAgentOverrides(opencodeConfig.agent as Record<string, unknown>);
			}

			logArise2WithLevel('debug', () => [
				'[config-handler] configHook completed successfully',
				`  default_agent (after): ${JSON.stringify(opencodeConfig.default_agent)}`,
				`  agent keys (after): ${Object.keys(opencodeConfig.agent ?? {}).join(', ') || '(empty)'}`,
				`  total agents: ${Object.keys(opencodeConfig.agent ?? {}).length}`,
			]);
		}
		catch (error)
		{
			logArise2WithLevel('error', () => [
				'[config-handler] configHook FAILED',
				`  error: ${error instanceof Error ? error.message : String(error)}`,
				`  stack: ${error instanceof Error ? error.stack : '(no stack)'}`,
			]);
			throw error;
		}
	};
}
