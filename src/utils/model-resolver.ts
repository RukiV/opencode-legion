/**
 * Model resolver utilities
 * 模型解析工具函數
 */

import { AUTO_MODEL } from "../config/schema";
import { SHADOW_AGENTS, type IShadowAgents } from "../agents/shadows";
import type { IAllShadowAgentsName } from "../agents/shadow-names";

/**
 * Determines the effective model based on parent model and default model.
 * 根據父模型和預設模型決定有效模型
 *
 * @param parentModel - The parent session's model / 父會話模型
 * @param defaultModel - The shadow's default model / Shadow 預設模型
 * @returns The effective model to use / 要使用的有效模型
 */
export function getEffectiveModel(
  parentModel: string | undefined,
  defaultModel: string | undefined,
): string | undefined {
  if (defaultModel === AUTO_MODEL) {
    // 若為 <auto> 且有父模型則使用，否則 fallback
    return parentModel ?? defaultModel;
  }
  return defaultModel;
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

  const [providerID, modelID] = model.split("/");
  if (!providerID || !modelID) {
    return undefined;
  }

  return { providerID, modelID };
}

/**
 * Resolves model context for a shadow agent.
 * 解析 Shadow Agent 的模型上下文
 *
 * This is the main utility function that orchestrates the model resolution process:
 * 1. Gets the shadow's default model from SHADOW_AGENTS
 * 2. Determines the effective model (handles <auto> logic)
 * 3. Parses the model string into providerID and modelID
 *
 * 這是主要工具函數，協調模型解析流程：
 * 1. 從 SHADOW_AGENTS 取得 Shadow 的預設模型
 * 2. 決定有效模型（處理 <auto> 邏輯）
 * 3. 解析模型字串為 providerID 和 modelID
 *
 * @param parentModel - The parent session's model / 父會話模型
 * @param shadow - The shadow agent name (enum value type) / Shadow Agent 名稱（枚舉值類型）
 * @param shadowAgents - Shadow agents registry / Shadow Agents 註冊表（可傳入自訂）
 * @returns Parsed model body or undefined / 解析後的模型主體，失敗則回傳 undefined
 */
export function resolveModelContext(
  parentModel: string | undefined,
  shadow: IAllShadowAgentsName,
  shadowAgents: IShadowAgents = SHADOW_AGENTS,
): { providerID: string; modelID: string } | undefined {
  const defaultModel = shadowAgents[shadow]?.model ?? void 0;

  // 決定最終使用的模型
  const effectiveModel = getEffectiveModel(parentModel, defaultModel);

  // 解析模型字串為 providerID 和 modelID
  return parseModelString(effectiveModel);
}
