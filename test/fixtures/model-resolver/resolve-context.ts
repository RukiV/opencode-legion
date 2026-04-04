/**
 * resolveModelContext 測試資料
 * resolveModelContext test data
 *
 * 用於測試 resolveModelContext 函數的各種輸入組合
 * Used to test various input combinations of resolveModelContext function
 */

import type { IAriseConfig } from "../../../src/config/schema";
import { AUTO_MODEL } from "../../../src/types/const-default";
import { EnumShadowSubAgentsName } from "../../../src/types/enums";
import type { IAllShadowAgentsName } from "../../../src/types/enums";
import type { IModelBody } from "../../../src/types/types-opencode";

/**
 * resolveModelContext 測試案例
 * resolveModelContext test case
 */
export interface IResolveContextCase
{
	/** 測試名稱 / Test name */
	name: string;
	/** 父會話模型 / Parent session model */
	parentModel: string | undefined;
	/** Shadow Agent 名稱 / Shadow Agent name */
	shadow: IAllShadowAgentsName;
	/** Config 物件（可選）/ Config object (optional) */
	config?: IAriseConfig;
	/** 用戶指定模型（可選）/ User-specified model (optional) */
	userModel?: string;
	/** 預期 modelBody / Expected modelBody */
	expectedModelBody: IModelBody;
}

/** resolveModelContext 測試案例列表 / resolveModelContext test cases list */
export const resolveContextCases: IResolveContextCase[] =
[
	{ name: "使用 Shadow 預設模型", parentModel: "anthropic/claude-3", shadow: EnumShadowSubAgentsName.Beru, expectedModelBody: { providerID: "anthropic", modelID: "claude-haiku-4-5" } },
	{ name: "config 模型優先", parentModel: "anthropic/claude-3", shadow: EnumShadowSubAgentsName.Beru, config: { agents: { beru: { model: "config/model" } } } as IAriseConfig, expectedModelBody: { providerID: "config", modelID: "model" } },
	{ name: "config AUTO → parentModel", parentModel: "anthropic/claude-3", shadow: EnumShadowSubAgentsName.Beru, config: { agents: { beru: { model: AUTO_MODEL } } } as IAriseConfig, expectedModelBody: { providerID: "anthropic", modelID: "claude-3" } },
	{ name: "userModel 優先", parentModel: "anthropic/claude-3", shadow: EnumShadowSubAgentsName.Beru, config: { agents: { beru: { model: "config/model" } } } as IAriseConfig, userModel: "user/model", expectedModelBody: { providerID: "user", modelID: "model" } },
	{ name: "userModel AUTO → parentModel", parentModel: "anthropic/claude-3", shadow: EnumShadowSubAgentsName.Beru, config: { agents: { beru: { model: "config/model" } } } as IAriseConfig, userModel: AUTO_MODEL, expectedModelBody: { providerID: "anthropic", modelID: "claude-3" } },
	{ name: "無 config 無 userModel", parentModel: "anthropic/claude-3", shadow: EnumShadowSubAgentsName.Beru, expectedModelBody: { providerID: "anthropic", modelID: "claude-haiku-4-5" } },
	{ name: "全部 undefined → DEFAULT_MODEL", parentModel: undefined, shadow: 'Fake-Shadow' as IAllShadowAgentsName, expectedModelBody: { providerID: "opencode", modelID: "big-pickle" } },
	{ name: "多段 modelID", parentModel: undefined, shadow: EnumShadowSubAgentsName.Beru, config: { agents: { beru: { model: "azure/openai/gpt-4" } } } as IAriseConfig, expectedModelBody: { providerID: "azure", modelID: "openai/gpt-4" } },
];
