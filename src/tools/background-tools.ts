import type { ToolContext } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./background-manager";
import { EnumAriseTools, getAriseToolsConfigEntry } from "./tool-names";
import { tool2 } from '../types/opencode';
import { formatDuration } from "../utils/message";
import { getErrorMessage } from "../utils/error";

/**
 * 建立背景任務工具
 * Create background task tool
 *
 * 用於啟動背景 Shadow 任務
 * Used to launch background Shadow tasks
 *
 * @param manager - BackgroundManager 實例
 */
export function createBackgroundTaskTool(manager: BackgroundManager){
  const {
    description,
    args,
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_BACKGROUND);

  return tool2<EnumAriseTools.ARISE_BACKGROUND>({
    description,
    args,

    async execute(args, context: ToolContext) {
      const { shadow, prompt, description, model } = args;

      try {
        /** 啟動背景任務 / Launch background task */
        const task = await manager.launch({
          shadow,
          prompt,
          description,
          parentSessionId: context.sessionID,
          model,
        });

        return `[arise] Shadow ${shadow} launched in background.

Task ID: ${task.id}
Description: ${description}

Use arise_background_output("${task.id}") when you need the result.`;
      } catch (error) {
        const msg = getErrorMessage(error);
        return `[arise] Failed to launch background task: ${msg}`;
      }
    },
  });
}

/**
 * 建立背景任務輸出工具
 * Create background task output tool
 *
 * 用於取得背景任務的執行結果
 * Used to get execution results of background tasks
 *
 * @param manager - BackgroundManager 實例
 */
export function createBackgroundOutputTool(manager: BackgroundManager) {
  const {
    description,
    args,
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_BACKGROUND_OUTPUT);

  return tool2<EnumAriseTools.ARISE_BACKGROUND_OUTPUT>({
    description,
    args,

    async execute(args) {
      const task = manager.getTask(args.task_id);

      /** 任務不存在 / Task not found */
      if (!task) {
        return `[arise] Task not found: ${args.task_id}`;
      }

      /** 格式化任務執行時長 / Format task execution duration */
      const duration = formatDuration(task.startedAt, task.completedAt);

      /** 任務仍在執行中 / Task still running */
      if (task.status === "running") {
        return `[arise] Task still running (${duration}). Check again later.`;
      }

      /** 任務執行失敗 / Task execution failed */
      if (task.status === "error") {
        return `[arise] Task failed: ${task.error ?? "Unknown error"}`;
      }

      /** 任務成功完成 / Task completed successfully */
      return `[arise] ${task.shadow} completed (${duration}):

${task.result ?? "(No output)"}`;
    },
  });
}

/**
 * 建立背景任務狀態工具
 * Create background task status tool
 *
 * 用於列出所有背景任務及其狀態
 * Used to list all background tasks and their status
 *
 * @param manager - BackgroundManager 實例
 */
export function createBackgroundStatusTool(manager: BackgroundManager) {

  const {
    description,
    args,
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_BACKGROUND_STATUS);

  return tool2<EnumAriseTools.ARISE_BACKGROUND_STATUS>({
    description,
    args,

    async execute(args, context: ToolContext) {
      /** 取得所有任務 / Get all tasks */
      let tasks = manager.getAllTasks();

      /** 如有需要，只取得目前 session 的任務 / If needed, only get current session's tasks */
      if (args.current_session_only) {
        tasks = tasks.filter((t) => t.parentSessionId === context.sessionID);
      }

      /** 沒有任務 / No tasks */
      if (tasks.length === 0) {
        return "[arise] No background tasks.";
      }

      /** 格式化任務列表 / Format task list */
      const lines = tasks.map((t) => {
        const duration = formatDuration(t.startedAt, t.completedAt);

        return `- ${t.id}: ${t.shadow} | ${t.status} | ${t.description} (${duration})`;
      });

      return `[arise] Background tasks:\n${lines.join("\n")}`;
    },
  });
}

/**
 * 建立取消背景任務工具
 * Create cancel background task tool
 *
 * 用於取消正在執行的背景任務
 * Used to cancel running background tasks
 *
 * @param manager - BackgroundManager 實例
 */
export function createBackgroundCancelTool(manager: BackgroundManager) {
  const {
    description,
    args,
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_BACKGROUND_CANCEL);

  return tool2<EnumAriseTools.ARISE_BACKGROUND_CANCEL>({
    description,
    args,

    async execute(args) {
      const success = await manager.cancelTask(args.task_id);

      if (success) {
        return `[arise] Task ${args.task_id} cancelled.`;
      } else {
        return `[arise] Could not cancel task (not found or already completed).`;
      }
    },
  });
}
