import type { PluginInput } from "@opencode-ai/plugin";
import type { IAriseConfig } from "../config/schema";
import type { ISessionRecord } from "../types/session";
import { EnumAriseTools, BackgroundTaskStatus } from '../types/enums';
import { EnumLogLevel } from "../types/enum-opencode";
import { getAriseToolsConfigEntry } from '../agents/lib/arise-tools-utils';
import { tool2 } from '../types/types-opencode';
import { resolveModelContext, formatModelBodyDescription } from '../utils/model-resolver';
import { extractTextFromMessageParts } from '../utils/string/message';
import { getErrorMessage } from '../utils/error';
import { logArise2WithLevel } from '../utils/debug-control';
import {
  formatAriseMsgTitle,
  formatAriseMsgError,
  formatAriseMsgSuccessMultiLine,
  formatAriseMsgLogBody,
} from '../utils/string/arise-message';
import { runtimeCache } from '../utils/session/session-cache';

/**
 * 建立呼叫 Arise Agent 的工具
 * Create tool for calling Arise Agent
 *
 * 提供一個工具讓 Monarch 可以召喚 Shadow Agent
 * Provides a tool for Monarch to summon Shadow agents
 *
 * @param ctx - Plugin 上下文
 * @param config - Arise 配置物件
 * @returns Arise Agent 工具定義
 */
export function createAgentToolAriseSyncSummon(ctx: PluginInput, config: IAriseConfig) {
  const {
    description,
    args,
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_SYNC_SUMMON);

  return tool2({
    description,
    args,

    /**
     * 執行工具
     * Execute tool
     *
     * 處理 Shadow Agent 的召喚請求
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

      /** Session ID（可能在 catch 块中使用）/ Session ID (may be used in catch block) */
      let sessionId: string | undefined;

      try {
        /**
         * 狀態日誌：開始召喚
         * Status log: starting summon
         */
        logArise2WithLevel("debug", () => [
          `[arise-summon]`,
          `Starting summon: shadow=${shadow}, description=${taskDesc}, run_in_background=${run_in_background}`,
        ], { force: true });

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

        sessionId = session.data?.id;
        if (!sessionId) {
          /**
           * 狀態日誌：建立 session 失敗
           * Status log: session creation failed
           */
          logArise2WithLevel("error", () => [
            `[arise-summon]`,
            `Failed to create session for ${shadow}: no session ID returned`,
          ], { force: true });

          return formatAriseMsgError(`Failed to create session for ${shadow}`);
        }

        /**
         * 解析模型上下文
         * Resolve model context
         *
         * 優先順序：用戶指定 > Config 模型 > Shadow 預設 > AUTO 使用父模型 > 父模型 > DEFAULT_MODEL
         * Priority: User specified > Config model > Shadow default > AUTO use parent > parentModel > DEFAULT_MODEL
         */
        const parentModel = runtimeCache.getSessionModel(context.sessionID);
        const modelBody = resolveModelContext(parentModel, shadow, config, model);

        /**
         * 狀態日誌：解析模型完成
         * Status log: model resolved
         */
        logArise2WithLevel("debug", () => [
          `[arise-summon]`,
          `Model resolved: ${formatModelBodyDescription(modelBody)}, sessionId=${sessionId}`,
        ], { force: true });

        /**
         * 更新 session 记录（添加 shadow 和 parentSessionId）
         * Update session record (add shadow and parentSessionId)
         *
         * 从 chat.params hook 已经记录了基础资讯，这里补充 Arise 追加的资讯
         */
        const existingRecord = runtimeCache.getSessionRecord(sessionId);
        if (existingRecord) {
          const updatedRecord: ISessionRecord = {
            ...existingRecord,
            _arise: {
              ...existingRecord._arise,
              shadow: shadow,
              parentSessionId: context.sessionID,
              resolvedModel: formatModelBodyDescription(modelBody),
            },
          };
          runtimeCache.cacheSessionRecord(updatedRecord);
        }

        /**
         * 輸出召喚日誌
         * Output summon log
         *
         * 報告啟動的模型名稱、執行模式和任務描述，無視 logLevel 限制
         * Report the launched model name, execution mode and task description, ignore logLevel limit
         */
        logArise2WithLevel('info', () => [
          `[Arise] Summoned ${shadow} with model: ${formatModelBodyDescription(modelBody)}, run_in_background: ${run_in_background}, description: ${taskDesc}`
        ], {
          force: true
        });

        /**
         * 根據執行模式分支
         * Branch based on execution mode
         *
         * run_in_background: 非同步執行，立即返回
         * run_in_background: Execute async, return immediately
         */
        if (run_in_background) {
          /**
           * 狀態日誌：開始非同步執行
           * Status log: starting async execution
           */
          logArise2WithLevel("debug", () => [
            `[arise-summon]`,
            `Starting async execution: sessionId=${sessionId}, shadow=${shadow}`,
          ], { force: true });

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
          })
            .then(() => {
              /**
               * 狀態日誌：非同步執行完成（Promise resolved）
               * Status log: async execution completed (Promise resolved)
               */
              logArise2WithLevel("debug", () => [
                `[arise-summon]`,
                `Async execution resolved: sessionId=${sessionId}, shadow=${shadow}`,
              ], { force: true });
            })
            .catch((error) => {
              /**
               * 狀態日誌：非同步執行錯誤
               * Status log: async execution error
               */
              logArise2WithLevel("error", () => [
                `[arise-summon]`,
                `Async execution failed: sessionId=${sessionId}, shadow=${shadow}, error=${getErrorMessage(error)}`,
              ], { force: true });

              ctx.client.app.log?.({
                body: formatAriseMsgLogBody({
                  label: "Summon failed",
                  message: `Background summon failed for ${shadow}: ${getErrorMessage(error)}`,
                  level: EnumLogLevel.Error,
                }),
              });
            });

          return formatAriseMsgSuccessMultiLine(
            `Summoned ${shadow} in background.`,
            `Task: ${taskDesc}\nSession ID: ${sessionId}\n\nThe shadow is working. Continue with your work.`
          );
        } else {
          /**
           * 狀態日誌：開始同步執行
           * Status log: starting sync execution
           */
          logArise2WithLevel("debug", () => [
            `[arise-summon]`,
            `Starting sync execution: sessionId=${sessionId}, shadow=${shadow}`,
          ], { force: true });

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

          /**
           * 狀態日誌：同步執行完成
           * Status log: sync execution completed
           */
          logArise2WithLevel("debug", () => [
            `[arise-summon]`,
            `Sync execution completed: sessionId=${sessionId}, shadow=${shadow}`,
          ], { force: true });

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

          /** 更新 session 记录状态为已完成 / Update session record status to completed */
          runtimeCache.updateSessionStatus(sessionId, BackgroundTaskStatus.Completed);

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

        /** 更新 session 记录状态为错误（如果 sessionId 存在）/ Update session record status to error (if sessionId exists) */
        if (sessionId) {
          runtimeCache.updateSessionStatus(sessionId, BackgroundTaskStatus.Error, message);
        }

        return formatAriseMsgError(`Failed to summon ${shadow}: ${message}`);
      }
    },
  });
}
