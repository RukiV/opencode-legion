import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { type IAriseConfig, getPollInterval, getRetryDelayIncrement, getRetryDelayMax, AUTO_MODEL } from "./config/schema";
import { IAllShadowAgentsName } from "./types/enums";
import { EnumHookName } from "./config/hook-names";
import { loadAriseConfig, deepMerge } from "./config/io";
import { cacheSessionModel, clearSessionModel } from "./config/model-cache";
import { extractTextFromMessageParts, getErrorMessage } from "./utils/message";
import { SHADOW_AGENTS, OPENCODE_OVERRIDES } from "./agents";
import {
  createAriseBannerHook,
  createOutputShaperHook,
  createCompactionPreserverHook,
  createTodoEnforcerHook,
} from "./hooks";
import {
  createCallAriseAgentTool,
  BackgroundManager,
  createBackgroundTaskTool,
  createBackgroundOutputTool,
  createBackgroundStatusTool,
  createBackgroundCancelTool,
} from "./tools";
import { IHooks, IPlugin, IReturnTypeOfPluginToolArise } from './types/opencode';
import { EnumAriseTools } from './tools/tool-names';
import { IAriseTools } from "./types/types";
import { createPluginTools } from './tools/plugin-tools';

/** JSON 物件類型別名 / JSON object type alias */
type JsonObject = Record<string, unknown>;

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
   * 初始化背景任務管理器
   * Initialize background manager
   *
   * 傳遞 getPollInterval, getRetryDelayIncrement, getRetryDelayMax 函式
   * 讓 BackgroundManager 可以根據配置動態取得各代理的設定
   * Pass getter functions so BackgroundManager can dynamically get each agent's settings
   */
  const pollIntervalGetter = (agentName?: IAllShadowAgentsName) => getPollInterval(config, agentName);
  const retryDelayIncrementGetter = (agentName?: IAllShadowAgentsName) => getRetryDelayIncrement(config, agentName);
  const retryDelayMaxGetter = (agentName?: IAllShadowAgentsName) => getRetryDelayMax(config, agentName);
  const backgroundManager = new BackgroundManager(
    ctx,
    pollIntervalGetter,
    retryDelayIncrementGetter,
    retryDelayMaxGetter
  );

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
    tool: createPluginTools(ctx, backgroundManager),

    /**
     * 配置鉤子 - 設定 Agent
     * Config hook - Configure agents
     *
     * 將 Shadow Agents 註冊到 OpenCode
     * Register Shadow Agents to OpenCode
     */
    async config(opencodeConfig) {
      const cfg = opencodeConfig as JsonObject;

      /** 設定 Monarch 為預設代理 / Set Monarch as default agent */
      cfg.default_agent = "monarch";

      /** 初始化 agent 設定 / Initialize agent config */
      cfg.agent = (cfg.agent as JsonObject) ?? {};
      const agents = cfg.agent as JsonObject;

      /**
       * 添加 Shadow Subagents
       * Add Shadow subagents
       *
       * 遍歷所有 Shadow 代理，根據配置決定是否註冊
       * Iterate through all Shadow agents, decide whether to register based on config
       */
      const disabledShadows = new Set(config.disabled_shadows ?? []);
      for (const [name, shadow] of Object.entries(SHADOW_AGENTS)) {
        const shadowName = name as IAllShadowAgentsName;
        /** 跳過已停用的 Shadow / Skip disabled shadows */
        if (disabledShadows.has(shadowName)) continue;

        const userOverride = config.agents?.[shadowName];
        /** 跳過使用者已停用的 Shadow / Skip shadows disabled by user */
        if (userOverride?.disabled) continue;

        /**
         * 解析模型
         * Resolve model
         *
         * 如果 Shadow 設定為 <auto>，則使用主任務的模型
         * 否則使用使用者覆寫或 Shadow 預設模型
         * If Shadow is set to <auto>, use parent task's model
         * Otherwise use user override or Shadow's default model
         */
        const resolvedModel = shadow.model === AUTO_MODEL ? opencodeConfig.model : (userOverride?.model ?? shadow.model);

        /** 註冊 Shadow 代理 / Register Shadow agent */
        agents[name] = {
          description: shadow.description,
          mode: shadow.mode,
          model: resolvedModel,
          steps: shadow.steps,
          ...(shadow.prompt && { prompt: shadow.prompt }),
          ...(shadow.permission && { permission: shadow.permission }),
          ...(shadow.options && { options: shadow.options }),
        };
      }

      /**
       * 套用 OpenCode 代理覆寫
       * Apply OpenCode agent overrides
       *
       * - 讓 build/plan 可被呼叫
       * - 隱藏 explore/general
       * - Make build/plan invokable
       * - Hide explore/general
       */
      for (const [name, override] of Object.entries(OPENCODE_OVERRIDES)) {
        agents[name] = deepMerge((agents[name] as JsonObject) ?? {}, override as JsonObject);
      }
    },

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
     * 記錄目前會話使用的模型，供 <auto> 模型使用
     * Record the model used by current session for <auto> model
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
     */
    async event(input: { event: Event }) {
      const event = input.event;

      /** 讓背景任務管理器處理事件 / Let background manager handle events */
      backgroundManager.handleEvent(event);

      /** 會話創建時顯示橫幅 / Show banner on session creation */
      if (event.type === "session.created" && bannerHook) {
        await bannerHook.onSessionCreated();
      }

      /** 處理 session.idle 以進行 TODO 強制執行 / Handle session.idle for TODO enforcement */
      if (event.type === "session.idle" && todoEnforcer) {
        const sessionId = (event as { properties?: { sessionID?: string } }).properties?.sessionID;
        if (sessionId) {
          try {
            /** 取得最近訊息以檢查未完成的 TODO / Get recent messages to check for incomplete todos */
            const messages = await ctx.client.session.messages({
              path: { id: sessionId },
            });

            if (messages.data) {
              /**
               * 從訊息 parts 中提取文字內容
               * Extract text content from message parts
               */
              const recentMessages = messages.data.slice(-5).map((m) => {
                const textContent = extractTextFromMessageParts(m.parts);
                return { content: textContent };
              });

              const result = await todoEnforcer.checkCompletion(recentMessages);

              if (result.hasIncompleteTodos && result.reminderMessage) {
                await ctx.client.tui.showToast({
                  body: {
                    title: "Arise - Incomplete Tasks",
                    message: "You have pending TODOs. Complete them before stopping.",
                    variant: "warning",
                    duration: 5000,
                  },
                });
              }
            }
          } catch (error) {
            ctx.client.app.log?.({
              body: {
                service: "arise",
                level: "warn",
                message: `TODO enforcement failed: ${getErrorMessage(error)}`,
              },
            });
          }
        }
      }

      /** 清除會話結束時的模型緩存 / Clear model cache when session ends */
      if (event.type === "session.deleted") {
        const sessionId = (event as { properties?: { sessionID?: string } }).properties?.sessionID;
        if (sessionId) {
          clearSessionModel(sessionId);
        }
      }
    },
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
