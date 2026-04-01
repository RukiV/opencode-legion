import { SHADOW_AGENTS, OPENCODE_OVERRIDES } from "./shadows";
import { ALLOWED_SHADOWS, EnumShadowAgentsName, IAllShadowAgentsName, EnumShadowSubAgentsName } from '../types/enums';
import { EnumOpencodeAgentMode, EnumOpencodeAgentPermission, EnumReasoningEffort } from '../types/enum-opencode';

/**
 * 所有 Shadow Agent名稱陣列
 * All Shadow agent names array
 *
 * 包含 Monarch 和所有子代理
 * Includes Monarch and all subagents
 */
const ALL_SHADOW_AGENTS_NAME = [EnumShadowAgentsName.ShadowMonarch, ...ALLOWED_SHADOWS] as const;

/**
 * Shadow Agents 測試
 * Shadow Agents tests
 *
 * 驗證 Shadow Agent配置的正確性
 * Verifies correctness of Shadow agent configuration
 */
describe("Shadow Agents", () => {
  /**
   * 測試 1: 所有預期的 Shadow 都已定義
   * Test 1: All expected shadows are defined
   *
   * 確保沒有遺漏任何 Shadow Agent
   * Ensures no Shadow agents are missing
   */
  test("has all expected shadows", () => {
    const expectedShadows = ALL_SHADOW_AGENTS_NAME;
    for (const name of expectedShadows) {
      expect(SHADOW_AGENTS[name]).toBeDefined();
    }
  });

  /**
   * 測試 2: Monarch 是 PRIMARY 模式
   * Test 2: Monarch is PRIMARY mode
   *
   * Monarch 是唯一的主要協調者，必須是 PRIMARY 模式
   * Monarch is the only primary coordinator, must be PRIMARY mode
   */
  test("monarch is primary mode", () => {
    expect(SHADOW_AGENTS[EnumShadowAgentsName.ShadowMonarch].mode).toBe(EnumOpencodeAgentMode.PRIMARY);
  });

  /**
   * 測試 3: 其他 Shadow 都是 SUBAGENT 模式
   * Test 3: All other shadows are SUBAGENT mode
   *
   * 除了 Monarch，所有其他 Shadow 都是子代理
   * All shadows except Monarch are subagents
   */
  test("all other shadows are subagent mode", () => {
    const subagents = ALLOWED_SHADOWS;
    for (const name of subagents) {
      expect(SHADOW_AGENTS[name].mode).toBe(EnumOpencodeAgentMode.SUBAGENT);
    }
  });

  /**
   * 測試 4: Beru 和 Bellion 禁止編輯
   * Test 4: Beru and Bellion have edit denied
   *
   * Beru 是偵察兵，Bellion 是策略家，都不應該直接編輯檔案
   * Beru is scout, Bellion is strategist, neither should directly edit files
   */
  test("beru and bellion have edit denied", () => {
    expect(SHADOW_AGENTS[EnumShadowSubAgentsName.Beru].permission?.edit).toBe(EnumOpencodeAgentPermission.DENY);
    expect(SHADOW_AGENTS[EnumShadowSubAgentsName.Bellion].permission?.edit).toBe(EnumOpencodeAgentPermission.DENY);
  });

  /**
   * 測試 5: Shadow Sovereign 有高推理設定
   * Test 5: Shadow Sovereign has high reasoning effort
   *
   * Shadow Sovereign 是完整力量模式，需要高推理能力
   * Shadow Sovereign is full power mode, needs high reasoning capability
   */
  test("shadow-sovereign has high reasoning effort", () => {
    expect(SHADOW_AGENTS[EnumShadowSubAgentsName.ShadowSovereign].options?.reasoningEffort).toBe(EnumReasoningEffort.High);
  });

  /**
   * 測試 6: 所有 Shadow 都有有效的 prompt
   * Test 6: All shadows have valid prompts
   *
   * 每個 Shadow 都必須有有意義的 prompt（長度 > 50）
   * Each Shadow must have a meaningful prompt (length > 50)
   */
  test("all shadows have prompts", () => {
    for (const [name, agent] of Object.entries(SHADOW_AGENTS)) {
      expect(agent.prompt).toBeDefined();
      expect(agent.prompt?.length).toBeGreaterThan(50);
    }
  });
});

/**
 * OpenCode Overrides 測試
 * OpenCode Overrides tests
 *
 * 驗證 OpenCode 內建代理覆寫設定的正確性
 * Verifies correctness of OpenCode built-in agent override settings
 */
describe("OpenCode Overrides", () => {
  /**
   * 測試 1: build 代理使用 ALL 模式
   * Test 1: build agent uses ALL mode
   */
  test("build has mode all", () => {
    expect(OPENCODE_OVERRIDES.build.mode).toBe(EnumOpencodeAgentMode.ALL);
  });

  /**
   * 測試 2: plan 代理使用 ALL 模式
   * Test 2: plan agent uses ALL mode
   */
  test("plan has mode all", () => {
    expect(OPENCODE_OVERRIDES.plan.mode).toBe(EnumOpencodeAgentMode.ALL);
  });

  /**
   * 測試 3: explore 和 general 被隱藏
   * Test 3: explore and general are hidden
   *
   * 這些代理在 Arise 模式下被隱藏，引導使用者使用 Shadow
   * These agents are hidden in Arise mode, directing users to use Shadows
   */
  test("explore and general are hidden", () => {
    expect(OPENCODE_OVERRIDES.explore.hidden).toBe(true);
    expect(OPENCODE_OVERRIDES.general.hidden).toBe(true);
  });
});
