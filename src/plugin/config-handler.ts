/**
 * 配置處理器
 * Config handler
 *
 * 處理 OpenCode config 鉤子的純邏輯部分
 * Handles pure logic parts of OpenCode config hook
 */

import type { IAriseConfig } from "../config/schema";
import { EnumShadowAgentsName, type IAllShadowAgentsName } from "../types/enums";
import type { IShadowAgent } from "../agents/shadows";
import { SHADOW_AGENTS, OPENCODE_OVERRIDES } from "../agents/shadows";
import { _isAutoModel } from "../utils/model-resolver";
import { deepMerge } from "../utils/config/config-merge";
import { type Config } from "@opencode-ai/sdk";
import { _handlePermission } from "../config/schema/utils";

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
	for (const [name, shadow] of Object.entries(SHADOW_AGENTS))
	{
		const shadowName = name as IAllShadowAgentsName;
		/** 跳過已停用的 Shadow / Skip disabled shadows */
		if (disabledShadows.has(shadowName)) continue;

		const userOverride = ariseConfig.agents?.[shadowName];
		/** 跳過使用者已停用的 Shadow / Skip shadows disabled by user */
		if (userOverride?.disabled) continue;

		/**
		 * 解析模型
		 * Resolve model
		 *
		 * 如果 Shadow 設定為 AUTO，則使用主任務的模型
		 * 否則使用使用者覆寫或 Shadow 預設模型
		 * If Shadow is set to AUTO, use parent task's model
		 * Otherwise use user override or Shadow's default model
		 */
		const resolvedModel = _isAutoModel(shadow.model) ? opencodeConfig.model : (userOverride?.model ?? shadow.model);

		/** 註冊 Shadow Agent / Register Shadow agent */
		agents[name] = {
			description: shadow.description,
			mode: shadow.mode,
			model: resolvedModel,
			steps: shadow.steps,
			...(shadow.prompt && { prompt: shadow.prompt }),
			...(shadow.permission && { permission: _handlePermission(shadow.permission) } as any),
			...(shadow.options && { options: shadow.options }),
		};
	}
}

/**
 * 套用 OpenCode 代理覆寫
 * Apply OpenCode agent overrides
 *
 * @param agents - 代理配置物件 / Agent configuration object
 */
export function applyOpencodeAgentOverrides(agents: Record<string, unknown>): void
{
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
		/** 設定 Monarch 為預設代理 / Set Monarch as default agent */
		opencodeConfig.default_agent = EnumShadowAgentsName.ShadowMonarch;

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
	};
}
