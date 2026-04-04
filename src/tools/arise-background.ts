import type { ToolContext } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./lib/background-manager";
import { BackgroundTaskStatus } from "../types/enums";
import { EnumAriseTools } from "../types/enums";
import { getAriseToolsConfigEntry } from "../agents/shadows";
import { tool2 } from '../types/types-opencode';
import { formatDuration } from "../utils/string/message";
import { getErrorMessage } from "../utils/error";
import { logArise2WithLevel } from "../utils/debug-control";
import {
  formatAriseMsgError,
  formatAriseMsgSuccess,
  formatAriseMsgSuccessMultiLine,
  formatAriseMsgInfo,
  formatAriseMsgMulti,
} from "../utils/string/arise-message";

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
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_ASYNC_BACKGROUND);

  return tool2<EnumAriseTools.ARISE_ASYNC_BACKGROUND>({
    description,
    args,

    async execute(args, context: ToolContext) {
      const { shadow, prompt, description, model } = args;

      try {
        /**
         * 狀態日誌：開始啟動背景任務
         * Status log: starting background task launch
         */
        logArise2WithLevel("debug", () => [
          `[arise-background]`,
          `Launching background task: shadow=${shadow}, description=${description}`,
        ], { force: true });

        /** 啟動背景任務 / Launch background task */
        const task = await manager.launch({
          shadow,
          prompt,
          description,
          parentSessionId: context.sessionID,
          model,
        });

        /**
         * 狀態日誌：背景任務啟動成功
         * Status log: background task launched successfully
         */
        logArise2WithLevel("debug", () => [
          `[arise-background]`,
          `Background task launched: taskId=${task.id}, shadow=${shadow}`,
        ], { force: true });

        return formatAriseMsgSuccessMultiLine(
          `Shadow ${shadow} launched in background.`,
          `Task ID: ${task.id}
Description: ${description}

Use arise_background_output("${task.id}") when you need the result.`
        );
      } catch (error) {
        /**
         * 狀態日誌：背景任務啟動失敗
         * Status log: background task launch failed
         */
        logArise2WithLevel("error", () => [
          `[arise-background]`,
          `Failed to launch background task: shadow=${shadow}, error=${getErrorMessage(error)}`,
        ], { force: true });

        const msg = getErrorMessage(error);
        return formatAriseMsgError(`Failed to launch background task: ${msg}`);
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
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT);

  return tool2<EnumAriseTools.ARISE_ASYNC_BACKGROUND_OUTPUT>({
    description,
    args,

    async execute(args) {
      const task = manager.getTask(args.task_id);

      /**
       * 狀態日誌：查詢任務輸出
       * Status log: querying task output
       */
      logArise2WithLevel("debug", () => [
        `[arise-background-output]`,
        `Querying task: taskId=${args.task_id}`,
      ], { force: true });

      /** 任務不存在 / Task not found */
      if (!task) {
        /**
         * 狀態日誌：任務不存在
         * Status log: task not found
         */
        logArise2WithLevel("debug", () => [
          `[arise-background-output]`,
          `Task not found: taskId=${args.task_id}`,
        ], { force: true });

        return formatAriseMsgError(`Task not found: ${args.task_id}`);
      }

      /** 格式化任務執行時長 / Format task execution duration */
      const duration = formatDuration(task.startedAt, task.completedAt);

      /** 任務仍在執行中 / Task still running */
      if (task.status === BackgroundTaskStatus.Running) {
        /**
         * 狀態日誌：任務仍在執行中
         * Status log: task still running
         */
        logArise2WithLevel("debug", () => [
          `[arise-background-output]`,
          `Task still running: taskId=${args.task_id}, duration=${duration}`,
        ], { force: true });

        return formatAriseMsgInfo(`Task still running (${duration}). Check again later.`);
      }

      /** 任務執行失敗 / Task execution failed */
      if (task.status === BackgroundTaskStatus.Error) {
        /**
         * 狀態日誌：任務執行失敗
         * Status log: task execution failed
         */
        logArise2WithLevel("debug", () => [
          `[arise-background-output]`,
          `Task failed: taskId=${args.task_id}, error=${task.error ?? "Unknown error"}, duration=${duration}`,
        ], { force: true });

        return formatAriseMsgError(`Task failed: ${task.error ?? "Unknown error"}`);
      }

      /**
       * 狀態日誌：任務成功完成
       * Status log: task completed successfully
       */
      logArise2WithLevel("debug", () => [
        `[arise-background-output]`,
        `Task completed: taskId=${args.task_id}, shadow=${task.shadow}, duration=${duration}`,
      ], { force: true });

      /** 任務成功完成 / Task completed successfully */
      return formatAriseMsgSuccessMultiLine(
        `${task.shadow} completed (${duration}):`,
        task.result ?? "(No output)"
      );
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
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS);

  return tool2<EnumAriseTools.ARISE_ASYNC_BACKGROUND_STATUS>({
    description,
    args,

    async execute(args, context: ToolContext) {
      /**
       * 狀態日誌：查詢任務列表
       * Status log: querying task list
       */
      logArise2WithLevel("debug", () => [
        `[arise-background-status]`,
        `Querying all tasks: current_session_only=${args.current_session_only ?? false}`,
      ], { force: true });

      /** 取得所有任務 / Get all tasks */
      let tasks = manager.getAllTasks();

      /** 如有需要，只取得目前 session 的任務 / If needed, only get current session's tasks */
      if (args.current_session_only) {
        tasks = tasks.filter((t) => t.parentSessionId === context.sessionID);
      }

      /** 沒有任務 / No tasks */
      if (tasks.length === 0) {
        /**
         * 狀態日誌：無任務
         * Status log: no tasks
         */
        logArise2WithLevel("debug", () => [
          `[arise-background-status]`,
          `No background tasks found`,
        ], { force: true });

        return formatAriseMsgInfo("No background tasks.");
      }

      /**
       * 狀態日誌：任務列表查詢成功
       * Status log: task list queried successfully
       */
      logArise2WithLevel("debug", () => [
        `[arise-background-status]`,
        `Found ${tasks.length} background task(s)`,
      ], { force: true });

      /** 格式化任務列表 / Format task list */
      const lines = tasks.map((t) => {
        const duration = formatDuration(t.startedAt, t.completedAt);

        return `- ${t.id}: ${t.shadow} | ${t.status} | ${t.description} (${duration})`;
      });

      return formatAriseMsgMulti(`Background tasks:\n${lines.join("\n")}`);
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
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_ASYNC_BACKGROUND_CANCEL);

  return tool2<EnumAriseTools.ARISE_ASYNC_BACKGROUND_CANCEL>({
    description,
    args,

    async execute(args) {
      /**
       * 狀態日誌：嘗試取消任務
       * Status log: attempting to cancel task
       */
      logArise2WithLevel("debug", () => [
        `[arise-background-cancel]`,
        `Cancelling task: taskId=${args.task_id}`,
      ], { force: true });

      const success = await manager.cancelTask(args.task_id);

      if (success) {
        /**
         * 狀態日誌：任務取消成功
         * Status log: task cancelled successfully
         */
        logArise2WithLevel("debug", () => [
          `[arise-background-cancel]`,
          `Task cancelled: taskId=${args.task_id}`,
        ], { force: true });

        return formatAriseMsgSuccess(`Task ${args.task_id} cancelled.`);
      } else {
        /**
         * 狀態日誌：任務取消失敗
         * Status log: task cancellation failed
         */
        logArise2WithLevel("debug", () => [
          `[arise-background-cancel]`,
          `Failed to cancel task: taskId=${args.task_id}, reason="not found or already completed"`,
        ], { force: true });

        return formatAriseMsgError("Could not cancel task (not found or already completed).");
      }
    },
  });
}
