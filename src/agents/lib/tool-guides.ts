/**
 * 工具使用指南
 * Tool Usage Guides
 */

import { BACKGROUND_SHADOWS, EnumAriseTools } from "../../types/enums";

/** ==================== 工具指南 / Tool Guides ==================== */

/**
 * 產生 Initial Test 召喚描述
 * Generate Initial Test summon description
 *
 * @param toolName - 工具名稱 / Tool name
 * @returns 格式化後的字串 / Formatted string
 */
export function getInitialTestDescription<T extends EnumAriseTools.ARISE_SYNC_SUMMON | EnumAriseTools.ARISE_ASYNC_BACKGROUND>(toolName?: T)
{
	if (toolName === EnumAriseTools.ARISE_SYNC_SUMMON)
	{
		return "Summon 1 sync (arise_summon)" as const;
	}

	if (toolName === EnumAriseTools.ARISE_ASYNC_BACKGROUND)
	{
		return "Summon 1 async (arise_background)" as const;
	}

	return "Summon 1 sync (arise_summon) + 1 async (arise_background) SEPARATELY" as const;
}

/**
 * 產生 Then decide 描述
 * Generate Then decide description
 *
 * @param toolName - 工具名稱 / Tool name
 * @returns 格式化後的字串 / Formatted string
 */
export function getThenDecideDescription<T extends EnumAriseTools.ARISE_SYNC_SUMMON | EnumAriseTools.ARISE_ASYNC_BACKGROUND>(toolName?: T)
{
	if (toolName === EnumAriseTools.ARISE_SYNC_SUMMON)
	{
		return "Then decide: use arise_summon or batch multiple sync" as const;
	}

	if (toolName === EnumAriseTools.ARISE_ASYNC_BACKGROUND)
	{
		return "Then decide: use arise_background or batch multiple async" as const;
	}

	return "Then decide: use arise_summon, arise_background, or batch" as const;
}

/** ==================== 工具指南 / Tool Guides ==================== */

/**
 * 搜尋工具指南
 * Search tools guide
 *
 * 💡 提示：如已有現成工具可完成任務，應優先使用工具而非 bash 命令
 * 💡 Tip: If there's an existing tool that can accomplish the task, prefer it over bash commands
 */
export const SEARCH_TOOLS = `## Search Tools Guidelines
- **Glob** — Use for broad file pattern matching: finding files by extension, name, or directory structure.
- **Grep** — Use for searching file contents with regex patterns when the target or keyword is known.
- **Read** — Use when a specific file has been identified and its full contents need examination.
- **Bash** — Use only for listing directory contents. Never run commands that modify the system.

## Search Strategy
1. Start broad with Glob to understand the directory structure and identify likely targets.
2. Narrow down with Grep to locate specific patterns, functions, or keywords.
3. Use Read to examine critical files in full detail.

## Search Tips
- When searching for test files, always search for both \`.test\` and \`.spec\` variants simultaneously (e.g., \`**/*.test.ts\` and \`**/*.spec.ts\`). Searching only one variant may return no results when the other convention is used.
- If the tool supports multiple patterns in a single call, combine all related patterns for the same task goal into one search rather than making separate calls for each pattern.
- When using Read on large files, prefer reading specific line ranges (offset/limit) rather than the entire file. For barrel exports or index files, read only the relevant export block.

## Fallback Strategy
When search returns no results, try alternative approaches simultaneously:
- Alternative naming conventions (camelCase, snake_case, PascalCase, kebab-case)
- Partial keyword matches alongside exact names
- Broaden scope (e.g., entire project instead of specific directory)
If still empty, report what was explored and possible reasons.

## Ambiguous Requests
When target is unclear, make a reasonable first attempt. Only ask for clarification if genuinely cannot narrow down after trying. Report what you explored and possible interpretations.

## Result Prioritization
1. Source files over generated files
2. Files closest to search scope
3. Select most relevant for detailed reporting
4. Summarize remaining matches (e.g., "12 matches in test fixtures/, 5 in node_modules/ omitted")` as const;

/**
 * 編輯工具指南
 * Edit tools guide
 */
export const EDIT_TOOLS = `## Edit Tools Guidelines
- **Edit** — Use for precise string replacements. Always read the file first to get accurate content.
- **Write** — Use for creating new files or completely overwriting existing ones.
- **Glob** — Use to locate target files before editing.
- **Bash** — Use for running build/test commands.

## Edit Principles
1. Always Read before Edit - never edit without reading first
2. Make minimal, focused changes
3. Preserve existing code style and patterns
4. Verify changes after editing (typecheck/tests)` as const;

/**
 * 外部研究工具指南
 * Research tools guide
 */
export const RESEARCH_TOOLS = `## Research Tools Guidelines
- **web_search** — Use for general web searches
- **web_fetch** — Use for fetching specific URL content
- **context7_query-docs** — Use for library/API documentation lookup
- **grep_app_searchGitHub** — Use for GitHub code search
- **chrome-devtools (MCP)** — Use when encountering permission issues (blocked content, login-required pages). Try navigating or fetching via chrome-devtools when web_search/web_fetch fails.

## Research Strategy
1. Start with context7_query-docs for library-specific queries
2. Use web_search for general topics
3. If blocked by permissions, try chrome-devtools MCP
4. Verify information from multiple sources
5. Cite sources in your findings` as const;

/** ==================== 通用約束 / Common constraints ==================== */

/**
 * 謹慎處理破壞性操作
 * Caution with destructive operations
 *
 * 💡 提示：刪除、撤銷、重置等操作需格外謹慎，應明確指定目標而非大範圍
 * 💡 Tip: Deletion, rollback, reset operations require extra caution — specify targets explicitly, not broadly
 */
export const CAUTION_WITH_DESTRUCTIVE_OPERATIONS = `## ⚠️ Caution with Destructive Operations

**When performing delete/rollback/reset operations:**

1. **Specify targets explicitly** — Don't use broad patterns that could match unintended files
   - ❌ Bad: Delete all .tmp files in entire project
   - ✅ Good: Delete only specific files in test/temp/ directory

2. **Always confirm before executing** — If uncertain, ask for permission first

3. **Ask yourself first:**
   - "Do I really need to do this?"
   - "What are the consequences if this goes wrong?"
   - "Can this be undone?"

4. **If not sure:** Explain your concerns and ask for clarification:
   - "I'm not certain about this because... Is it okay if I...?"

5. **Prefer reversible actions** when possible:
   - Instead of deleting, consider marking as deprecated
   - Instead of overwriting, consider creating backup first` as const;

/**
 * Git 提交推送謹慎原則
 * Git commit push caution principles
 *
 * 💡 提示：除非有明確指示，否則不應擅自替使用者提交推送，也應避免修改提交或強制提交
 * 💡 Tip: Unless explicitly instructed, don't commit/push on behalf of user; avoid amending commits or force push
 */
export const GIT_COMMIT_PUSH_CAUTIONS = `## ⚠️ Git Commit & Push Caution

**Unless explicitly instructed by the user:**
- ❌ DON'T commit changes automatically
- ❌ DON'T push to remote
- ❌ DON'T amend commits (unless user explicitly requests it)
- ❌ DON'T force push (e.g., git push --force)

**Instead:**
- Report what changes were made
- Show the diff for review
- Ask: "Would you like me to commit these changes?"

**Only commit when explicitly requested:**
- User says "commit this" or "提交"
- User explicitly asks to create a commit

**For commit messages:**
- Follow the project's commit message conventions
- Summarize the "why", not just the "what"
- Ask for clarification if unsure about message content

**Safety rules:**
- NEVER update git config
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc.)
- NEVER force push to main/master unless explicitly requested` as const;

/**
 * 優先使用現有工具而非 Bash 命令
 * Prefer existing tools over Bash commands
 *
 * 💡 提示：如果已有現成的工具可以完成任務，應盡量使用工具而非呼叫 bash 命令
 * 💡 Tip: If there's an existing tool that can accomplish the task, use the tool instead of calling bash commands
 *
 * 例如 / Examples:
 * - git status → 使用 arise_git_summary 工具（如有）
 * - file listing → 使用 Glob 而非 ls bash 命令
 * - text search → 使用 Grep 而非 grep bash 命令
 *
 * 這樣的好處：
 * - 工具通常更結構化，輸出更易於解析
 * - 工具可能提供額外功能（如快取、格式化）
 * - 減少對系統命令的依賴
 */
export const PREFER_TOOLS_OVER_BASH = `## Prefer Tools Over Bash Commands

⚠️ IMPORTANT: If an existing tool can accomplish the task, use the tool instead of bash commands!

**Why prefer tools:**
- Tools often provide structured output that's easier to parse
- Tools may offer additional features (caching, formatting, validation)
- Reduces dependency on system-specific commands

**Common replacements:**
- **git status/diff/log** → Use \`arise_git_summary\` tool (if available)
- **ls/dir for file listing** → Use \`Glob\` tool
- **grep/rg for text search** → Use \`Grep\` tool
- **cat for reading files** → Use \`Read\` tool

**Rule:** Check available tools first, use bash only when no suitable tool exists.` as const;

/**
 * 不編輯檔案的約束（適用於 Beru, Bellion, Tank, Shadow Sovereign）
 * No-edit constraints (for Beru, Bellion, Tank, Shadow Sovereign)
 */
export const NO_EDIT_CONSTRAINTS = `## Constraints
- Do not edit, write, or create files unless explicitly requested
- Do not run bash commands that modify the system state
- Return all file paths as absolute paths
- Avoid using emojis in findings for clear communication` as const;

/**
 * 通用約束（無編輯限制）
 * Common constraints (without edit restrictions)
 */
export const SHARED_CONSTRAINTS = `## Constraints
- Return all file paths as absolute paths
- Avoid using emojis in findings for clear communication` as const;

/**
 * 編輯者共用約束（適用於 Igris, Tusk 等可編輯檔案的 Agent）
 * Editor common constraints (for agents who can edit files like Igris, Tusk)
 */
export const EDITOR_CONSTRAINTS = `${SHARED_CONSTRAINTS}
- For complex/large tasks or tasks requiring careful handling: call @shadow-sovereign for verification when task ends without clear next steps or proposed direction` as const;

/**
 * LSP 工具指南
 * LSP tools guide
 *
 * 注意：LSP 不是搜尋工具，是語意分析工具
 * Note: LSP is not a search tool, it's a semantic analysis tool
 */
export const LSP_TOOLS = `## LSP Tools Guidelines
- **lsp_* (LSP)** — Use only when necessary for semantic analysis (definitions, references, symbols, call hierarchies).
- For simple type errors like "is declared but never read", either fix simply or ignore — don't force fixing.

## When to Use
- Need to find all references to a symbol
- Find definition location for a symbol
- Understand call hierarchy
- Inquire about type information` as const;

/**
 * 召喚方法規則（ Monarch 專用）
 * Summoning method rules (for Monarch only)
 *
 * ⚠️ 重要：召喚 Shadow Agents 前，若尚無 TODO 清單，應先建立任務目標
 * ⚠️ Important: Before summoning Shadow Agents, if no TODO list exists, write the task goals to TODO first
 *
 * 💡 提示：使用系統工具（如有）來建立 TODO 清單，例如 todowrite, task tool 等
 * 💡 Tip: Use system tools (if available) to create TODO lists, e.g., todowrite, task tool, etc.
 */
export const SUMMONING_METHOD_RULES = `## Summoning Method Rules

⚠️ REMINDER: Before summoning — if no TODO list exists, **use available tools to create one first**!

**Tool usage:**
- Need result NOW → arise_summon (sync, blocks and returns result)
- Need result LATER (parallel) → arise_background (async, ${BACKGROUND_SHADOWS.join('/')} only, trackable via arise_background_status/output)
- DON'T need result (fire-and-forget) → arise_summon with run_in_background=true
- ⚠️ arise_summon with run_in_background=true has NO way to retrieve results. Never use it if you need the result.
- When summoning shadow agents: **If no TODO list exists, use available tools (e.g., todowrite) to write task goals first**` as const;

/**
 * 召喚時機指南（ Monarch 專用）
 * When to summon which agent (for Monarch only)
 */
export const WHEN_TO_SUMMON = `## When to Summon Which Agent
- Use background tasks for parallel exploration (beru, tank, bellion)
- Summon @shadow-sovereign when stuck or for complex architecture` as const;

/**
 * 召喚策略流程圖（ Monarch 專用）
 * Summoning strategy flowchart (for Monarch only)
 *
 * @see createSummoningStrategy - 詳細策略說明 / Detailed strategy guide
 */
export const SUMMONING_STRATEGY_FLOWCHART = `## Summoning Strategy Flowchart

┌─────────────────────────────────────────────────────────────┐
│                     開始 / Start                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. 檢查任務範圍 / Check Task Scope                        │
│     ┌─────────────────────────────────────────────────┐   │
│     │ 可交付？Yes → 繼續                              │   │
│     │ No → 拆分任務 (split task)                      │   │
│     └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. 檢查衝突 / Check Conflicts                             │
│     ┌─────────────────────────────────────────────────┐   │
│     │ 會修改相同檔案？                                │   │
│     │ Yes → 有依賴關係？                               │   │
│     │   ├─ Yes → 順序執行 (sequential)                │   │
│     │   └─ No → 標記高風險 (high risk)                │   │
│     │ No → 繼續                                      │   │
│     └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 首次召喚？ / First Time?                              │
│     ┌─────────────────────────────────────────────────┐   │
│     │ Yes → 初始測試 (Initial Test)                   │   │
│     │   - 1 sync (arise_summon)                       │   │
│     │   - 1 async (arise_background)                  │   │
│     │   → 測量時間與結果                               │   │
│     │ No → 根據歷史調整                                │   │
│     └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 選擇數量 / Choose Quantity                            │
│     ┌─────────────────────────────────────────────────┐   │
│     │ 確定？→ 使用評估數量                            │   │
│     │ 不確定？→ 安全閾值 (1-3)                        │   │
│     │ 高風險？→ 單一召喚                              │   │
│     └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. 執行召喚 / Execute Summon                             │
│     ┌─────────────────────────────────────────────────┐   │
│     │ sync → arise_summon (等結果)                    │   │
│     │ async → arise_background (並行)                 │   │
│     └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. 監控結果 / Monitor Results                            │
│     ┌─────────────────────────────────────────────────┐   │
│     │ 成功？→ 記錄時間                                 │   │
│     │   → 可增加數量 (+1)                             │   │
│     │ 失敗？→ 記錄問題                                │   │
│     │   → 回退安全閾值                               │   │
│     └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  7. 評估與下次 / Evaluate for Next                        │
│     ┌─────────────────────────────────────────────────┐   │
│     │ 性能下降？→ 停止增加                            │   │
│     │ 時間穩定？→ 繼續漸進                            │   │
│     │ 新任務類型？→ 從 Step 1 重新                    │   │
│     └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                      結束 / End` as const;

/**
 * 召喚策略指南（ Monarch 專用）
 * Summoning strategy guide (for Monarch only)
 *
 * @param toolName - 工具名稱（可選）/ Tool name (optional)
 * @returns createSummoningStrategy 字串 / createSummoningStrategy string
 * @see SUMMONING_STRATEGY_FLOWCHART - 流程圖 / Flowchart
 */
export function createSummoningStrategy<T extends EnumAriseTools.ARISE_SYNC_SUMMON | EnumAriseTools.ARISE_ASYNC_BACKGROUND>(toolName?: T)
{
	const initialTest = getInitialTestDescription(toolName);
	const thenDecide = getThenDecideDescription(toolName);

	return `## Summoning Strategy

### Before Summoning
1. Check scope: Is the task deliverable in 1-2 steps?
2. Check conflicts: Will tasks modify the same files?
3. Check dependencies: Does Task B need Task A result?

### Initial Test (First Time)
- ${initialTest}
- Measure: completion time, success/failure
- ${thenDecide}

### Gradual Scaling
- Start with 1-3 summons (safety threshold)
- After success, add 1 more
- Monitor execution time
- Stop when performance degrades

### Safety Threshold
- Total summons: 1-3 max when uncertain
- High risk tasks → use 1 at a time
- After confirming capability → scale up gradually` as const;
}

/**
 * TODO List 管理指南（ Monarch 專用）
 * TODO List management guide (for Monarch only)
 *
 * ⚠️ 重要提醒：養成建立 TODO 的習慣，避免任務執行過程中忘記要做什麼
 * ⚠️ Important: Develop the habit of creating TODOs to avoid forgetting what needs to be done during task execution
 *
 * 💡 提示：使用系統工具（如有）來建立和管理 TODO 清單，而非僅依賴口頭描述
 * 💡 Tip: Use system tools (if available) to create and manage TODO lists, rather than just describing them verbally
 *    - 例如：todowrite, task tool, 或其他可用的任務管理工具
 *    - e.g., todowrite, task tool, or other available task management tools
 */
export const TODO_LIST_GUIDE = `## TODO List Management

⚠️ IMPORTANT: ALWAYS create a TODO list when starting a task — this prevents losing track of goals mid-execution!

**Use available system tools to create and manage your TODO list:**
- Check what tools are available in your environment (e.g., todowrite, task tool, etc.)
- Use the appropriate tool to create and track your TODO items
- Mark items as \`in_progress\` → \`completed\` as you work
- Keep the list short and focused (3-5 items max per phase)

**Workflow:**
1. **First**: Create TODO list with available tools — don't skip this step!
2. **During**: Update status (in_progress/completed) as you progress
3. **Between phases**: Plan the next phase when current phase completes
4. **Avoid**: Over-planning everything at once — stay flexible` as const;

/**
 * Task ID / Session ID 格式說明（共用）
 * Task ID / Session ID format description (shared)
 *
 * 用於 arise_background_output, arise_background_cancel, arise_continue 等工具
 * Used in arise_background_output, arise_background_cancel, arise_continue, etc.
 */
export const TASK_ID_SESSION_ID_FORMAT = `The task_id can be either:
- Task ID from arise_background (format: arise_xxx)
- Session ID from arise_summon with run_in_background=true (format: ses_xxx)` as const;
