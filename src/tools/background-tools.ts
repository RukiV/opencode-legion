import { z, ZodEnum, ZodString, ZodOptional, ZodBoolean } from "zod";
import { tool, type ToolContext } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./background-manager";
import type { ShadowName } from "../config/schema";
import { EnumAriseTools, ARISE_TOOLS } from "./tool-names";
import { IPluginToolAriseArgs, IReturnTypeOfPluginTool, IReturnTypeOfPluginToolArise, tool2 } from '../types/opencode';

export function createBackgroundTaskTool(manager: BackgroundManager){
  return tool2<EnumAriseTools.ARISE_BACKGROUND>({
    description: ARISE_TOOLS[EnumAriseTools.ARISE_BACKGROUND].description,
    args: ARISE_TOOLS[EnumAriseTools.ARISE_BACKGROUND].args,

    async execute(args, context: ToolContext) {
      const { shadow, prompt, description } = args;

      try {
        const task = await manager.launch({
          shadow,
          prompt,
          description,
          parentSessionId: context.sessionID,
        });

        return `[arise] Shadow ${shadow} launched in background.

Task ID: ${task.id}
Description: ${description}

Use arise_background_output("${task.id}") when you need the result.`;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return `[arise] Failed to launch background task: ${msg}`;
      }
    },
  });
}

export function createBackgroundOutputTool(manager: BackgroundManager) {
  return tool2<EnumAriseTools.ARISE_BACKGROUND_OUTPUT>({
    description: ARISE_TOOLS[EnumAriseTools.ARISE_BACKGROUND_OUTPUT].description,
    args: ARISE_TOOLS[EnumAriseTools.ARISE_BACKGROUND_OUTPUT].args,

    async execute(args) {
      const task = manager.getTask(args.task_id);

      if (!task) {
        return `[arise] Task not found: ${args.task_id}`;
      }

      const duration = task.completedAt
        ? Math.round((task.completedAt - task.startedAt) / 1000)
        : Math.round((Date.now() - task.startedAt) / 1000);

      if (task.status === "running") {
        return `[arise] Task still running (${duration}s). Check again later.`;
      }

      if (task.status === "error") {
        return `[arise] Task failed: ${task.error ?? "Unknown error"}`;
      }

      return `[arise] ${task.shadow} completed (${duration}s):

${task.result ?? "(No output)"}`;
    },
  });
}

export function createBackgroundStatusTool(manager: BackgroundManager) {
  return tool2<EnumAriseTools.ARISE_BACKGROUND_STATUS>({
    description: ARISE_TOOLS[EnumAriseTools.ARISE_BACKGROUND_STATUS].description,
    args: ARISE_TOOLS[EnumAriseTools.ARISE_BACKGROUND_STATUS].args,

    async execute(args, context: ToolContext) {
      let tasks = manager.getAllTasks();

      if (args.current_session_only) {
        tasks = tasks.filter((t) => t.parentSessionId === context.sessionID);
      }

      if (tasks.length === 0) {
        return "[arise] No background tasks.";
      }

      const lines = tasks.map((t) => {
        const duration = t.completedAt
          ? Math.round((t.completedAt - t.startedAt) / 1000)
          : Math.round((Date.now() - t.startedAt) / 1000);

        return `- ${t.id}: ${t.shadow} | ${t.status} | ${t.description} (${duration}s)`;
      });

      return `[arise] Background tasks:\n${lines.join("\n")}`;
    },
  });
}

export function createBackgroundCancelTool(manager: BackgroundManager) {
  return tool2<EnumAriseTools.ARISE_BACKGROUND_CANCEL>({
    description: ARISE_TOOLS[EnumAriseTools.ARISE_BACKGROUND_CANCEL].description,
    args: ARISE_TOOLS[EnumAriseTools.ARISE_BACKGROUND_CANCEL].args,

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
