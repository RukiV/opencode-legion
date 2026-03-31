import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";
import { type IAriseConfig } from "./config/schema";
import { EnumHookName } from "./types/enums";
import { loadAriseConfig } from "./config/io";
import { cacheSessionModel, clearSessionModel } from "./config/model-cache";
import { _isAutoModel } from "./utils/model-resolver";
import { createConfigHandler } from "./plugin/config-handler";
import { createFullEventHandler, extractSessionId } from "./plugin/event-handler";
import { createAriseBannerHook } from "./hooks/arise-banner";
import { createOutputShaperHook } from "./hooks/output-shaper";
import { createCompactionPreserverHook } from "./hooks/compaction-preserver";
import { createTodoEnforcerHook } from "./hooks/todo-enforcer";
import {
  BackgroundManager,
} from "./tools/lib/background-manager";
import { initDebugControl } from "./utils/debug-control";
import { IHooks, IPlugin } from './types/types-opencode';
import { createPluginTools } from './tools/index';


/**
 * 檢查 Hook 是否啟用
 * Check if hook is enabled
 *
 * @param config - Arise 配置物件
 * @param hookName - Hook 名稱
 * @returns Hook 是否啟用
 */
function isHookEnabled(config: IAriseConfig, hookName: EnumHookName): boolean {
  return !config.disabled_hooks?.includes(hookName);
}

/**
 * OpenCode Arise 插件主體
 * OpenCode Arise plugin main body
 *
 * 這是插件的入口點，負責：
 * 1. 初始化背景任務管理器
 * 2. 初始化各類 Hook
 * 3. 註冊自訂工具
 * 4. 設定 Shadow Agents
 * 5. 處理各種事件
 *
 * This is the plugin entry point, responsible for:
 * 1. Initialize background task manager
 * 2. Initialize various hooks
 * 3. Register custom tools
 * 4. Configure Shadow Agents
 * 5. Handle various events
 */
const OpencodeArise: IPlugin = async (ctx: PluginInput): Promise<IHooks> => {
  /** 載入 Arise 配置 / Load Arise config */
  const config = await loadAriseConfig(ctx);

  /**
   * 初始化除錯控制
   * Initialize debug control
   *
   * 根據配置設定 consoleLogger.enabled 和預設日誌級別
   * Sets consoleLogger.enabled and default log level based on config
   */
  initDebugControl(config);

  /**
   * 初始化背景任務管理器
   * Initialize background manager
   *
   * 傳入 ctx 和 config，BackgroundManager 內部透過公開方法取得各代理的設定
   * Pass ctx and config; BackgroundManager uses public methods to get per-agent settings
   */
  const backgroundManager = new BackgroundManager(ctx, config);

  /**
   * 初始化 Hooks
   * Initialize hooks
   *
   * 根據配置決定是否啟用各類 Hook
   * Decide whether to enable each hook based on configuration
   */
  const bannerHook = isHookEnabled(config, EnumHookName.AriseBanner) && config.show_banner
    ? createAriseBannerHook(ctx)
    : null;

  const outputShaper = isHookEnabled(config, EnumHookName.OutputShaper)
    ? createOutputShaperHook(config)
    : null;

  const compactionPreserver = isHookEnabled(config, EnumHookName.CompactionPreserver)
    ? createCompactionPreserverHook()
    : null;

  const todoEnforcer = isHookEnabled(config, EnumHookName.TodoEnforcer)
    ? createTodoEnforcerHook(ctx)
    : null;

  return {
    /**
     * 註冊自訂工具
     * Register custom tools
     *
     * 提供 Shadow 召喚和背景任務管理工具
     * Provides Shadow summoning and background task management tools
     */
    tool: createPluginTools(ctx, backgroundManager, config),

    /**
     * 配置鉤子 - 設定 Agent
     * Config hook - Configure agents
     *
     * 將 Shadow Agents 註冊到 OpenCode
     * Register Shadow Agents to OpenCode
     *
     * 使用 config-handler 模組處理純邏輯
     * Uses config-handler module for pure logic
     */
    config: createConfigHandler(config),

    /**
     * 工具執行後鉤子 - 格式化輸出
     * Tool execute after hook - Format output
     *
     * 對工具輸出進行截斷或保留處理
     * Truncate or preserve tool output
     */
    async "tool.execute.after"(input, output) {
      if (outputShaper) {
        output.output = await outputShaper.shapeOutput(
          input.tool,
          output.output,
          output.metadata as Record<string, unknown>
        );
      }
    },

    /**
     * 聊天參數鉤子 - 快取模型
     * Chat params hook - Cache model
     *
      * 記錄目前會話使用的模型，供 AUTO 模型使用
      * Record the model used by current session for AUTO model
     */
    async "chat.params"(input) {
      if (input.model) {
        cacheSessionModel(input.sessionID, input.model.providerID, input.model.id);
      }
    },

    /**
     * 對話壓縮鉤子 - 保留上下文
     * Session compacting hook - Preserve context
     *
     * 在對話被壓縮時添加保留規則提示
     * Add preservation rule hints when conversation is compacted
     */
    async "experimental.session.compacting"(_input, output) {
      if (compactionPreserver) {
        output.context.push(compactionPreserver.getPreservationContext());
      }
    },

    /**
     * 事件處理
     * Event handling
     *
     * 處理各類 OpenCode 事件
     * Handle various OpenCode events
     *
     * 使用 event-handler 模組處理邏輯
     * Uses event-handler module for logic
     */
    event: createFullEventHandler({
      ctx,
      bannerHook,
      outputShaper,
      compactionPreserver,
      todoEnforcer,
      backgroundManager,
    }),
  };
};

export default OpencodeArise;

/**
 * 重要說明：不要從 index.ts 導出非類型值！
 * IMPORTANT: Do NOT export non-type values from main index.ts!
 *
 * OpenCode 會將所有導出視為插件實例並嘗試調用它們
 * OpenCode treats ALL exports as plugin instances and tries to call them
 *
 * 如需導入 SHADOW_AGENTS，請使用 "opencode-arise/agents" 子路徑
 * Use "opencode-arise/agents" subpath if you need to import SHADOW_AGENTS
 */
export type { IAriseConfig } from "./config/schema";
export type { IShadowAgent } from "./agents/shadows";
