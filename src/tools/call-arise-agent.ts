import { tool } from "@opencode-ai/plugin";
import type { PluginInput } from "@opencode-ai/plugin";
import { getSessionModel } from "../config/model-cache";
import { AUTO_MODEL } from "../config/schema";
import { SHADOW_AGENTS } from "../agents";
import { ARISE_TOOLS, EnumAriseTools } from './tool-names';
import { ALLOWED_SHADOWS, EnumShadowSubAgentsName } from '../agents/shadow-names';
import { ITSToStringLiteral } from 'ts-type';
import { z } from 'zod';
import { tool2 } from '../types/opencode';

export function createCallAriseAgentTool(ctx: PluginInput) {
  return tool2({
    description: ARISE_TOOLS[EnumAriseTools.ARISE_SUMMON].description,

    args: ARISE_TOOLS[EnumAriseTools.ARISE_SUMMON].args,

    async execute(args, context) {
      const { shadow, prompt, run_in_background, description } = args;
      const taskDesc = description ?? `${shadow} task`;

      try {
        // Create session
        const session = await ctx.client.session.create({
          body: { title: `[arise] ${taskDesc}` },
        });

        const sessionId = session.data?.id;
        if (!sessionId) {
          return `[arise] Failed to create session for ${shadow}`;
        }

        // 取得當前會話使用的模型，用於 <auto> 模型替換
        const parentModel = getSessionModel(context.sessionID);

        // 取得 shadow 預設模型
        const shadowConfig = SHADOW_AGENTS[shadow];
        const defaultModel = shadowConfig?.model ?? "";

        // 決定最終使用的模型
        const effectiveModel = defaultModel === AUTO_MODEL
          ? parentModel ?? defaultModel  // 若為 <auto> 且有父模型則使用，否則 fallback
          : defaultModel;

        // 解析模型字串為 providerID 和 modelID
        let modelBody: { providerID: string; modelID: string } | undefined;
        if (effectiveModel && effectiveModel !== AUTO_MODEL) {
          const [providerID, modelID] = effectiveModel.split("/");
          if (providerID && modelID) {
            modelBody = { providerID, modelID };
          }
        }

        if (run_in_background) {
          // Fire and forget - prompt async
          ctx.client.session.promptAsync({
            path: { id: sessionId },
            body: {
              agent: shadow,
              model: modelBody,
              parts: [{ type: "text", text: prompt }],
            },
          }).catch(() => {});

          return `[arise] Summoned ${shadow} in background.
Task: ${taskDesc}
Session ID: ${sessionId}

The shadow is working. Continue with your work.`;
        } else {
          // Sync: prompt and wait
          await ctx.client.session.prompt({
            path: { id: sessionId },
            body: {
              agent: shadow,
              model: modelBody,
              parts: [{ type: "text", text: prompt }],
            },
          });

          // Get messages
          const messages = await ctx.client.session.messages({
            path: { id: sessionId },
          });

          // Find last assistant message
          const lastAssistant = messages.data
            ?.filter((m) => m.info.role === "assistant")
            .pop();

          if (lastAssistant) {
            const textParts = lastAssistant.parts
              ?.filter((p) => p.type === "text")
              .map((p) => (p as { type: "text"; text: string }).text ?? "")
              .join("\n");

            return `[arise] ${shadow} reports:

${textParts || "(No text response)"}`;
          }

          return `[arise] ${shadow} completed but returned no message.`;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `[arise] Failed to summon ${shadow}: ${message}`;
      }
    },
  });
}
