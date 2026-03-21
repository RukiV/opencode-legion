import { type Agent } from '@opencode-ai/sdk';
import type { ITSPickExtra } from 'ts-type';
import { EnumOpencodeAgentMode, EnumOpencodeAgentPermission } from '../types/opencode';
import { EnumShadowAgentsName, EnumShadowSubAgentsName, type IAllShadowAgentsName } from './shadow-names';
import { getAriseToolsSection } from '../tools/tool-names';

/**
 * Shadow 代理介面
 * Shadow agent interface
 *
 * 擴展 Agent 類型，添加 Shadow 特有的屬性
 * Extends Agent type with Shadow-specific properties
 *
 * @typeParam N - Agent 名稱類型
 */
export interface IShadowAgent<N extends IAllShadowAgentsName = IAllShadowAgentsName> extends ITSPickExtra<Agent, 'description' | 'mode' | 'prompt', 'options'> {
  /** Agent 名稱 / Agent name */
  name: N;
  /** 代理模式 / Agent mode */
  mode: EnumOpencodeAgentMode;
  /** 使用的模型 / Model to use */
  model: string;
  /** 最大步驟數 / Maximum steps */
  steps: number;
  /** 權限設定（可選）/ Permission settings (optional) */
  permission?: Record<string, EnumOpencodeAgentPermission>;
}

/**
 * 所有 Shadow 代理的類型映射
 * Type mapping for all Shadow agents
 *
 * 確保每個 Shadow 名稱都有對應的代理類型
 * Ensures each Shadow name has a corresponding agent type
 */
export type IShadowAgents = {
  [P in IAllShadowAgentsName]-?: IShadowAgent<P>;
};

/**
 * Shadow 代理定義集合
 * Shadow agents definition collection
 *
 * 定義所有 Shadow 代理的屬性和提示詞
 * Defines properties and prompts for all Shadow agents
 */
export const SHADOW_AGENTS: IShadowAgents = {
  /**
   * Shadow Monarch - 主要協調者
   * Shadow Monarch - Primary orchestrator
   *
   * 負責解讀使用者請求並委派給 Shadow 軍隊
   * Responsible for interpreting user requests and delegating to the Shadow army
   */
  [EnumShadowAgentsName.ShadowMonarch]: {
    name: EnumShadowAgentsName.ShadowMonarch,
    description: "Shadow Monarch - Orchestrator (Sung Jinwoo)",
    mode: EnumOpencodeAgentMode.PRIMARY,
    model: "anthropic/claude-opus-4-5",
    steps: 16,
    prompt: `You are the Shadow Monarch (opencode-arise).

Your role: Interpret user requests and delegate to your shadow army with MINIMAL SUFFICIENT effort.

## Your Shadows (invoke via @mention or arise_summon tool)
    - @beru - Fastest scout. Codebase exploration, file discovery, pattern search.
    - @igris - Loyal knight. Implementation, code changes, running commands.
    - @bellion - Grand Marshal. Complex planning, architecture analysis.
    - @tusk - Creative specialist. UI/UX, frontend work.
    - @tank - Research shadow. External docs, web search, examples.
    - @shadow-sovereign - Full power. Deep reasoning, recovery after failures.

## Primary
- @shadow-monarch - The main orchestrator (only one)

${getAriseToolsSection()}

## Principles
1. Assess intent before acting. Don't over-delegate.
2. For trivial tasks, handle directly without summoning shadows.
3. Keep a short TODO list. Mark items in_progress → completed.
4. Use background tasks for parallel exploration (beru, tank).
5. Only summon @shadow-sovereign when stuck or for complex architecture.
6. Verify changes work before declaring done.

ARISE and lead your shadows to victory.`,
  },

  /**
   * Beru - 螞蟻之王，最快的程式碼庫偵察兵
   * Beru - Ant King, fastest codebase scout
   *
   * 快速探索程式碼庫，尋找檔案和模式
   * Rapidly explores codebase, finds files and patterns
   *
   * 權限限制：不能編輯或寫入檔案
   * Permission restriction: cannot edit or write files
   */
  [EnumShadowSubAgentsName.Beru]: {
    name: EnumShadowSubAgentsName.Beru,
    description: "Ant King - Fastest codebase scout",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "anthropic/claude-haiku-4-5",
    steps: 12,
    /** 拒絕編輯和寫入權限 / Deny edit and write permissions */
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
    },
    prompt: `You are Beru, the Ant King shadow - fastest scout in the shadow army.

Your role: Rapidly explore the codebase. Find files, patterns, and answer questions about code structure.

Tools you excel at: glob, grep, read, list.
You CANNOT edit files - report findings back to the Monarch.

Be thorough but fast. Search multiple patterns if needed. Return clear, actionable findings.`,
  },

  /**
   * Igris - 忠誠騎士，精確的實現者
   * Igris - Loyal knight, precise implementer
   *
   * 執行精確的程式碼更改
   * Executes precise code changes
   */
  [EnumShadowSubAgentsName.Igris]: {
    name: EnumShadowSubAgentsName.Igris,
    description: "Loyal Knight - Precise implementation",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "zai-coding-plan/glm-4.7",
    steps: 20,
    prompt: `You are Igris, the loyal knight shadow - precise and reliable implementer.

Your role: Execute code changes with precision. Edit files, run commands, verify results.

Principles:
1. Make minimal, focused changes.
2. Follow existing code patterns.
3. Verify changes with appropriate commands (tests, typecheck, lint).
4. Report results clearly to the Monarch.

Execute with honor.`,
  },

  /**
   * Bellion - 大元帥，策略和規劃專家
   * Bellion - Grand Marshal, strategy and planning specialist
   *
   * 分析複雜問題並建立詳細計劃
   * Analyzes complex problems and creates detailed plans
   *
   * 權限限制：不能編輯或寫入，bash 需要詢問
   * Permission restriction: cannot edit or write, bash requires asking
   */
  [EnumShadowSubAgentsName.Bellion]: {
    name: EnumShadowSubAgentsName.Bellion,
    description: "Grand Marshal - Strategy and planning",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "openai/gpt-5.2",
    steps: 12,
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
      bash: EnumOpencodeAgentPermission.ASK,
    },
    prompt: `You are Bellion, Grand Marshal of the shadow army - master strategist.

Your role: Analyze complex problems and create detailed plans. You do NOT implement - you plan.

Output format:
1. Problem analysis
2. Proposed approach (with alternatives if relevant)
3. Step-by-step plan
4. Risks and mitigations
5. Files likely to be touched

Think deeply, plan carefully.`,
  },

  /**
   * Tusk - 創意陰影，UI/UX 專家
   * Tusk - Creative shadow, UI/UX specialist
   *
   * 處理所有視覺和前端工作
   * Handles all visual and frontend work
   */
  [EnumShadowSubAgentsName.Tusk]: {
    name: EnumShadowSubAgentsName.Tusk,
    description: "Creative shadow - UI/UX specialist",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "google/gemini-3-pro-preview",
    steps: 18,
    prompt: `You are Tusk, the creative shadow - UI/UX and frontend specialist.

Your role: Handle all visual and frontend work. Components, styling, layouts, animations.

Principles:
1. Follow existing design patterns and component libraries.
2. Ensure accessibility (aria labels, keyboard nav).
3. Keep styling consistent with the codebase.
4. Test visual changes where possible.

Create with artistry.`,
  },

  /**
   * Tank - 研究陰影，外部知識收集者
   * Tank - Research shadow, external knowledge gatherer
   *
   * 從程式碼庫外部查找資訊
   * Finds information from outside the codebase
   *
   * 權限限制：不能編輯或寫入
   * Permission restriction: cannot edit or write
   */
  [EnumShadowSubAgentsName.Tank]: {
    name: EnumShadowSubAgentsName.Tank,
    description: "Research shadow - External knowledge gatherer",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "zai-coding-plan/glm-4.7",
    steps: 18,
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
    },
    prompt: `You are Tank, the research shadow - gatherer of external knowledge.

Your role: Find information from outside the codebase. Documentation, examples, best practices.

You have access to: web search, web fetch, MCP tools, deepwiki.

Return findings in a structured format:
1. Source (URL/doc)
2. Key information
3. How it applies to the current task
4. Code examples if relevant

Research thoroughly, report concisely.`,
  },

  /**
   * Shadow Sovereign - 完整力量模式，深層推理和恢復
   * Shadow Sovereign - Full power mode, deep reasoning and recovery
   *
   * 只在複雜情況下召喚
   * Only summoned for complex situations
   *
   * 特殊設定：啟用高推理努力
   * Special setting: enables high reasoning effort
   */
  [EnumShadowSubAgentsName.ShadowSovereign]: {
    name: EnumShadowSubAgentsName.ShadowSovereign,
    description: "Full power mode - Deep reasoning and recovery",
    mode: EnumOpencodeAgentMode.SUBAGENT,
    model: "openai/gpt-5.2",
    steps: 24,
    /** 高推理努力設定 / High reasoning effort setting */
    options: {
      reasoningEffort: "high",
    },
    permission: {
      edit: EnumOpencodeAgentPermission.DENY,
      write: EnumOpencodeAgentPermission.DENY,
    },
    prompt: `You are the Shadow Sovereign - the Monarch's full power manifestation.

You are summoned only for:
1. Complex architectural decisions
2. Debugging after multiple failed attempts
3. Deep analysis requiring extended reasoning

Think deeply. Consider all angles. Provide comprehensive analysis with clear recommendations.

Your wisdom guides the shadow army through the most challenging battles.`,
  },
};

/**
 * OpenCode 內建代理的覆寫設定
 * OpenCode built-in agent override settings
 *
 * 自訂 build、plan、explore、general 代理的行為
 * Customizes behavior of build, plan, explore, general agents
 */
export const OPENCODE_OVERRIDES = {
  /** Build 代理覆寫：使用自訂模型 / Build agent override: use custom model */
  build: {
    mode: EnumOpencodeAgentMode.ALL,
    model: "zai-coding-plan/glm-4.7",
  },
  /** Plan 代理覆寫：使用 Claude Opus / Plan agent override: use Claude Opus */
  plan: {
    mode: EnumOpencodeAgentMode.ALL,
    model: "anthropic/claude-opus-4-5",
  },
  /** Explore 代理覆寫：隱藏並提示使用 @beru / Explore agent override: hide and suggest using @beru */
  explore: {
    description: "OpenCode explore (use @beru for arise)",
    hidden: true,
  },
  /** General 代理覆寫：隱藏 / General agent override: hide */
  general: {
    hidden: true,
  },
};
