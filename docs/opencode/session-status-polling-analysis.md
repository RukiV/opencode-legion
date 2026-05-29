# OpenCode Session Status 輪詢機制分析 / Session Status Polling Analysis

分析 OpenCode `client.session.status` API 對 `opencode-arise` 的 `pollTaskCompletion` 輪詢效率的影響。
Analysis of how the OpenCode `client.session.status` API affects `pollTaskCompletion` polling efficiency in `opencode-arise`.

---

## 問題背景 / Background

`pollTaskCompletion` 在 `src/tools/lib/background-manager.ts` 中每 `poll_interval` 毫秒輪詢一次，檢查背景任務是否完成：

```typescript
const statusResult = await this.ctx.client.session.status({});
const statuses = statusResult.data; // { [sessionID: string]: SessionStatus }
if (statuses && task.sessionId in statuses) { ... }
```

## API 限制 / API Limitation

OpenCode 的 HTTP API `GET /session/status` **不支援單一 session 查詢**。回應永遠是所有 session 的狀態 map。

```typescript
// 內部服務有單查，但不暴露於 HTTP
interface Interface {
  readonly get: (sessionID) => Effect.Effect<Info>  // ❌ 不暴露
  readonly list: () => Effect.Effect<Map<...>>       // ✅ HTTP API 使用此方法
}
```

> 參考：`packages/opencode/src/session/status.ts` L51, L184

## 記憶體管理補償 / Memory Management Compensation

OpenCode 內部在 status 設為 `idle` 時**自動從 map 移除**：

```typescript
const set = Effect.fn("SessionStatus.set")(function* (sid, status) {
  if (status.type === "idle") {
    data.delete(sid);  // ← 自動清理
    return;
  }
  data.set(sid, status);  // 只保留 busy/retry
})
```

> 參考：`packages/opencode/src/session/status.ts` L77-86, L198-201

**結論**：雖然 API 回傳所有 session，但 idle sessions 已被自動移除。回應只包含 busy/retry 狀態，在一般場景下數量很小（通常 < 10）。

## 狀態轉換流程 / State Machine

```
idle  ──→ busy  (開始處理 / run-state, prompt, processor)
busy  ──→ idle  (完成或取消 / onIdle, 錯誤結束)
busy  ──→ retry (可重試錯誤 / SessionRetry.policy)
retry ──→ busy  (重試 / 再次進入 run loop)
retry ──→ idle  (重試耗盡或 cancel)
```

> 參考：`packages/opencode/src/session/run-state.ts`, `processor.ts`, `retry.ts`

## 現有事件整合 / Existing Event Integration

`handleEvent` 目前已監聽 `session.idle` (deprecated)：

```typescript
// src/tools/lib/background-manager.ts
handleEvent(event: Event): void {
  if (isEventWithType(event, EnumOpenCodeEventType.SessionIdle)) {
    // 找出對應任務並觸發 pollTaskCompletion
  }
}
```

## 未來優化方向 / Future Optimization

| 方案 | 延遲 | 資源 | 複雜度 |
|------|------|------|--------|
| **當前**：`setTimeout` 輪詢 `session.status({})` | `poll_interval` (2000ms) | 定時呼叫 API | 低 |
| **Event**：訂閱 SSE `session.status` event | 即時 (~0ms) | 零主動查詢 | 中（需處理 SSE 連線管理） |

SSE event 在每次 `set()` 時自動推送：

```
每次 status.set() → 推送 "session.status" SSE event { sessionID, status }
```

改用 SSE 可消除輪詢延遲和 API 呼叫開銷，但需要：
1. 管理 SSE 連線生命週期
2. 替換 `session.idle` (deprecated) 為 `session.status`
3. 將 polling-based 邏輯改為 event-driven

> 此為獨立改進項目，不在本次 auto-resume 機制優化範圍內。

## 參考 / References

- `D:/Users/WebstormProjects/ai-agent/opencode/packages/opencode/src/session/status.ts`
- `D:/Users/WebstormProjects/ai-agent/opencode/packages/opencode/src/session/retry.ts`
- `D:/Users/WebstormProjects/ai-agent/opencode/packages/opencode/src/session/run-state.ts`
- Obsidian: `raw/opencode/session/client-session-status-mechanism.md`
