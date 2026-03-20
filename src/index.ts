import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { type IAriseConfig, type HookName, type ShadowName, getPollInterval, getRetryDelayIncrement, getRetryDelayMax, AUTO_MODEL } from "./config/schema";
import { loadAriseConfig, deepMerge } from "./config/io";
import { cacheSessionModel, clearSessionModel } from "./config/model-cache";
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
import { EnumAriseTools, IAriseTools } from './tools/tool-names';
import { createPluginTools } from './tools/plugin-tools';

type JsonObject = Record<string, unknown>;

function isHookEnabled(config: IAriseConfig, hookName: HookName): boolean {
  return !(config.disabled_hooks ?? []).includes(hookName);
}

const OpencodeArise: IPlugin = async (ctx: PluginInput): Promise<IHooks> => {
  const config = await loadAriseConfig(ctx);

  // Initialize background manager
  // 傳遞 getPollInterval, getRetryDelayIncrement, getRetryDelayMax 函式
  const pollIntervalGetter = (agentName?: ShadowName) => getPollInterval(config, agentName);
  const retryDelayIncrementGetter = (agentName?: ShadowName) => getRetryDelayIncrement(config, agentName);
  const retryDelayMaxGetter = (agentName?: ShadowName) => getRetryDelayMax(config, agentName);
  const backgroundManager = new BackgroundManager(
    ctx,
    pollIntervalGetter,
    retryDelayIncrementGetter,
    retryDelayMaxGetter
  );

  // Initialize hooks
  const bannerHook = isHookEnabled(config, "arise-banner") && config.show_banner
    ? createAriseBannerHook(ctx)
    : null;

  const outputShaper = isHookEnabled(config, "output-shaper")
    ? createOutputShaperHook(config)
    : null;

  const compactionPreserver = isHookEnabled(config, "compaction-preserver")
    ? createCompactionPreserverHook()
    : null;

  const todoEnforcer = isHookEnabled(config, "todo-enforcer")
    ? createTodoEnforcerHook(ctx)
    : null;

  return {
    // Register custom tools
    tool: createPluginTools(ctx, backgroundManager),

    async config(opencodeConfig) {
      const cfg = opencodeConfig as JsonObject;

      // Set monarch as default agent
      cfg.default_agent = "monarch";

      // Initialize agent config if needed
      cfg.agent = (cfg.agent as JsonObject) ?? {};
      const agents = cfg.agent as JsonObject;

      // Add shadow soldiers
      const disabledShadows = new Set(config.disabled_shadows ?? []);
      for (const [name, shadow] of Object.entries(SHADOW_AGENTS)) {
        const shadowName = name as ShadowName;
        if (disabledShadows.has(shadowName)) continue;

        const userOverride = config.agents?.[shadowName];
        if (userOverride?.disabled) continue;

        const resolvedModel = shadow.model === AUTO_MODEL ? opencodeConfig.model : (userOverride?.model ?? shadow.model);

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

      // Apply OpenCode agent overrides (make build/plan invokable, hide explore/general)
      for (const [name, override] of Object.entries(OPENCODE_OVERRIDES)) {
        agents[name] = deepMerge((agents[name] as JsonObject) ?? {}, override as JsonObject);
      }
    },

    async "tool.execute.after"(input, output) {
      if (outputShaper) {
        output.output = await outputShaper.shapeOutput(
          input.tool,
          output.output,
          output.metadata as Record<string, unknown>
        );
      }
    },

    async "chat.params"(input) {
      // 緩存當前會話使用的模型
      if (input.model) {
        cacheSessionModel(input.sessionID, input.model.providerID, input.model.id);
      }
    },

    async "experimental.session.compacting"(_input, output) {
      if (compactionPreserver) {
        output.context.push(compactionPreserver.getPreservationContext());
      }
    },

    async event(input: { event: Event }) {
      const event = input.event;

      // Let background manager handle events
      backgroundManager.handleEvent(event);

      // Show banner toast on session creation
      if (event.type === "session.created" && bannerHook) {
        await bannerHook.onSessionCreated();
      }

      // Handle session.idle for todo enforcement
      if (event.type === "session.idle" && todoEnforcer) {
        const sessionId = (event as { properties?: { sessionID?: string } }).properties?.sessionID;
        if (sessionId) {
          try {
            // Get recent messages to check for incomplete todos
            const messages = await ctx.client.session.messages({
              path: { id: sessionId },
            });

            if (messages.data) {
              // Extract text content from message parts
              const recentMessages = messages.data.slice(-5).map((m) => {
                const textContent = m.parts
                  ?.filter((p) => p.type === "text")
                  .map((p) => (p as { type: "text"; text: string }).text ?? "")
                  .join("\n") ?? "";
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
          } catch {
            // Ignore errors in todo enforcement
          }
        }
      }

      // 清除會話結束時的模型緩存
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

// NOTE: Do NOT export non-type values from main index.ts!
// OpenCode treats ALL exports as plugin instances and tries to call them.
// Use "opencode-arise/agents" subpath if you need to import SHADOW_AGENTS.
export type { IAriseConfig } from "./config/schema";
export type { IShadowAgent } from "./agents/shadows";
