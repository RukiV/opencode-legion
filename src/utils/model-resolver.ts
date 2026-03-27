/**
 * Model resolver utilities
 * 模型解析工具函數
 */

import { AUTO_MODEL, DEFAULT_MODEL } from "../types/const-default";
import type { IAriseConfig } from "../config/schema";
import { SHADOW_AGENTS, type IShadowAgents } from "../agents/shadows";
import type { IAllShadowAgentsName } from "../types/enums";

/**
 * 預設模型
 * Default model fallback
 *
 * 當沒有指定任何模型時使用的 fallback
 * Used when no model is specified at all
 */
export { DEFAULT_MODEL } from "../types/const-default";

/**
 * Determines the effective model based on parent model and default model.
 * 根據父模型和預設模型決定有效模型
 *
 * @param parentModel - The parent session's model / 父會話模型
 * @param defaultModel - The shadow's default model / Shadow 預設模型
 * @param userModel - User-specified model override (takes highest priority) / 用戶指定的模型覆寫（最高優先級）
 * @returns The effective model to use / 要使用的有效模型
 */
export function getEffectiveModel(
  parentModel: string | undefined,
  defaultModel: string | undefined,
  userModel?: string,
): string | undefined {
  // 用戶指定的模型擁有最高優先級
  if (userModel && userModel !== AUTO_MODEL) {
    return userModel;
  }

  if (defaultModel === AUTO_MODEL) {
    // 若為 <auto> 且有父模型則使用，否則 fallback
    return parentModel ?? defaultModel;
  }
  return defaultModel;
}

/**
 * 從配置中取得代理模型
 * Get agent model from config
 *
 * @param config - Arise 配置物件
 * @param shadowName - Shadow 代理名稱
 * @returns 配置中指定的模型，若無則回傳 undefined
 */
export function getModelFromConfig(
  config: IAriseConfig | undefined,
  shadowName: IAllShadowAgentsName,
): string | undefined {
  if (!config?.agents) {
    return undefined;
  }
  return config.agents[shadowName]?.model;
}

/**
 * Parses a model string into providerID and modelID.
 * 解析模型字串為 providerID 和 modelID
 *
 * @param model - Model string in format "provider/model" / 格式為 "provider/model" 的模型字串
 * @returns Parsed result or undefined if invalid / 解析結果，無效則回傳 undefined
 */
export function parseModelString(
  model: string | undefined,
): { providerID: string; modelID: string } | undefined {
  if (!model || model === AUTO_MODEL) {
    return undefined;
  }

  let [providerID, modelID, ...rest] = model.split("/");
  if (!providerID || !modelID) {
    return undefined;
  }

  if (rest.length)
  {
    for (let n of rest)
    {
      if (n?.length)
      {
        modelID += '/' + n;
      }
      else
      {
        // Double slash (//) or trailing slash (/xxx/) produces empty string in split
        throw new RangeError(`Invalid model string "${model}": empty segment detected (consecutive slashes or leading/trailing slash)`);
      }
    }
  }

  return { providerID, modelID };
}

/**
 * Resolves model context for a shadow agent.
 * 解析 Shadow Agent 的模型上下文
 *
 * This is the main utility function that orchestrates the model resolution process:
 * 1. Gets the shadow's default model from SHADOW_AGENTS
 * 2. Gets config model from opencode-arise.json
 * 3. Determines the effective model (userModel > configModel > defaultModel > parentModel > DEFAULT_MODEL)
 * 4. Parses the model string into providerID and modelID
 *
 * 這是主要工具函數，協調模型解析流程：
 * 1. 從 SHADOW_AGENTS 取得 Shadow 的預設模型
 * 2. 從 config 取得配置中指定的模型
 * 3. 決定有效模型（用戶指定 > 配置模型 > 預設模型 > 父模型 > DEFAULT_MODEL）
 * 4. 解析模型字串為 providerID 和 modelID
 *
 * 優先順序 / Priority:
 * 1. 用戶指定 (userModel) - 呼叫工具時傳入
 * 2. Config 模型 (configModel) - opencode-arise.json 中 agents.<agent>.model
 * 3. Shadow 預設模型 (defaultModel) - shadows.ts 中的設定
 * 4. <auto> - 使用父模型，若無則檢查 defaultModel，最後才是 DEFAULT_MODEL
 * 5. 父模型 (parentModel) - 主任務的模型
 * 6. DEFAULT_MODEL - 最終 fallback
 *
 * @param parentModel - The parent session's model / 父會話模型
 * @param shadow - The shadow agent name (enum value type) / Shadow Agent 名稱（枚舉值類型）
 * @param config - Arise config object (optional) / Arise 配置物件（可選）
 * @param userModel - User-specified model override (highest priority) / 用戶指定的模型覆寫（最高優先級）
 * @returns Parsed model body / 解析後的模型主體
 */
export function resolveModelContext(
  parentModel: string | undefined,
  shadow: IAllShadowAgentsName,
  config?: IAriseConfig,
  userModel?: string,
): { providerID: string; modelID: string } {
  // 1. 從 config 取得模型設定
  const configModel = getModelFromConfig(config, shadow);

  // 2. 從 SHADOW_AGENTS 取得預設模型
  const defaultModel = SHADOW_AGENTS[shadow]?.model ?? void 0;

  // 3. 決定有效模型
  const effectiveModel = getEffectiveModelWithFallback(
    parentModel,
    defaultModel,
    configModel,
    userModel,
  );

  // 4. 解析模型字串為 providerID 和 modelID
  const parsed = parseModelString(effectiveModel);

  // 5. 若解析失敗，使用 DEFAULT_MODEL
  if (!parsed) {
    return parseModelString(DEFAULT_MODEL)!;
  }

  return parsed;
}

/**
 * 取得有效模型並包含 fallback 邏輯
 * Get effective model with fallback logic
 *
 * 優先順序：
 * 1. 用戶指定 (userModel)
 * 2. Config 模型 (configModel) - 若為 <auto> 則使用父模型
 * 3. Shadow 預設模型 (defaultModel) - 若為 <auto> 則使用父模型
 * 4. 父模型 (parentModel)
 * 5. DEFAULT_MODEL - 最終 fallback
 *
 * @param parentModel - 父會話模型
 * @param defaultModel - Shadow 預設模型
 * @param configModel - Config 中的模型
 * @param userModel - 用戶指定的模型
 * @returns 有效模型字串
 */
export function getEffectiveModelWithFallback(
  parentModel: string | undefined,
  defaultModel: string | undefined,
  configModel: string | undefined,
  userModel?: string,
): string {
  // 1. 用戶指定的模型擁有最高優先級
  if (userModel && userModel !== AUTO_MODEL) {
    return userModel;
  }

  // 2. Config 中的模型次之
  if (configModel) {
    if (configModel === AUTO_MODEL) {
      // <auto> 使用父模型，若無則檢查 defaultModel，最後才是 DEFAULT_MODEL
      return parentModel ?? defaultModel ?? DEFAULT_MODEL;
    }
    return configModel;
  }

  // 3. Shadow 預設模型
  if (defaultModel === AUTO_MODEL) {
    // <auto> 使用父模型，若無則檢查 defaultModel，最後才是 DEFAULT_MODEL
    return parentModel ?? defaultModel ?? DEFAULT_MODEL;
  }
  if (defaultModel) {
    return defaultModel;
  }

  // 4. 父模型（檢查 parentModel 在 DEFAULT_MODEL 之前）
  if (parentModel) {
    return parentModel;
  }

  // 5. 最終 fallback
  return DEFAULT_MODEL;
}
