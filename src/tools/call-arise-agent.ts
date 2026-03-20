import { tool } from "@opencode-ai/plugin";
import type { PluginInput } from "@opencode-ai/plugin";
import { getSessionModel } from "../config/model-cache";
import { ARISE_TOOLS, EnumAriseTools } from './tool-names';
import { ALLOWED_SHADOWS, EnumShadowSubAgentsName } from '../agents/shadow-names';
import { ITSToStringLiteral } from 'ts-type';
import { z } from 'zod';
import { tool2 } from '../types/opencode';
import { resolveModelContext } from '../utils/model-resolver';

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

        // 解析模型上下文：取得有效模型並轉換為 providerID/modelID
        const parentModel = getSessionModel(context.sessionID);
        const modelBody = resolveModelContext(parentModel, shadow);

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
