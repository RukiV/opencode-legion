import { describe, expect, it, test, beforeEach, afterEach, mock } from "bun:test";
import { createAgentToolAriseSyncSummon } from "./arise-summon";
import {
	createAgentToolAriseBackgroundTask,
	createAgentToolAriseBackgroundOutput,
	createAgentToolAriseBackgroundStatus,
	createAgentToolAriseBackgroundCancel,
} from "./arise-background";
import { BackgroundManager } from "./lib/background-manager";

// Mock context for testing
const mockCtx = {
	client: {
		session: {
			create: async () => ({ data: { id: "test-session" } }),
			prompt: async () => ({}),
			promptAsync: async () => ({}),
			messages: async () => ({ data: [] }),
			status: async () => ({ data: {} }),
			abort: async () => ({}),
		},
		tui: {
			showToast: async () => {},
		},
	},
	project: { id: "test", worktree: "/tmp" },
	directory: "/tmp",
	worktree: "/tmp",
	serverUrl: new URL("http://localhost:4096"),
	$: {} as any,
} as any;

describe("arise_summon tool", () =>
{
	it("has correct structure", () =>
	{
		const tool = createAgentToolAriseSyncSummon(mockCtx);

		expect(tool).toMatchObject({
			description: expect.stringContaining("shadow"),
			args: expect.any(Object),
			execute: expect.any(Function),
		})
	});

	it("has all required args", () =>
	{
		const tool = createAgentToolAriseSyncSummon(mockCtx);

		expect(tool.args).toMatchObject({
			shadow: expect.anything(),
			prompt: expect.anything(),
			run_in_background: expect.anything(),
			description: expect.anything(),
		})
	});

	it("lists all shadows in description", () =>
	{
		const tool = createAgentToolAriseSyncSummon(mockCtx);

		expect(tool.description).toContain("nightmare");
		expect(tool.description).toContain("saint");
		expect(tool.description).toContain("cassie");
		expect(tool.description).toContain("fiend");
		expect(tool.description).toContain("slayer");
		expect(tool.description).toContain("weaver");
	});
});

describe("Background tools", () =>
{
	const backgroundManager = new BackgroundManager(mockCtx);

	describe("arise_background tool", () =>
	{
		it("has correct structure", () =>
		{
			const tool = createAgentToolAriseBackgroundTask(backgroundManager);

			expect(tool).toBeDefined();
			expect(tool.description).toContain("background");
			expect(tool.args.shadow).toBeDefined();
			expect(tool.args.prompt).toBeDefined();
			expect(tool.args.description).toBeDefined();
			expect(typeof tool.execute).toBe("function");
		});
	});

	describe("arise_background_output tool", () =>
	{
		it("has correct structure", () =>
		{
			const tool = createAgentToolAriseBackgroundOutput(backgroundManager);

			expect(tool).toBeDefined();
			expect(tool.args.task_id).toBeDefined();
			expect(typeof tool.execute).toBe("function");
		});

		it("returns not found for invalid task_id", async () =>
		{
			const tool = createAgentToolAriseBackgroundOutput(backgroundManager);
			const result = await tool.execute({ task_id: "invalid-id" });

			expect(result).toContain("not found");
		});
	});

	describe("arise_background_status tool", () =>
	{
		it("has correct structure", () =>
		{
			const tool = createAgentToolAriseBackgroundStatus(backgroundManager);

			expect(tool).toBeDefined();
			expect(typeof tool.execute).toBe("function");
		});

		it("returns empty message when no tasks", async () =>
		{
			const tool = createAgentToolAriseBackgroundStatus(backgroundManager);
			const mockContext = { sessionID: "test", messageID: "test", agent: "test", abort: new AbortController().signal };
			const result = await tool.execute({ current_session_only: false }, mockContext);

			expect(result).toContain("No background tasks");
		});
	});

	describe("arise_background_cancel tool", () =>
	{
		it("has correct structure", () =>
		{
			const tool = createAgentToolAriseBackgroundCancel(backgroundManager);

			expect(tool).toBeDefined();
			expect(tool.args.task_id).toBeDefined();
			expect(typeof tool.execute).toBe("function");
		});

		it("returns failure for invalid task_id", async () =>
		{
			const tool = createAgentToolAriseBackgroundCancel(backgroundManager);
			const result = await tool.execute({ task_id: "invalid-id" });

			expect(result).toContain("Could not cancel");
		});
	});
});

describe("BackgroundManager", () =>
{
	it("generates unique task IDs", () =>
	{
		const manager = new BackgroundManager(mockCtx);

		const id1 = manager.generateTaskId();
		const id2 = manager.generateTaskId();

		expect(id1).not.toBe(id2);
		expect(id1).toMatch(/^arise_/);
		expect(id2).toMatch(/^arise_/);
	});

	it("returns undefined for non-existent task", () =>
	{
		const manager = new BackgroundManager(mockCtx);

		const task = manager.getTask("non-existent");
		expect(task).toBeUndefined();
	});

	it("returns empty array when no tasks", () =>
	{
		const manager = new BackgroundManager(mockCtx);

		const tasks = manager.getAllTasks();
		expect(tasks).toEqual([]);
	});
});
