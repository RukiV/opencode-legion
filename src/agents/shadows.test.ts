import { SHADOW_AGENTS, OPENCODE_OVERRIDES } from "./shadows";
import { ALLOWED_SHADOWS, EnumShadowAgentsName, IAllShadowAgentsName } from './shadow-names';
import { EnumOpencodeAgentMode } from '../types/opencode';

const ALL_SHADOW_AGENTS_NAME = [EnumShadowAgentsName.ShadowMonarch, ...ALLOWED_SHADOWS] as const;

describe("Shadow Agents", () => {
  test("has all expected shadows", () => {
    const expectedShadows = ALL_SHADOW_AGENTS_NAME;
    for (const name of expectedShadows) {
      expect(SHADOW_AGENTS[name]).toBeDefined();
    }
  });

  test("monarch is primary mode", () => {
    expect(SHADOW_AGENTS[EnumShadowAgentsName.ShadowMonarch].mode).toBe(EnumOpencodeAgentMode.PRIMARY);
  });

  test("all other shadows are subagent mode", () => {
    const subagents = ALLOWED_SHADOWS;
    for (const name of subagents) {
      expect(SHADOW_AGENTS[name].mode).toBe("subagent");
    }
  });

  test("beru and bellion have edit denied", () => {
    expect(SHADOW_AGENTS.beru.permission?.edit).toBe("deny");
    expect(SHADOW_AGENTS.bellion.permission?.edit).toBe("deny");
  });

  test("shadow-sovereign has high reasoning effort", () => {
    expect(SHADOW_AGENTS["shadow-sovereign"].options?.reasoningEffort).toBe("high");
  });

  test("all shadows have prompts", () => {
    for (const [name, agent] of Object.entries(SHADOW_AGENTS)) {
      expect(agent.prompt).toBeDefined();
      expect(agent.prompt?.length).toBeGreaterThan(50);
    }
  });
});

describe("OpenCode Overrides", () => {
  test("build has mode all", () => {
    expect(OPENCODE_OVERRIDES.build.mode).toBe("all");
  });

  test("plan has mode all", () => {
    expect(OPENCODE_OVERRIDES.plan.mode).toBe("all");
  });

  test("explore and general are hidden", () => {
    expect(OPENCODE_OVERRIDES.explore.hidden).toBe(true);
    expect(OPENCODE_OVERRIDES.general.hidden).toBe(true);
  });
});
