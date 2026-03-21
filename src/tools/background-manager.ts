import type { PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import { DEFAULT_POLL_INTERVAL, DEFAULT_RETRY_DELAY_INCREMENT, DEFAULT_RETRY_DELAY_MAX } from "../config/schema";
import { IAllShadowAgentsName } from "../agents/shadow-names";
import { getErrorMessage } from "../utils/message";

/**
 * 將配置值正規化為 getter 函式
 * Normalize config value to getter function
 *
 * 內部使用的輔助函式，處理以下轉換：
 * - 函式：直接返回
 * - 數字：包裝為返回該數字的函式
 * - undefined：返回返回預設值的函式
 *
 * Internal helper function that handles:
 * - Function: return directly
 * - Number: wrap in a function that returns it
 * - undefined: return a function that returns the default
 *
 * @param value - 輸入值（數字、函式或 undefined）
 * @param defaultValue - 預設值
 * @returns 正規化後的 getter 函式
 */
function _normalizeToGetter(
	value: number | ((agentName?: IAllShadowAgentsName) => number) | undefined,
	defaultValue: number
): (agentName?: IAllShadowAgentsName) => number {
	if (typeof value === "function") {
		return value;
	}
	if (value !== undefined) {
		/** 固定值，建立閉包返回 / Fixed value, create closure to return it */
		return () => value;
	}
	/** 使用預設值 / Use default value */
	return () => defaultValue;
}

/**
 * 背景任務結構定義
 * Background task structure definition
 *
 * 追蹤每個背景 Shadow 任務的狀態和結果
 * Tracks the status and result of each background Shadow task
 */
export interface BackgroundTask {
  /** 任務唯一識別符 / Unique task identifier */
  id: string;
  /** 關聯的 Session ID / Associated session ID */
  sessionId: string;
  /** 父 Session ID（發起任務的 session）/ Parent session ID (session that launched the task) */
  parentSessionId: string;
  /** Shadow 名稱 / Shadow name */
  shadow: string;
  /** 任務描述 / Task description */
  description: string;
  /** 任務狀態 / Task status */
  status: "running" | "completed" | "error";
  /** 任務開始時間戳 / Task start timestamp */
  startedAt: number;
  /** 任務完成時間戳（可選）/ Task completion timestamp (optional) */
  completedAt?: number;
  /** 任務結果（可選）/ Task result (optional) */
  result?: string;
  /** 錯誤訊息（可選）/ Error message (optional) */
  error?: string;
  /** 輪詢重試次數 / Polling retry count */
  retryCount: number;
}

/**
 * 背景任務管理器
 * Background task manager
 *
 * 負責管理所有背景 Shadow 任務的生命週期
 * Responsible for managing the lifecycle of all background Shadow tasks
 */
export class BackgroundManager {
  /** 任務儲存（以 taskId 為 key）/ Task storage (keyed by taskId) */
  private tasks: Map<string, BackgroundTask> = new Map();
  /** Plugin 上下文 / Plugin context */
  private ctx: PluginInput;
  /** 預設輪詢間隔 / Default polling interval */
  private defaultPollInterval: number;
  /** 輪詢間隔取得器（可選，支援 per-agent 設定）/ Polling interval getter (optional, supports per-agent settings) */
  private getPollInterval?: (agentName?: IAllShadowAgentsName) => number;
  /** 重試延遲遞增量取得器 / Retry delay increment getter */
  private getRetryDelayIncrement?: (agentName?: IAllShadowAgentsName) => number;
  /** 重試延遲最大值取得器 / Max retry delay getter */
  private getRetryDelayMax?: (agentName?: IAllShadowAgentsName) => number;

  /**
   * 建構函式
   * Constructor
   *
   * @param ctx - Plugin 上下文
   * @param pollIntervalOrGetter - 輪詢間隔（數字或函式）
   * @param retryDelayIncrementOrGetter - 重試延遲遞增量（數字或函式）
   * @param retryDelayMaxOrGetter - 重試延遲最大值（數字或函式）
   */
  constructor(
    ctx: PluginInput,
    pollIntervalOrGetter: number | ((agentName?: IAllShadowAgentsName) => number) = DEFAULT_POLL_INTERVAL,
    retryDelayIncrementOrGetter?: number | ((agentName?: IAllShadowAgentsName) => number),
    retryDelayMaxOrGetter?: number | ((agentName?: IAllShadowAgentsName) => number)
  ) {
    this.ctx = ctx;

    /**
     * 輪詢間隔初始化
     * Polling interval initialization
     *
     * 支援傳入數字（固定值）或函式（動態取得 per-agent 設定）
     * Supports passing number (fixed value) or function (dynamic per-agent settings)
     *
     * 特別處理：如果傳入函式，保留 defaultPollInterval 為預設值
     * Special handling: if function is passed, keep defaultPollInterval as default
     */
    if (typeof pollIntervalOrGetter === "function") {
      this.getPollInterval = pollIntervalOrGetter;
      this.defaultPollInterval = DEFAULT_POLL_INTERVAL;
    } else {
      this.defaultPollInterval = pollIntervalOrGetter;
      this.getPollInterval = () => pollIntervalOrGetter;
    }

    /**
     * 重試延遲遞增量初始化
     * Retry delay increment initialization
     */
    this.getRetryDelayIncrement = _normalizeToGetter(
      retryDelayIncrementOrGetter,
      DEFAULT_RETRY_DELAY_INCREMENT
    );

    /**
     * 重試延遲最大值初始化
     * Max retry delay initialization
     */
    this.getRetryDelayMax = _normalizeToGetter(
      retryDelayMaxOrGetter,
      DEFAULT_RETRY_DELAY_MAX
    );
  }

  /**
   * 產生唯一的任務 ID
   * Generate unique task ID
   *
   * 格式：arise_{timestamp}_{random}
   * 使用 base36 編碼以保持 ID 簡潔
   * Uses base36 encoding to keep ID compact
   */
  generateTaskId(): string {
    return `arise_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  /**
   * 啟動背景任務
   * Launch background task
   *
   * 建立新 session 並非同步執行 prompt
   * Creates new session and executes prompt asynchronously
   *
   * @param opts - 任務選項
   * @returns 建立的任務物件
   */
  async launch(opts: {
    shadow: string;
    prompt: string;
    description: string;
    parentSessionId: string;
  }): Promise<BackgroundTask> {
    const taskId = this.generateTaskId();

    /**
     * 為背景任務建立新 session
     * Create new session for background task
     *
     * Session title 包含 taskId 以便識別
     * Session title includes taskId for identification
     */
    const session = await this.ctx.client.session.create({
      body: { title: `[arise:${taskId}] ${opts.description}` },
    });

    const sessionId = session.data?.id;
    if (!sessionId) {
      throw new Error("Failed to create background session");
    }

    /**
     * 建立任務物件
     * Create task object
     */
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

    /** 註冊任務到管理器 / Register task to manager */
    this.tasks.set(taskId, task);

    /**
     * 非同步執行 prompt（fire and forget）
     * Execute prompt asynchronously (fire and forget)
     *
     * promptAsync 不會等待完成，完成後自動排程輪詢
     * promptAsync doesn't wait for completion, schedules polling after completion
     */
    this.ctx.client.session
      .promptAsync({
        path: { id: sessionId },
        body: {
          agent: opts.shadow,
          parts: [{ type: "text", text: opts.prompt }],
        },
      })
      .then(() => this.schedulePolling(taskId, opts.shadow as IAllShadowAgentsName))
      .catch((err) => {
        task.status = "error";
        task.error = getErrorMessage(err);
        task.completedAt = Date.now();
      });

    return task;
  }

  /**
   * 排程輪詢檢查任務狀態
   * Schedule polling to check task status
   *
   * 計算下次輪詢的間隔時間
   * Calculates the next polling interval
   *
   * @param taskId - 任務 ID
   * @param agentName - Shadow 名稱
   */
  private schedulePolling(taskId: string, agentName?: IAllShadowAgentsName): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    /**
     * 計算基本輪詢間隔
     * Calculate base polling interval
     *
     * 優先使用 per-agent 設定，否則使用預設值
     * Prefer per-agent setting, otherwise use default
     */
    const baseInterval = this.getPollInterval
      ? this.getPollInterval(agentName)
      : this.defaultPollInterval;

    /**
     * 計算重試延遲（從第二次失敗開始）
     * Calculate retry delay (starts from second failure)
     *
     * 隨著重試次數增加，輪詢間隔會漸進式延長
     * As retry count increases, polling interval progressively extends
     */
    let interval = baseInterval;
    if (task.retryCount > 0) {
      const increment = this.getRetryDelayIncrement
        ? this.getRetryDelayIncrement(agentName)
        : DEFAULT_RETRY_DELAY_INCREMENT;
      const maxDelay = this.getRetryDelayMax
        ? this.getRetryDelayMax(agentName)
        : DEFAULT_RETRY_DELAY_MAX;

      /**
       * 計算額外延遲
       * Calculate additional delay
       *
       * 遞增量 = retryCount * increment，但最多不超過 maxDelay
       * Additional delay = retryCount * increment, capped at maxDelay
       */
      const additionalDelay = Math.min(task.retryCount * increment, maxDelay);
      interval = baseInterval + additionalDelay;
    }

    setTimeout(() => this.pollTaskCompletion(taskId), interval);
  }

  /**
   * 輪詢檢查任務完成狀態
   * Poll to check task completion status
   *
   * 檢查 session 狀態，根據結果更新任務狀態
   * Checks session status and updates task status accordingly
   *
   * @param taskId - 任務 ID
   */
  private async pollTaskCompletion(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") return;

    try {
      /**
       * 檢查 session 狀態
       * Check session status
       */
      const statusResult = await this.ctx.client.session.status({});
      const statuses = statusResult.data;

      if (statuses && task.sessionId in statuses) {
        const status = statuses[task.sessionId];

        /**
         * Session idle = 任務完成
         * Session idle = task completed
         */
        if (status.type === "idle") {
          await this.extractResult(task);
          task.status = "completed";
          task.completedAt = Date.now();
          await this.notifyParent(task);
        }
        /**
         * Session busy/retry = 任務仍在執行，增加重試次數並繼續輪詢
         * Session busy/retry = task still running, increment retry count and continue polling
         */
        else if (status.type === "busy" || status.type === "retry") {
          task.retryCount++;
          this.schedulePolling(taskId, task.shadow as IAllShadowAgentsName);
        }
      } else {
        /**
         * Session 不在狀態 map 中，假定為 idle
         * Session not in status map, assume idle
         *
         * 這是一種容錯機制，避免因狀態查詢失敗而無法完成任務
         * This is a fault tolerance mechanism to avoid tasks never completing due to status query failures
         */
        await this.extractResult(task);
        task.status = "completed";
        task.completedAt = Date.now();
        await this.notifyParent(task);
      }
    } catch (err) {
      task.status = "error";
      task.error = getErrorMessage(err);
      task.completedAt = Date.now();
    }
  }

  /**
   * 提取任務結果
   * Extract task result
   *
   * 從 session messages 中取得最後的 assistant 回應
   * Gets last assistant response from session messages
   *
   * @param task - 任務物件
   */
  private async extractResult(task: BackgroundTask): Promise<void> {
    try {
      const messages = await this.ctx.client.session.messages({
        path: { id: task.sessionId },
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

  /**
   * 通知父 session 任務完成
   * Notify parent session of task completion
   *
   * 顯示 toast 通知使用者任務已完成
   * Shows toast notification to user that task is complete
   *
   * @param task - 任務物件
   */
  private async notifyParent(task: BackgroundTask): Promise<void> {
    /**
     * 計算任務執行時長
     * Calculate task execution duration
     */
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
      /**
       * TUI 可能不可用（無圖形介面）
       * TUI might not be available (non-graphical environment)
       */
    }
  }

  /** 取得指定任務 / Get specific task */
  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  /** 取得所有任務 / Get all tasks */
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 取得特定父 session 的所有任務
   * Get all tasks for a specific parent session
   *
   * @param sessionId - 父 session ID
   */
  getTasksForSession(sessionId: string): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(
      (t) => t.parentSessionId === sessionId
    );
  }

  /**
   * 取消任務
   * Cancel task
   *
   * @param taskId - 任務 ID
   * @returns 是否成功取消
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") return false;

    try {
      await this.ctx.client.session.abort({ path: { id: task.sessionId } });
    } catch (error) {
      this.ctx.client.app.log?.({
        body: {
          service: "arise",
          level: "warn",
          message: `Failed to abort session ${task.sessionId}: ${getErrorMessage(error)}`,
        },
      });
    }

    task.status = "error";
    task.error = "Cancelled";
    task.completedAt = Date.now();
    return true;
  }

  /**
   * 處理事件
   * Handle events
   *
   * 監聽 session.idle 事件以標記任務完成
   * Listen for session.idle events to mark tasks as complete
   *
   * @param event - 事件物件
   */
  handleEvent(event: Event): void {
    if (event.type === "session.idle") {
      const sessionId = (event as { properties?: { sessionID?: string } }).properties?.sessionID;
      if (sessionId) {
        /**
         * 找出對應的任務並觸發輪詢檢查
         * Find corresponding task and trigger polling check
         *
         * 這確保即使主動事件觸發，任務也能正確完成
         * This ensures tasks are correctly completed even when triggered by active events
         */
        for (const task of this.tasks.values()) {
          if (task.sessionId === sessionId && task.status === "running") {
            this.pollTaskCompletion(task.id);
          }
        }
      }
    }
  }
}
