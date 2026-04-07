# 持久化協作 Session 設計文件
# Persistent Collaboration Session Design Document

## 1. 問題陳述 / Problem Statement

### 現況 (Current State)

目前 `arise_collaborate` 的 **planning 模式** 每回合都建立全新的 session：

```
Round 1: create session → launch prompt → wait → collect response
Round 2: create session → launch prompt → wait → collect response  ← 重複建立
Round 3: create session → launch prompt → wait → collect response  ← 重複建立
...
```

### 問題 (Problems)

| 問題 | 說明 |
|------|------|
| **Token 浪費** | 每回合都透過 `buildPromptWithDiscussionHistory()` 將所有歷史回應塞進 prompt，造成大量 token 重複消耗 |
| **Context 斷裂** | 每次新 session 都是獨立對話，agent 無法延續上下文理解，只能依賴 prompt 中的文字摘要 |
| **Session 膨脹** | 5 個 agent × 8 回合 = 40 個 session，管理成本高且難以追蹤 |
| **無法持續對話** | 使用者無法在協作中途介入或追加指示，只能等全部回合結束 |

### 根本原因 (Root Cause)

`BackgroundManager.launch()` 已支援 `existingSessionId` 參數，但 `executePlanningMode` 從未使用它。

---

## 2. 設計目標 / Design Goals

| 目標 | 說明 |
|------|------|
| **Token 節省** | 同一 session 內持續對話，利用 LLM 的原生 context window，不再手動拼接歷史 |
| **上下文連續** | Agent 在同一 session 內保有完整對話歷史，理解前因後果 |
| **可持續協作** | 支援跨多次工具呼叫的同一協作 session，直到使用者明確結束 |
| **向後相容** | 不破壞現有 API，新增 `session_id` 可選參數 |

---

## 3. 架構設計 / Architecture Design

### 3.1 核心概念

引入 **CollaborationSession** 概念，作為協作的持久化容器：

```
┌─────────────────────────────────────────────────────────┐
│                  CollaborationSession                    │
│                                                          │
│  id: "collab_xxx"                                        │
│  mode: "planning"                                        │
│  shadows: [beru#001, bellion#001, tank#001]             │
│  prompt: "分析效能問題..."                                │
│  status: "active"                                        │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Per-Agent Session Map                 │  │
│  │                                                    │  │
│  │  beru#001    → sessionId: "ses_beru_001"          │  │
│  │  bellion#001 → sessionId: "ses_bellion_001"       │  │
│  │  tank#001    → sessionId: "ses_tank_001"          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  round: 3 / 8                                            │
│  allResponses: [...]                                     │
│  createdAt: 1712345678                                   │
│  lastActivityAt: 1712345900                              │
│  totalRounds: 8                                          │
│  maxConcurrent: 2                                        │
│  roundTimeoutMs: 180000                                  │
│  description?: "效能分析會議"                              │
│  config: IAriseConfig                                    │
│  parentSessionId: "ses_parent_xxx"                       │
│  context: ToolContext                                    │
│  model?: string                                          │
│  perAgentRounds?: number                                 │
│  terminationMarkers: EnumCollaborateTermination[]        │
│  terminatedBy?: EnumCollaborateTermination               │
│  terminatedAt?: number                                   │
│  terminationReason?: string                              │
│  finalSummary?: string                                   │
│  terminationCheckCount?: number                          │
│  perAgentRoundCount: Map<string, number>                 │
│  roundResponses: Map<number, Map<string, string>>        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Round History                         │  │
│  │                                                    │  │
│  │  Round 1:                                          │  │
│  │    beru#001: "我認為..."                           │  │
│  │    bellion#001: "我建議..."                        │  │
│  │    tank#001: "根據文檔..."                         │  │
│  │                                                    │  │
│  │  Round 2:                                          │  │
│  │    beru#001: "同意 bellion..."                     │  │
│  │    bellion#001: "補充說明..."                      │  │
│  │    tank#001: "找到相關 API..."                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 生命週期 (Lifecycle)

```
創建 (create)
    │
    ▼
啟動 (start) ──→ 執行回合 (execute round)
    │                  │
    │                  ▼
    │            檢查終止條件
    │                  │
    │         ┌────────┴────────┐
    │         ▼                 ▼
    │    [繼續]              [終止]
    │         │                 │
    │         ▼                 ▼
    │    下一回合           完成 (complete)
    │                             │
    ▼                             ▼
繼續 (continue) ──→ 執行額外回合     清理 (cleanup)
```

### 3.3 狀態機 (State Machine)

```
                    create
  [idle] ──────────────────→ [active]
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
               [executing]  [paused]   [terminating]
                    │           │           │
                    ▼           │           ▼
               [active] ◄──────┘       [completed]
                                            │
                                            ▼
                                        [cleaned]
```

### 3.4 兩種使用模式 (Two Usage Modes)

#### 模式 A：一次性（現有行為，向後相容）

```json
{
  "mode": "planning",
  "shadows": ["beru", "bellion"],
  "prompt": "分析效能問題"
}
```

行為不變：建立 session → 執行所有回合 → 返回結果 → 自動清理。

#### 模式 B：持久化（新功能）

```json
// 第一次呼叫：創建協作 session
{
  "mode": "planning",
  "shadows": ["beru", "bellion"],
  "prompt": "分析效能問題",
  "persistent": true
}
// 回傳: { session_id: "collab_xxx", status: "active", round: 1, ... }

// 後續呼叫：繼續同一協作 session
{
  "session_id": "collab_xxx"
}
// 回傳: { session_id: "collab_xxx", status: "active", round: 3, ... }

// 結束協作 session
{
  "session_id": "collab_xxx",
  "end_session": true
}
// 回傳: { session_id: "collab_xxx", status: "completed", final_summary: ... }
```

---

## 4. 實作細節 / Implementation Details

### 4.1 新增檔案

#### `src/tools/lib/collaboration-session.ts`

```typescript
/**
 * 協作 Session 管理器
 * Collaboration Session Manager
 *
 * 管理持久化的協作 session 生命週期
 * Manages the lifecycle of persistent collaboration sessions
 */

import { EnumCollaborateMode, EnumCollaborateTermination } from "../../types/enums";
import type { INormalizedCollaborateShadowEntry } from "./arise-collaborate-normalizer";
import type { ToolContext } from "@opencode-ai/plugin";
import type { IAriseConfig } from "../../config/schema";

/**
 * 協作 Session 狀態
 * Collaboration session status
 */
export enum EnumCollaborationSessionStatus
{
	/** 閒置，等待繼續 / Idle, waiting to continue */
	Idle = "idle",
	/** 執行中 / Executing */
	Executing = "executing",
	/** 已暫停 / Paused */
	Paused = "paused",
	/** 已完成 / Completed */
	Completed = "completed",
	/** 已取消 / Cancelled */
	Cancelled = "cancelled",
}

/**
 * 協作 Session 物件
 * Collaboration session object
 */
export interface ICollaborationSession
{
	/** Session 唯一識別符 / Session unique identifier */
	id: string;
	/** 協作模式 / Collaboration mode */
	mode: EnumCollaborateMode;
	/** 正規化的 Shadows 列表 / Normalized shadows list */
	shadows: INormalizedCollaborateShadowEntry[];
	/** 任務提示 / Task prompt */
	prompt: string;
	/** 任務描述 / Task description */
	description?: string;
	/** 狀態 / Status */
	status: EnumCollaborationSessionStatus;
	/** 目前回合數 / Current round number */
	currentRound: number;
	/** 總回合數 / Total rounds */
	totalRounds: number;
	/** 最大並行數 / Max concurrent */
	maxConcurrent: number;
	/** 回合超時（毫秒）/ Round timeout (ms) */
	roundTimeoutMs: number;
	/** 每個 agent 回合數 / Per-agent rounds */
	perAgentRounds?: number;
	/** 每個 agent 已執行回合數 / Per-agent executed rounds */
	perAgentRoundCount: Map<string, number>;
	/** 所有回應歷史 / All response history */
	allResponses: string[];
	/** 回合回應記錄（round → agent label → response）/ Round responses */
	roundResponses: Map<number, Map<string, string>>;
	/** 每個 agent 的 session ID 映射 / Per-agent session ID mapping */
	agentSessionIds: Map<string, string>;
	/** 父 Session ID / Parent session ID */
	parentSessionId: string;
	/** 工具上下文 / Tool context */
	context: ToolContext;
	/** Arise 配置 / Arise config */
	config: IAriseConfig;
	/** 指定模型 / Specified model */
	model?: string;
	/** 創建時間 / Created timestamp */
	createdAt: number;
	/** 最後活動時間 / Last activity timestamp */
	lastActivityAt: number;
	/** 終止標記列表 / Termination markers detected */
	terminationMarkers: EnumCollaborateTermination[];
	/** 是否被終止 / Whether terminated */
	terminated: boolean;
	/** 終止類型 / Termination type */
	terminatedBy?: EnumCollaborateTermination;
	/** 終止時間 / Termination timestamp */
	terminatedAt?: number;
	/** 終止原因 / Termination reason */
	terminationReason?: string;
	/** 最終摘要 / Final summary */
	finalSummary?: string;
}

/**
 * 協作 Session 管理器（全域單例）
 * Collaboration session manager (global singleton)
 *
 * 管理所有持久化協作 session 的生命週期
 * Manages the lifecycle of all persistent collaboration sessions
 */
export class CollaborationSessionManager
{
	/** Session 儲存 / Session storage */
	private sessions: Map<string, ICollaborationSession> = new Map();

	/**
	 * 產生唯一 session ID
	 * Generate unique session ID
	 */
	private generateSessionId(): string
	{
		return `collab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
	}

	/**
	 * 創建新的協作 session
	 * Create new collaboration session
	 *
	 * @param opts - 創建選項
	 * @returns 創建的 session
	 */
	create(opts: {
		mode: EnumCollaborateMode;
		shadows: INormalizedCollaborateShadowEntry[];
		prompt: string;
		description?: string;
		totalRounds: number;
		maxConcurrent: number;
		roundTimeoutMs: number;
		perAgentRounds?: number;
		parentSessionId: string;
		context: ToolContext;
		config: IAriseConfig;
		model?: string;
	}): ICollaborationSession
	{
		const id = this.generateSessionId();
		const now = Date.now();

		const session: ICollaborationSession = {
			id,
			mode: opts.mode,
			shadows: opts.shadows,
			prompt: opts.prompt,
			description: opts.description,
			status: EnumCollaborationSessionStatus.Idle,
			currentRound: 0,
			totalRounds: opts.totalRounds,
			maxConcurrent: opts.maxConcurrent,
			roundTimeoutMs: opts.roundTimeoutMs,
			perAgentRounds: opts.perAgentRounds,
			perAgentRoundCount: new Map(),
			allResponses: [],
			roundResponses: new Map(),
			agentSessionIds: new Map(),
			parentSessionId: opts.parentSessionId,
			context: opts.context,
			config: opts.config,
			model: opts.model,
			createdAt: now,
			lastActivityAt: now,
			terminationMarkers: [],
			terminated: false,
		};

		this.sessions.set(id, session);

		return session;
	}

	/**
	 * 取得 session
	 * Get session
	 *
	 * @param sessionId - Session ID
	 * @returns session 或 undefined
	 */
	get(sessionId: string): ICollaborationSession | undefined
	{
		return this.sessions.get(sessionId);
	}

	/**
	 * 列出所有 session
	 * List all sessions
	 *
	 * @param filter - 可選的過濾器
	 * @returns session 列表
	 */
	list(filter?: { status?: EnumCollaborationSessionStatus }): ICollaborationSession[]
	{
		const sessions = Array.from(this.sessions.values());
		if (!filter) return sessions;
		if (filter.status) return sessions.filter(s => s.status === filter.status);
		return sessions;
	}

	/**
	 * 刪除 session
	 * Delete session
	 *
	 * @param sessionId - Session ID
	 * @returns 是否成功刪除
	 */
	delete(sessionId: string): boolean
	{
		return this.sessions.delete(sessionId);
	}

	/**
	 * 清理已完成的 session
	 * Clean up completed sessions
	 *
	 * @param maxAgeMs - 最大存活時間（毫秒），預設 1 小時
	 * @returns 清理的 session 數量
	 */
	cleanupOldSessions(maxAgeMs: number = 3600000): number
	{
		const now = Date.now();
		let count = 0;

		for (const [id, session] of this.sessions)
		{
			if (
				(session.status === EnumCollaborationSessionStatus.Completed ||
				 session.status === EnumCollaborationSessionStatus.Cancelled) &&
				(now - session.lastActivityAt) > maxAgeMs
			)
			{
				this.sessions.delete(id);
				count++;
			}
		}

		return count;
	}

	/**
	 * 取得統計資訊
	 * Get statistics
	 */
	getStats(): {
		total: number;
		active: number;
		completed: number;
		cancelled: number;
	}
	{
		const sessions = Array.from(this.sessions.values());
		return {
			total: sessions.length,
			active: sessions.filter(s => s.status === EnumCollaborationSessionStatus.Idle || s.status === EnumCollaborationSessionStatus.Executing).length,
			completed: sessions.filter(s => s.status === EnumCollaborationSessionStatus.Completed).length,
			cancelled: sessions.filter(s => s.status === EnumCollaborationSessionStatus.Cancelled).length,
		};
	}
}

/**
 * 全域單例
 * Global singleton
 */
export const collaborationSessionManager = new CollaborationSessionManager();
```

### 4.2 修改現有檔案

#### 4.2.1 `src/tools/arise-collaborate.ts`

**新增參數：**

```typescript
interface ICollaborateArgs
{
	mode: EnumCollaborateMode;
	shadows: { ... }[];
	prompt: string;
	description?: string;
	total_rounds?: number;
	max_concurrent?: number;
	round_timeout_ms?: number;
	per_agent_rounds?: number;

	// === 新增欄位 / New fields ===

	/** 是否創建持久化 session / Whether to create persistent session */
	persistent?: boolean;

	/** 現有 session ID（繼續協作）/ Existing session ID (continue collaboration) */
	session_id?: string;

	/** 結束 session / End session */
	end_session?: boolean;

	/** 暫停 session / Pause session */
	pause_session?: boolean;

	/** 恢復 session / Resume session */
	resume_session?: boolean;
}
```

**修改主 execute 邏輯：**

```typescript
async execute(args, context: ToolContext)
{
	// === 新增：Session 操作優先 ===
	// === New: Session operations take priority ===

	// 結束 session
	if (args.end_session && args.session_id)
	{
		return await executeEndSession(args.session_id);
	}

	// 列出 session
	if (!args.mode && !args.session_id)
	{
		return executeListSessions();
	}

	// 繼續現有 session
	if (args.session_id)
	{
		const session = collaborationSessionManager.get(args.session_id);
		if (!session)
		{
			return formatAriseMsgError(`Session not found: ${args.session_id}`);
		}

		if (args.pause_session)
		{
			return executePauseSession(session);
		}

		if (args.resume_session || !args.end_session)
		{
			return await executeContinueSession(session);
		}
	}

	// 原有邏輯：創建新協作
	// Original logic: create new collaboration
	const validatedArgs = validateCollaborateArgs(args);
	const collaborateConfig = resolveCollaborateConfig(config, validatedArgs);

	// 如果要求持久化，創建 session 並執行
	// If persistent requested, create session and execute
	if (args.persistent)
	{
		return await executePersistentCollaboration(collaborateConfig, context);
	}

	// 原有的一次性行為
	// Original one-time behavior
	let result: string;
	switch (collaborateConfig.mode)
	{
		case EnumCollaborateMode.PLANNING:
			result = await executePlanningMode(backgroundManager, collaborateConfig, context);
			break;
		// ... 其他模式不變
	}
	return result;
}
```

#### 4.2.2 修改 `executePlanningMode` — 核心改動

**現有問題程式碼（每次建立新 session）：**

```typescript
// ❌ 現有：每回合建立新 session
const promptWithContext = buildPromptWithDiscussionHistory(
	config.prompt,
	allResponses,  // ← 手動拼接所有歷史
	config.shadows,
);

const task = await launchShadowTask(
	backgroundManager,
	entry.agent,
	promptWithContext,  // ← 包含大量歷史文字
	config.description ?? `planning round ${round}`,
	context,
	entry.model,
);
```

**修改後（使用持久化 session）：**

```typescript
// ✅ 修改後：使用現有 session 或建立新 session
let sessionId = session.agentSessionIds.get(entry.label);

if (!sessionId)
{
	// 第一次：建立新 session（僅建立，不拼接歷史）
	const task = await launchShadowTask(
		backgroundManager,
		entry.agent,
		config.prompt,  // ← 只有原始 prompt，無歷史拼接
		config.description ?? `planning round 1`,
		context,
		entry.model,
	);
	sessionId = task.sessionId;
	session.agentSessionIds.set(entry.label, sessionId);
}
else
{
	// 後續回合：在同一 session 繼續對話
	const task = await launchShadowTask(
		backgroundManager,
		entry.agent,
		buildNextTurnPrompt(response, round, session),
		config.description ?? `planning round ${round}`,
		context,
		entry.model,
		sessionId,  // ← 重用現有 session
	);
}
```

**關鍵差異：**

| 項目 | 現有方式 | 持久化方式 |
|------|---------|-----------|
| Session 建立 | 每次回合都建立 | 每個 agent 只建立一次 |
| 歷史傳遞 | 手動拼接 prompt | LLM 原生 context window |
| Token 消耗 | O(n²) 隨回合增長 | O(n) 線性增長 |
| 上下文品質 | 文字摘要，可能遺失細節 | 完整對話歷史 |

#### 4.2.3 修改 `launchShadowTask`

```typescript
// 新增 existingSessionId 參數
async function launchShadowTask(
	backgroundManager: BackgroundManager,
	shadow: string,
	prompt: string,
	description: string,
	context: ToolContext,
	model?: string,
	existingSessionId?: string,  // ← 新增
)
{
	return backgroundManager.launch({
		shadow,
		prompt,
		description,
		parentSessionId: context.sessionID,
		model,
		existingSessionId,  // ← 傳遞現有 session
	});
}
```

### 4.3 新增工具操作

#### 4.3.1 繼續協作 (`session_id` 模式)

```typescript
async function executeContinueSession(
	session: ICollaborationSession,
): Promise<string>
{
	if (session.status === EnumCollaborationSessionStatus.Completed)
	{
		return formatAriseMsgError(
			`Session ${session.id} is already completed. Create a new session to start fresh.`,
		);
	}

	if (session.terminated)
	{
		return formatAriseMsgSuccessMultiLine(
			`Session already terminated: ${session.terminatedBy}`,
			`Reason: ${session.terminationReason ?? "No reason provided"}`,
		);
	}

	// 執行下一回合
	const result = await executeNextRound(session);

	session.lastActivityAt = Date.now();

	return formatAriseMsgSuccessMultiLine(
		`Collaboration continued: Round ${session.currentRound}/${session.totalRounds}`,
		buildSessionStatusDetails(session),
	);
}
```

#### 4.3.2 結束協作

```typescript
async function executeEndSession(sessionId: string): Promise<string>
{
	const session = collaborationSessionManager.get(sessionId);
	if (!session)
	{
		return formatAriseMsgError(`Session not found: ${sessionId}`);
	}

	session.status = EnumCollaborationSessionStatus.Completed;
	session.terminated = true;
	session.terminatedBy = EnumCollaborateTermination.STOP;
	session.terminatedAt = Date.now();
	session.terminationReason = "Manually ended by user";

	// 產生最終摘要
	session.finalSummary = buildFinalSummary(session);

	return formatAriseMsgSuccessMultiLine(
		`Collaboration session ended: ${session.id}`,
		buildSessionEndDetails(session),
	);
}
```

#### 4.3.3 列出協作 Session

```typescript
function executeListSessions(): string
{
	const sessions = collaborationSessionManager.list();
	if (sessions.length === 0)
	{
		return formatAriseMsgSuccessMultiLine(
			"No active collaboration sessions",
			"Use persistent: true to create one",
		);
	}

	const sessionList = sessions.map(s =>
		`- ${s.id} | ${s.mode} | Round ${s.currentRound}/${s.totalRounds} | ${s.status} | ${s.shadows.map(e => e.label).join(", ")}`
	).join("\n");

	return formatAriseMsgSuccessMultiLine(
		`Active collaboration sessions: ${sessions.length}`,
		sessionList,
	);
}
```

---

## 5. Token 節省分析 / Token Savings Analysis

### 現有方式（手動拼接歷史）

```
Round 1: prompt(100) + response(200) = 300 tokens
Round 2: prompt(100) + history(300) + response(200) = 600 tokens
Round 3: prompt(100) + history(600) + response(200) = 900 tokens
Round 4: prompt(100) + history(900) + response(200) = 1200 tokens
...
Round 8: prompt(100) + history(2100) + response(200) = 2400 tokens

總計: 300 + 600 + 900 + ... + 2400 = O(n²) = ~10,800 tokens
```

### 持久化方式（原生 context）

```
Round 1: prompt(100) + response(200) = 300 tokens
Round 2: continue(10) + response(200) = 210 tokens
Round 3: continue(10) + response(200) = 210 tokens
...
Round 8: continue(10) + response(200) = 210 tokens

總計: 300 + 210 × 7 = ~1,770 tokens
```

### 節省比例

| 回合數 | 現有方式 | 持久化方式 | 節省 |
|--------|---------|-----------|------|
| 4 回合 | ~3,000 | ~930 | **69%** |
| 8 回合 | ~10,800 | ~1,770 | **84%** |
| 15 回合 | ~36,000 | ~3,310 | **91%** |

---

## 6. 向後相容性 / Backward Compatibility

| 項目 | 處理方式 |
|------|---------|
| 現有 API | 完全保留，不改變任何現有參數的預設行為 |
| 新增參數 | 全部可選 (`?`)，不傳入時行為與現在完全相同 |
| 測試 | 現有測試不需修改，新增測試覆蓋新功能 |

---

## 7. 實作階段 / Implementation Phases

### Phase 1: 基礎設施

- [ ] 建立 `src/tools/lib/collaboration-session.ts`
- [ ] 在 `BackgroundManager` 確認 `existingSessionId` 參數通路
- [ ] 新增 `EnumCollaborationSessionStatus` 到 `enums.ts`

### Phase 2: 修改 Planning 模式

- [ ] 修改 `executePlanningMode` 支援 session 重用
- [ ] 修改 `launchShadowTask` 接受 `existingSessionId`
- [ ] 新增 `buildNextTurnPrompt` 輔助函式

### Phase 3: 新增工具操作

- [ ] 修改 `ICollaborateArgs` 新增欄位
- [ ] 實作 `executeContinueSession`
- [ ] 實作 `executeEndSession`
- [ ] 實作 `executePauseSession`
- [ ] 實作 `executeListSessions`

### Phase 4: 測試與文件

- [ ] 新增單元測試
- [ ] 更新 `docs/features/arise-collaborate.md`
- [ ] 更新 `src/agents/shadows.ts` 工具定義

---

## 8. 風險與緩解 / Risks & Mitigations

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Session 記憶體洩漏 | 長時間運行後記憶體增長 | 自動清理已完成 session（預設 1 小時） |
| Context window 溢出 | LLM 達到 token 上限 | 監控 session 長度，必要時壓縮歷史 |
| 並行衝突 | 多次呼叫同一 session 導致狀態不一致 | Session 狀態機確保原子操作 |
| 向後相容破壞 | 現有功能受損 | 所有新參數可選，預設行為不變 |

---

## 9. 替代方案評估 / Alternative Approaches Considered

### 方案 A：提示詞壓縮 (Prompt Compression)

- **做法**：使用 LLM 將歷史回應壓縮為摘要，減少 token
- **缺點**：壓縮過程本身消耗 token，且可能遺失重要細節
- **結論**：不如持久化 session 直接

### 方案 B：外部記憶庫 (External Memory)

- **做法**：將歷史存入外部儲存，每次只傳入相關片段
- **缺點**：實作複雜度高，需要 RAG 機制
- **結論**：過度設計，持久化 session 已足夠

### 方案 C：減少回合數 (Reduce Rounds)

- **做法**：降低預設回合數
- **缺點**：治標不治本，無法解決根本問題
- **結論**：可作為輔助策略，但不是主要解決方案

---

## 10. 相關檔案影響 / Affected Files

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `src/tools/lib/collaboration-session.ts` | **新增** | Session 管理器 |
| `src/tools/arise-collaborate.ts` | **修改** | 新增 session 操作邏輯 |
| `src/tools/lib/background-manager.ts` | **不需修改** | 已支援 `existingSessionId` |
| `src/types/enums.ts` | **修改** | 新增 `EnumCollaborationSessionStatus` |
| `src/agents/shadows.ts` | **修改** | 更新工具定義 |
| `docs/features/arise-collaborate.md` | **修改** | 新增持久化使用說明 |
| `src/tools/lib/arise-collaborate-validator.ts` | **不需修改** | 驗證邏輯不受影響 |
| `src/tools/lib/arise-collaborate-termination.ts` | **不需修改** | 終止標記解析不受影響 |
| `src/tools/lib/arise-collaborate-normalizer.ts` | **不需修改** | Shadow 正規化不受影響 |
