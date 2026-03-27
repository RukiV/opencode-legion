import type { PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import {
	DEFAULT_POLL_INTERVAL,
	DEFAULT_RETRY_DELAY_INCREMENT,
	DEFAULT_RETRY_DELAY_MAX,
	getPollInterval,
	getRetryDelayIncrement,
	getRetryDelayMax,
	getAutoResumeConfig,
	getAutoResumeEnabled,
} from "../config/schema";
import type { IAriseConfig } from "../config/schema";
import { IAllShadowAgentsName } from "../types/enums";
import { getErrorMessage } from "../utils/error";
import { resolveModelContext } from "../utils/model-resolver";
import { getSessionModel } from "../config/model-cache";

/**
 * === 配置取得說明 / Configuration Getter Guide ===
 *
 * 本檔案使用的配置應透過 schema.ts 中的 getter 函式取得，以支援 per-agent 覆寫。
 * Configuration used in this file should be obtained via getter functions from schema.ts to support per-agent overrides.
 *
 * 已實作的 getter（使用 _createConfigGetter）：
 * Implemented getters (using _createConfigGetter):
 * - getPollInterval(config, agentName?) -> number
 * - getRetryDelayIncrement(config, agentName?) -> number
 * - getRetryDelayMax(config, agentName?) -> number
 * - getAutoResumeConfig(config, agentName?) -> auto_resume 物件 / object
 * - getAutoResumeEnabled(config, agentName?) -> boolean
 *
 * 使用範例 / Usage example:
 *   const pollInterval = getPollInterval(config, "beru");
 *   const autoResume = getAutoResumeConfig(config, "igris");
 *
 * 注意 / Note:
 * - _createConfigGetter 僅適用於簡單數值類型 / _createConfigGetter is for simple scalar values
 * - 複雜物件（如 auto_resume）需客製化 getter / Complex objects (like auto_resume) need custom getters
 * - 優先順序：agents[agentName].property -> background.property -> 預設值 / Priority: agents[agentName].property -> background.property -> default
 */

/**
 * Auto-resume 錯誤處理行為
 * Auto-resume error handling behavior
 *
 * - ignore: 忽略錯誤，不重試 / Ignore errors, no retry
 * - retry: 自動重試 / Auto retry
 * - notify: 通知但等待手動處理 / Notify but wait for manual handling
 */
type AutoResumeOnError = "ignore" | "retry" | "notify";

/**
 * Auto-resume 目標類型
 * Auto-resume target type
 *
 * - background: 只對背景任務 / Only for background tasks
 * - all: 所有任務 / All tasks
 */
type AutoResumeTarget = "background" | "all";

/**
 * Auto-resume 配置介面
 * Auto-resume configuration interface
 */
interface AutoResumeConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  onError: AutoResumeOnError;
  target: AutoResumeTarget;
  prompts?: {
    retry?: string;
    final?: string;
    custom?: string[];
  };
}

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
  /** Auto-resume 重試次數 / Auto-resume retry count */
  resumeRetryCount?: number;
  /** Auto-resume 是否正在等待重試 / Auto-resume is waiting for retry */
  resumePending?: boolean;
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
  /** Auto-resume 配置取得器（支援 per-agent 覆寫）/ Auto-resume config getter (supports per-agent override) */
  private getAutoResumeConfig: (agentName?: IAllShadowAgentsName) => AutoResumeConfig;

  /**
   * 建構函式
   * Constructor
   *
   * @param ctx - Plugin 上下文
   * @param pollIntervalOrGetter - 輪詢間隔（數字或函式）
   * @param retryDelayIncrementOrGetter - 重試延遲遞增量（數字或函式）
   * @param retryDelayMaxOrGetter - 重試延遲最大值（數字或函式）
   * @param getAutoResumeConfigOrConfig - Auto-resume 配置或 getter 函式（可選）
   */
  constructor(
    ctx: PluginInput,
    pollIntervalOrGetter: number | ((agentName?: IAllShadowAgentsName) => number) = DEFAULT_POLL_INTERVAL,
    retryDelayIncrementOrGetter?: number | ((agentName?: IAllShadowAgentsName) => number),
    retryDelayMaxOrGetter?: number | ((agentName?: IAllShadowAgentsName) => number),
    getAutoResumeConfigOrConfig?: AutoResumeConfig | ((agentName?: IAllShadowAgentsName) => AutoResumeConfig)
  ) {
    this.ctx = ctx;

    /**
     * Auto-resume 配置初始化
     * Auto-resume config initialization
     *
     * 支援函式（per-agent 覆寫）或固定物件
      * Supports function (per-agent override) or fixed object
      */
    if (typeof getAutoResumeConfigOrConfig === "function") {
      this.getAutoResumeConfig = getAutoResumeConfigOrConfig;
    } else if (getAutoResumeConfigOrConfig) {
      this.getAutoResumeConfig = () => getAutoResumeConfigOrConfig;
    } else {
      /** 預設值 / Default value */
      this.getAutoResumeConfig = () => ({
        enabled: false,
        maxRetries: 3,
        retryDelay: 5000,
        onError: "ignore",
        target: "background",
        prompts: {},
      });
    }

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
   * 檢查是否應該對任務執行 auto-resume
   * Check if auto-resume should be performed on a task
   *
   * 條件：
   * 1. Auto-resume 已啟用
   * 2. 任務處於 error 狀態
   * 3. 未超過最大重試次數
   * 4. 目標類型符合（background 或 all）
   *
   * Conditions:
   * 1. Auto-resume is enabled
   * 2. Task is in error status
   * 3. Has not exceeded max retry count
   * 4. Target type matches (background or all)
   *
   * @param task - 背景任務
   * @returns 是否應該執行 auto-resume
   */
  private shouldAutoResume(task: BackgroundTask): boolean {
    /**
     * 首先檢查 auto-resume 是否啟用
     * First check if auto-resume is enabled
     */
    if (!this.getAutoResumeConfig()?.enabled) {
      return false;
    }

    /**
     * 檢查任務是否處於 error 狀態
     * Check if task is in error status
     */
    if (task.status !== "error") {
      return false;
    }

    /**
     * 檢查目標類型是否符合
     * Check if target type matches
     *
     * target = "background" 只對背景任務（(parentSessionId !== sessionId）生效
     * target = "background" only applies to background tasks (parentSessionId !== sessionId)
     * target = "all" 對所有任務生效
     * target = "all" applies to all tasks
     */
    if (this.getAutoResumeConfig()?.target === "background") {
      // 背景任務的 parentSessionId 不同於 sessionId
      // Background task has different parentSessionId from sessionId
      if (task.parentSessionId === task.sessionId) {
        return false;
      }
    }

    /**
     * 檢查是否已超過最大重試次數
     * Check if max retry count exceeded
     */
    const currentRetryCount = task.resumeRetryCount ?? 0;
    if (currentRetryCount >= (this.getAutoResumeConfig()?.maxRetries ?? 3)) {
      return false;
    }

    /**
     * 檢查錯誤處理行為
     * Check error handling behavior
     *
     * onError = "ignore" 時不進行 auto-resume
     * onError = "ignore" means no auto-resume
     */
    if (this.getAutoResumeConfig()?.onError === "ignore") {
      return false;
    }

    return true;
  }

  /**
   * 執行 auto-resume
   * Perform auto-resume
   *
   * 重新執行失敗的任務
   * Re-execute failed task
   *
   * @param task - 要重試的任務
   */
  private async performAutoResume(task: BackgroundTask): Promise<void> {
    /**
     * 標記任務為即將重試
     * Mark task as about to retry
     *
     * 防止重複觸發
     * Prevent duplicate triggers
     */
    task.resumePending = true;

    /**
     * 記錄重試嘗試
     * Log retry attempt
     */
    this.ctx.client.app.log?.({
      body: {
        service: "arise",
        level: "info",
        message: `[Auto-resume] Retrying task ${task.id}, attempt ${(task.resumeRetryCount ?? 0) + 1}/${this.getAutoResumeConfig()?.maxRetries ?? 3}`,
      },
    });

    /**
     * 等待配置的重試延遲
     * Wait for configured retry delay
     */
    await new Promise((resolve) => setTimeout(resolve, this.getAutoResumeConfig()?.retryDelay ?? 5000));

    /**
     * 重置 pending 狀態並增加重試計數
     * Reset pending status and increment retry count
     */
    task.resumePending = false;
    task.resumeRetryCount = (task.resumeRetryCount ?? 0) + 1;

    /**
     * 重新建立 session 並執行任務
     * Re-create session and execute task
     *
     * 使用原來的 shadow、prompt、description 等參數
     * Use original shadow, prompt, description and other parameters
     */
    try {
      const session = await this.ctx.client.session.create({
        body: { title: `[arise:${task.id} retry ${task.resumeRetryCount}] ${task.description}` },
      });

      const newSessionId = session.data?.id;
      if (!newSessionId) {
        throw new Error("Failed to create retry session");
      }

      /**
       * 更新任務的 sessionId
       * Update task's sessionId
       */
      const oldSessionId = task.sessionId;
      task.sessionId = newSessionId;
      task.status = "running";
      task.startedAt = Date.now();
      task.error = undefined;
      task.completedAt = undefined;

      /**
       * 重新執行 prompt（非同步）
       * Re-execute prompt (async)
       *
       * 這次不等待完成，讓輪詢機制處理
       * Don't wait for completion, let polling mechanism handle it
       */
      this.ctx.client.session
        .promptAsync({
          path: { id: newSessionId },
          body: {
            agent: task.shadow,
            model: undefined, // 使用預設模型 / Use default model
            parts: [{ type: "text", text: task.description }],
          },
        })
        .then(() => this.pollTaskCompletion(task.id))
        .catch((err) => {
          /**
           * 處理 promptAsync 的錯誤
           * Handle promptAsync errors
           *
           * 標記任務為 error 並記錄錯誤訊息
           * Mark task as error and record error message
           */
          task.status = "error";
          task.error = getErrorMessage(err);
          task.completedAt = Date.now();

          /**
           * 根據 on_error 設定處理錯誤
           * Handle error based on on_error setting
           */
          if (this.getAutoResumeConfig()?.onError === "notify") {
            // 通知模式：記錄但不做進一步重試
            // Notify mode: log but don't retry further
            this.ctx.client.app.log?.({
              body: {
                service: "arise",
                level: "warn",
                message: `[Auto-resume] Task ${task.id} failed with error: ${task.error}. Waiting for manual intervention.`,
              },
            });
          } else if (this.getAutoResumeConfig()?.onError === "retry") {
            // 遞迴嘗試 auto-resume（會再次檢查 shouldAutoResume）
            // Recursively attempt auto-resume (will check shouldAutoResume again)
            this.ctx.client.app.log?.({
              body: {
                service: "arise",
                level: "warn",
                message: `[Auto-resume] Task ${task.id} retry failed: ${task.error}. Will retry again...`,
              },
            });
            this.performAutoResume(task).catch((e) => {
              this.ctx.client.app.log?.({
                body: {
                  service: "arise",
                  level: "error",
                  message: `[Auto-resume] Failed to retry task ${task.id}: ${getErrorMessage(e)}`,
                },
              });
            });
          }
        });
    } catch (error) {
      /**
       * 處理 session 建立失敗
       * Handle session creation failure
       */
      task.status = "error";
      task.error = getErrorMessage(error);
      task.completedAt = Date.now();

      this.ctx.client.app.log?.({
        body: {
          service: "arise",
          level: "error",
          message: `[Auto-resume] Failed to create retry session for task ${task.id}: ${task.error}`,
        },
      });
    }
  }

  /**
   * 更新 auto-resume 配置
   * Update auto-resume config
   *
   * @param config - 新的 auto-resume 配置
   */
  updateAutoResumeConfig(config: Partial<AutoResumeConfig>): void {
    const current = this.getAutoResumeConfig?.() ?? {
      enabled: false,
      maxRetries: 3,
      retryDelay: 5000,
      onError: "ignore" as const,
      target: "background" as const,
      prompts: {},
    };
    this.getAutoResumeConfig = () => ({
      enabled: config.enabled ?? current.enabled,
      maxRetries: config.maxRetries ?? current.maxRetries,
      retryDelay: config.retryDelay ?? current.retryDelay,
      onError: config.onError ?? current.onError,
      target: config.target ?? current.target,
    });
  }

  /**
   * 取得目前的 auto-resume 配置
   * Get current auto-resume config
   *
   * @returns 目前的 auto-resume 配置
   */
  getAutoResumeConfigCopy(): AutoResumeConfig {
    return this.getAutoResumeConfig?.() ?? {
      enabled: false,
      maxRetries: 3,
      retryDelay: 5000,
      onError: "ignore",
      target: "background",
      prompts: {},
    };
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
    model?: string;
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
     * 解析模型上下文
     * Resolve model context
     *
     * 優先順序：用戶指定 > Shadow 預設 > AUTO 使用父模型
     * Priority: User specified > Shadow default > AUTO use parent model
     */
    const parentModel = getSessionModel(opts.parentSessionId);
    const modelBody = resolveModelContext(
      parentModel,
      opts.shadow as IAllShadowAgentsName,
      undefined,
      opts.model
    );

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
          model: modelBody,
          parts: [{ type: "text", text: opts.prompt }],
        },
      })
      .then(() => this.schedulePolling(taskId, opts.shadow as IAllShadowAgentsName))
      .catch((err) => {
        task.status = "error";
        task.error = getErrorMessage(err);
        task.completedAt = Date.now();

        /**
         * 檢查是否需要執行 auto-resume
         * Check if auto-resume should be executed
         */
        if (this.shouldAutoResume(task)) {
          this.performAutoResume(task).catch((e) => {
            this.ctx.client.app.log?.({
              body: {
                service: "arise",
                level: "error",
                message: `[Auto-resume] Unexpected error in performAutoResume: ${getErrorMessage(e)}`,
              },
            });
          });
        }
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

      /**
       * 檢查是否需要執行 auto-resume
       * Check if auto-resume should be executed
       */
      if (this.shouldAutoResume(task)) {
        /**
         * 非同步執行 auto-resume，不阻塞當前流程
         * Execute auto-resume asynchronously, don't block current flow
         */
        this.performAutoResume(task).catch((e) => {
          this.ctx.client.app.log?.({
            body: {
              service: "arise",
              level: "error",
              message: `[Auto-resume] Unexpected error in performAutoResume: ${getErrorMessage(e)}`,
            },
          });
        });
      }
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

  /**
   * 手動重試任務
   * Manual retry task
   *
   * 允許 agents 主動觸發任務重試，而非等待被動 auto-resume
   * Allows agents to actively trigger task retry, instead of waiting for passive auto-resume
   *
   * @param taskId - 要重試的任務 ID
   * @param force - 是否強制重試（即使任務不在 error 狀態）
   * @returns 重試結果訊息
   */
  async manualRetry(taskId: string, force: boolean = false): Promise<string> {
    const task = this.tasks.get(taskId);

    /** 任務不存在 / Task not found */
    if (!task) {
      return `[arise] Task not found: ${taskId}`;
    }

    /** 檢查任務是否處於 error 狀態 / Check if task is in error state */
    if (task.status !== "error" && !force) {
      return `[arise] Task ${taskId} is not in error state (status: ${task.status}). Use force=true to retry anyway.`;
    }

    /** 檢查是否正在等待 auto-resume 重試 / Check if waiting for auto-resume retry */
    if (task.resumePending) {
      return `[arise] Task ${taskId} is already pending auto-resume retry. Please wait for the current retry to complete.`;
    }

    /**
     * 執行手動重試
     * Perform manual retry
     *
     * 建立新的 session 並重新執行任務
     * Create new session and re-execute task
     */
    try {
      const session = await this.ctx.client.session.create({
        body: { title: `[arise:${task.id} manual retry] ${task.description}` },
      });

      const newSessionId = session.data?.id;
      if (!newSessionId) {
        throw new Error("Failed to create retry session");
      }

      /** 更新任務資訊 / Update task info */
      task.sessionId = newSessionId;
      task.status = "running";
      task.startedAt = Date.now();
      task.error = undefined;
      task.completedAt = undefined;
      task.resumeRetryCount = (task.resumeRetryCount ?? 0) + 1;

      /** 執行 prompt / Execute prompt */
      this.ctx.client.session
        .promptAsync({
          path: { id: newSessionId },
          body: {
            agent: task.shadow,
            model: undefined,
            parts: [{ type: "text", text: task.description }],
          },
        })
        .then(() => this._publicSchedulePolling(task.id))
        .catch((err) => {
          task.status = "error";
          task.error = getErrorMessage(err);
          task.completedAt = Date.now();
        });

      return `[arise] Manual retry initiated for task ${taskId}.

Attempt: ${task.resumeRetryCount}
Description: ${task.description}
Shadow: ${task.shadow}

Use arise_background_output("${task.id}") to check the result.`;
    } catch (error) {
      const msg = getErrorMessage(error);
      return `[arise] Failed to initiate manual retry: ${msg}`;
    }
  }

  /**
   * 公開的排程輪詢方法（供外部使用）
   * Public schedule polling method (for external use)
   *
   * @param taskId - 任務 ID
   */
  private _publicSchedulePolling(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      this.schedulePolling(taskId, task.shadow as IAllShadowAgentsName);
    }
  }

  /**
   * 取得 plugin 上下文（供外部工具使用）
   * Get plugin context (for external tools)
   *
   * @returns Plugin 上下文
   */
  getContext(): PluginInput {
    return this.ctx;
  }
}
