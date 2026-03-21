/**
 * 建立對話壓縮保留 Hook
 * Create compaction preserver hook
 *
 * 在 OpenCode 進行對話壓縮時提供保留規則提示
 * Provides preservation rule hints when OpenCode performs conversation compaction
 *
 * @returns 對話壓縮保留 Hook 物件
 */
export function createCompactionPreserverHook() {
  return {
    /**
     * 取得保留上下文
     * Get preservation context
     *
     * 返回對話壓縮時應該保留和修剪的內容規則
     * Returns rules for what to preserve and prune during conversation compaction
     *
     * @returns 保留規則字串
     */
    getPreservationContext(): string {
      return `[opencode-arise] Compaction preservation rules:
- PRESERVE: All TODO items (pending, in_progress, completed)
- PRESERVE: Key decisions and assumptions made
- PRESERVE: File paths that were touched/edited
- PRESERVE: Commands run and their key outputs (especially errors)
- PRESERVE: Shadow delegations and their results
- PRUNE: Verbose tool outputs (grep results, large file contents)
- PRUNE: Repetitive exploration that didn't yield results

Summarize work done, but keep enough context for the Monarch to continue.`;
    },
  };
}
