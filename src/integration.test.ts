import { describe, expect, it, test, beforeEach, afterEach, mock } from "bun:test";
import OpencodeArise from "./index";
import { ALL_ARISE_TOOLS, EnumShadowAgentsName, EnumShadowSubAgentsName, EnumAriseTools } from "./types/enums";
import { EnumOpencodeAgentMode } from "./types/enum-opencode";
import { getDisabledTools } from "./types/const-project";

// Comprehensive mock context
const createMockCtx = () => ({
	client: {
		session: {
			create: async () => ({ data: { id: "test-session-123" } }),
			prompt: async () => ({}),
			promptAsync: async () => ({}),
			messages: async () => ({ data: [] }),
			status: async () => ({ data: {} }),
			abort: async () => ({}),
		},
		tui: {
			showToast: async () => true,
		},
	},
	project: {
		id: "test-project",
		worktree: "/tmp/test-project",
		name: "Test Project",
	},
	directory: "/tmp/test-project",
	worktree: "/tmp/test-project",
	serverUrl: new URL("http://localhost:4096"),
	$: (async () => ({ stdout: "", stderr: "", exitCode: 0 })) as any,
});

describe("Plugin Integration", () =>
{
	it("plugin is an async function", () =>
	{
		expect(typeof OpencodeArise).toBe("function");
	});

	it("plugin returns hooks object", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		expect(hooks).toBeDefined();
		expect(typeof hooks).toBe("object");
	});

	it("hooks object has all required properties", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		// Custom tools
		expect(hooks.tool).toBeDefined();
		expect(typeof hooks.tool).toBe("object");

		// Required hooks
		expect(hooks.config).toBeDefined();
		expect(typeof hooks.config).toBe("function");

		expect(hooks["tool.execute.after"]).toBeDefined();
		expect(typeof hooks["tool.execute.after"]).toBe("function");

		expect(hooks["experimental.session.compacting"]).toBeDefined();
		expect(typeof hooks["experimental.session.compacting"]).toBe("function");

		expect(hooks.event).toBeDefined();
		expect(typeof hooks.event).toBe("function");
	});

	it("registers all custom tools", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		const toolNames = Object.keys(hooks.tool!);

		const disabledTools = getDisabledTools({} as any);

		let i = 0;

		// 驗證所有已註冊的工具都是活躍的（未被禁用）
		for (const toolName of ALL_ARISE_TOOLS)
		{
			if (!disabledTools.includes(toolName as EnumAriseTools))
			{
				expect(toolNames).toContain(toolName as EnumAriseTools);

				i++;
			}
		}

		expect(toolNames).toHaveLength(i);
	});

	it("config hook sets default_agent to monarch", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		const mockConfig: Record<string, unknown> = {};
		await hooks.config!(mockConfig);

		expect(mockConfig.default_agent).toBe(EnumShadowAgentsName.ShadowMonarch);
	});

	it("config hook creates all shadow agents", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		const mockConfig: Record<string, unknown> = {};
		await hooks.config!(mockConfig);

		const agents = mockConfig.agent as Record<string, unknown>;

		// All shadows should be registered
		expect(agents[EnumShadowAgentsName.ShadowMonarch]).toBeDefined();
		expect(agents[EnumShadowSubAgentsName.Beru]).toBeDefined();
		expect(agents[EnumShadowSubAgentsName.Igris]).toBeDefined();
		expect(agents[EnumShadowSubAgentsName.Bellion]).toBeDefined();
		expect(agents[EnumShadowSubAgentsName.Tusk]).toBeDefined();
		expect(agents[EnumShadowSubAgentsName.Tank]).toBeDefined();
		expect(agents[EnumShadowSubAgentsName.ShadowSovereign]).toBeDefined();
	});

	it("config hook sets correct modes for agents", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		const mockConfig: Record<string, unknown> = {};
		await hooks.config!(mockConfig);

		const agents = mockConfig.agent as Record<string, any>;

		// Monarch is primary
		expect(agents[EnumShadowAgentsName.ShadowMonarch].mode).toBe(EnumOpencodeAgentMode.PRIMARY);

		// Others are subagents
		expect(agents[EnumShadowSubAgentsName.Beru].mode).toBe(EnumOpencodeAgentMode.SUBAGENT);
		expect(agents[EnumShadowSubAgentsName.Igris].mode).toBe(EnumOpencodeAgentMode.SUBAGENT);
		expect(agents[EnumShadowSubAgentsName.Bellion].mode).toBe(EnumOpencodeAgentMode.SUBAGENT);
	});

	it("compaction hook injects context", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		const mockOutput = { context: [] as string[], prompt: undefined };
		await hooks["experimental.session.compacting"]!({ sessionID: "test" }, mockOutput);

		expect(mockOutput.context.length).toBeGreaterThan(0);
		expect(mockOutput.context[0]).toContain("PRESERVE");
	});

	it("tool.execute.after hook can shape output", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		// Short output should pass through unchanged
		const shortOutput = { title: "test", output: "short output", metadata: {} };
		await hooks["tool.execute.after"]!(
			{ tool: "bash", sessionID: "test", callID: "test" } as any,
			shortOutput,
		);

		expect(shortOutput.output).toBe("short output");
	});
});

describe("Error Handling", () =>
{
	it("plugin handles missing config gracefully", async () =>
	{
		const ctx = createMockCtx();
		// Plugin should work even without opencode-arise.json
		const hooks = await OpencodeArise(ctx as any);

		expect(hooks).toBeDefined();
	});

	it("event hook handles unknown events gracefully", async () =>
	{
		const ctx = createMockCtx();
		const hooks = await OpencodeArise(ctx as any);

		// Should not throw for unknown event types
		await expect(
			hooks.event!({ event: { type: "unknown.event" as any, properties: {} } }),
		).resolves.toBeUndefined();
	});
});
