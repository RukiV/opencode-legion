import type { PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import type { ShadowName } from "../config/schema";
import { DEFAULT_POLL_INTERVAL, DEFAULT_RETRY_DELAY_INCREMENT, DEFAULT_RETRY_DELAY_MAX } from "../config/schema";

export interface BackgroundTask {
  id: string;
  sessionId: string;
  parentSessionId: string;
  shadow: string;
  description: string;
  status: "running" | "completed" | "error";
  startedAt: number;
  completedAt?: number;
  result?: string;
  error?: string;
  retryCount: number;
}

export class BackgroundManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private ctx: PluginInput;
  private defaultPollInterval: number;
  private getPollInterval?: (agentName?: ShadowName) => number;
  private getRetryDelayIncrement?: (agentName?: ShadowName) => number;
  private getRetryDelayMax?: (agentName?: ShadowName) => number;

  constructor(
    ctx: PluginInput,
    pollIntervalOrGetter: number | ((agentName?: ShadowName) => number) = DEFAULT_POLL_INTERVAL,
    retryDelayIncrementOrGetter?: number | ((agentName?: ShadowName) => number),
    retryDelayMaxOrGetter?: number | ((agentName?: ShadowName) => number)
  ) {
    this.ctx = ctx;

    // 支援傳入函式或數字 - pollInterval
    if (typeof pollIntervalOrGetter === "function") {
      this.getPollInterval = pollIntervalOrGetter;
      this.defaultPollInterval = DEFAULT_POLL_INTERVAL;
    } else {
      this.defaultPollInterval = pollIntervalOrGetter;
    }

    // retryDelayIncrement
    if (retryDelayIncrementOrGetter !== undefined) {
      if (typeof retryDelayIncrementOrGetter === "function") {
        this.getRetryDelayIncrement = retryDelayIncrementOrGetter;
      } else {
        // 使用固定值，创建闭包返回
        this.getRetryDelayIncrement = () => retryDelayIncrementOrGetter;
      }
    } else {
      this.getRetryDelayIncrement = () => DEFAULT_RETRY_DELAY_INCREMENT;
    }

    // retryDelayMax
    if (retryDelayMaxOrGetter !== undefined) {
      if (typeof retryDelayMaxOrGetter === "function") {
        this.getRetryDelayMax = retryDelayMaxOrGetter;
      } else {
        this.getRetryDelayMax = () => retryDelayMaxOrGetter;
      }
    } else {
      this.getRetryDelayMax = () => DEFAULT_RETRY_DELAY_MAX;
    }
  }

  generateTaskId(): string {
    return `arise_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  async launch(opts: {
    shadow: string;
    prompt: string;
    description: string;
    parentSessionId: string;
  }): Promise<BackgroundTask> {
    const taskId = this.generateTaskId();

    // Create a new session for the background task
    const session = await this.ctx.client.session.create({
      body: { title: `[arise:${taskId}] ${opts.description}` },
    });

    const sessionId = session.data?.id;
    if (!sessionId) {
      throw new Error("Failed to create background session");
    }

    const task: BackgroundTask = {
      id: taskId,
      sessionId,
      parentSessionId: opts.parentSessionId,
      shadow: opts.shadow,
      description: opts.description,
      status: "running",
      startedAt: Date.now(),
      retryCount: 0,
    };

    this.tasks.set(taskId, task);

    // Fire the prompt asynchronously
    this.ctx.client.session
      .promptAsync({
        path: { id: sessionId },
        body: {
          agent: opts.shadow,
          parts: [{ type: "text", text: opts.prompt }],
        },
      })
      .then(() => this.schedulePolling(taskId, opts.shadow as ShadowName))
      .catch((err) => {
        task.status = "error";
        task.error = err instanceof Error ? err.message : String(err);
        task.completedAt = Date.now();
      });

    return task;
  }

  private schedulePolling(taskId: string, agentName?: ShadowName): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // 計算基本輪詢間隔
    const baseInterval = this.getPollInterval
      ? this.getPollInterval(agentName)
      : this.defaultPollInterval;

    // 計算重試延遲（從第二次失敗開始）
    let interval = baseInterval;
    if (task.retryCount > 0) {
      const increment = this.getRetryDelayIncrement
        ? this.getRetryDelayIncrement(agentName)
        : DEFAULT_RETRY_DELAY_INCREMENT;
      const maxDelay = this.getRetryDelayMax
        ? this.getRetryDelayMax(agentName)
        : DEFAULT_RETRY_DELAY_MAX;

      // 遞增量 = retryCount * increment，但最多不超過 maxDelay
      const additionalDelay = Math.min(task.retryCount * increment, maxDelay);
      interval = baseInterval + additionalDelay;
    }

    setTimeout(() => this.pollTaskCompletion(taskId), interval);
  }

  private async pollTaskCompletion(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") return;

    try {
      // Check session status
      const statusResult = await this.ctx.client.session.status({});
      const statuses = statusResult.data;

      if (statuses && task.sessionId in statuses) {
        const status = statuses[task.sessionId];

        if (status.type === "idle") {
          await this.extractResult(task);
          task.status = "completed";
          task.completedAt = Date.now();
          await this.notifyParent(task);
        } else if (status.type === "busy" || status.type === "retry") {
          // 增加重試次數
          task.retryCount++;
          this.schedulePolling(taskId, task.shadow as ShadowName);
        }
      } else {
        // Session not in status map, assume idle
        await this.extractResult(task);
        task.status = "completed";
        task.completedAt = Date.now();
        await this.notifyParent(task);
      }
    } catch (err) {
      task.status = "error";
      task.error = err instanceof Error ? err.message : String(err);
      task.completedAt = Date.now();
    }
  }

  private async extractResult(task: BackgroundTask): Promise<void> {
    try {
      const messages = await this.ctx.client.session.messages({
        path: { id: task.sessionId },
      });

      const lastAssistant = messages.data
        ?.filter((m) => m.info.role === "assistant")
        .pop();

      if (lastAssistant) {
        const textContent = lastAssistant.parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text ?? "")
          .join("\n");

        task.result = textContent || "(No response)";
      } else {
        task.result = "(No assistant response)";
      }
    } catch {
      task.result = "(Failed to retrieve result)";
    }
  }

  private async notifyParent(task: BackgroundTask): Promise<void> {
    const duration = task.completedAt
      ? Math.round((task.completedAt - task.startedAt) / 1000)
      : 0;

    try {
      await this.ctx.client.tui.showToast({
        body: {
          title: "Shadow Complete",
          message: `${task.shadow} finished: ${task.description} (${duration}s)`,
          variant: "success",
          duration: 3000,
        },
      });
    } catch {
      // TUI might not be available
    }
  }

  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  getTasksForSession(sessionId: string): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(
      (t) => t.parentSessionId === sessionId
    );
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") return false;

    try {
      await this.ctx.client.session.abort({ path: { id: task.sessionId } });
    } catch {
      // Ignore abort errors
    }

    task.status = "error";
    task.error = "Cancelled";
    task.completedAt = Date.now();
    return true;
  }

  handleEvent(event: Event): void {
    // Handle session.idle events to mark tasks as complete
    if (event.type === "session.idle") {
      const sessionId = (event as { properties?: { sessionID?: string } }).properties?.sessionID;
      if (sessionId) {
        for (const task of this.tasks.values()) {
          if (task.sessionId === sessionId && task.status === "running") {
            this.pollTaskCompletion(task.id);
          }
        }
      }
    }
  }
}
