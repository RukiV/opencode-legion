import type { PluginInput } from "@opencode-ai/plugin";
import { getSessionModel } from "../config/model-cache";
import type { IAriseConfig } from "../config/schema";
import { EnumAriseTools, getAriseToolsConfigEntry } from './tool-names';
import { tool2 } from '../types/types-opencode';
import { resolveModelContext } from '../utils/model-resolver';
import { extractTextFromMessageParts } from '../utils/message';
import { getErrorMessage } from '../utils/error';
import {
  formatAriseMsgTitle,
  formatAriseMsgError,
  formatAriseMsgSuccessMultiLine,
} from '../utils/arise-message';

/**
 * 建立呼叫 Arise Agent 的工具
 * Create tool for calling Arise Agent
 *
 * 提供一個工具讓 Monarch 可以召喚 Shadow 代理
 * Provides a tool for Monarch to summon Shadow agents
 *
 * @param ctx - Plugin 上下文
 * @param config - Arise 配置物件
 * @returns Arise Agent 工具定義
 */
export function createCallAriseAgentTool(ctx: PluginInput, config: IAriseConfig) {
  const {
    description,
    args,
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_SUMMON);

  return tool2({
    description,
    args,

    /**
     * 執行工具
     * Execute tool
     *
     * 處理 Shadow 代理的召喚請求
     * Handles Shadow agent summoning requests
     *
     * @param args - 工具參數
     * @param context - 執行上下文
     * @returns 執行結果訊息
     */
    async execute(args, context) {
      const { shadow, prompt, run_in_background, description, model } = args;
      /** 任務描述（用於顯示）/ Task description (for display) */
      const taskDesc = description ?? `${shadow} task`;

      try {
        /**
         * 建立新的 Session
         * Create new session
         *
         * 每個 Shadow 任務都在獨立的 session 中執行
         * Each Shadow task executes in an isolated session
         */
        const session = await ctx.client.session.create({
          body: { title: formatAriseMsgTitle(taskDesc) },
        });

        const sessionId = session.data?.id;
        if (!sessionId) {
          return formatAriseMsgError(`Failed to create session for ${shadow}`);
        }

        /**
         * 解析模型上下文
         * Resolve model context
         *
         * 優先順序：用戶指定 > Config 模型 > Shadow 預設 > AUTO 使用父模型 > 父模型 > DEFAULT_MODEL
         * Priority: User specified > Config model > Shadow default > AUTO use parent > parentModel > DEFAULT_MODEL
         */
        const parentModel = getSessionModel(context.sessionID);
        const modelBody = resolveModelContext(parentModel, shadow, config, model);

        /**
         * 根據執行模式分支
         * Branch based on execution mode
         *
         * run_in_background: 非同步執行，立即返回
         * run_in_background: Execute async, return immediately
         */
        if (run_in_background) {
          /**
           * 非同步模式（Fire and forget）
           * Async mode (Fire and forget)
           *
           * 立即返回，Shadow 在背景執行
           * Return immediately, Shadow executes in background
           */
          ctx.client.session.promptAsync({
            path: { id: sessionId },
            body: {
              agent: shadow,
              model: modelBody,
              parts: [{ type: "text", text: prompt }],
            },
          }).catch((error) => {
            ctx.client.app.log?.({
              body: {
                service: "arise",
                level: "error",
                message: `Background summon failed for ${shadow}: ${getErrorMessage(error)}`,
              },
            });
          });

          return formatAriseMsgSuccessMultiLine(
            `Summoned ${shadow} in background.`,
            `Task: ${taskDesc}\nSession ID: ${sessionId}\n\nThe shadow is working. Continue with your work.`
          );
        } else {
          /**
           * 同步模式（等待完成）
           * Sync mode (wait for completion)
           *
           * 等待 Shadow 完成後返回結果
           * Wait for Shadow to complete, then return result
           */
          await ctx.client.session.prompt({
            path: { id: sessionId },
            body: {
              agent: shadow,
              model: modelBody,
              parts: [{ type: "text", text: prompt }],
            },
          });

          /** 取得 session 的訊息歷史 / Get session message history */
          const messages = await ctx.client.session.messages({
            path: { id: sessionId },
          });

          /**
           * 取得最後一個 assistant 訊息
           * Get last assistant message
           *
           * 過濾 role === "assistant" 的訊息，取最後一條
           * Filter messages with role === "assistant", take the last one
           */
          const lastAssistant = messages.data
            ?.filter((m) => m.info.role === "assistant")
            .pop();

          if (lastAssistant) {
            /**
             * 從訊息 parts 中提取文字內容
             * Extract text content from message parts
             *
             * 支援多個 text parts，使用換行連接
             * Supports multiple text parts, joined with newlines
             */
            const textParts = extractTextFromMessageParts(lastAssistant.parts);

            return formatAriseMsgSuccessMultiLine(
              `${shadow} reports:`,
              textParts || "(No text response)"
            );
          }

          return formatAriseMsgError(`${shadow} completed but returned no message.`);
        }
      } catch (error) {
        /**
         * 錯誤處理
         * Error handling
         *
         * 安全地取得錯誤訊息
         * Safely extract error message
         */
        const message = getErrorMessage(error);
        return formatAriseMsgError(`Failed to summon ${shadow}: ${message}`);
      }
    },
  });
}
