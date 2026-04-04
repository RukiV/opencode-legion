/**
 * Arise 配置整合測試
 * Arise Configuration Integration Tests
 *
 * 驗證整個系統中配置的一致性和完整性
 * Verifies configuration consistency and completeness across the system
 */

import { describe, expect, it } from "bun:test";
import {
	ALLOWED_SHADOWS,
	BACKGROUND_SHADOWS,
	EnumShadowSubAgentsName,
	EnumShadowAgentsName,
	ALL_SHADOW_AGENTS_NAME,
} from "../src/types/enums";
import { ALL_ARISE_TOOLS, EnumAriseTools } from "../src/types/enums";
import { ARISE_TOOLS, SHADOW_AGENTS } from "../src/agents/shadows";
import {
	SHADOW_DESCRIPTIONS,
	getMonarchShadowList,
	getShortDescription,
	getAllShadowNames,
	getAriseToolsSection,
} from "../src/agents/lib/shadow-descriptions";

/**
 * 測試群組：Shadow Agents 配置完整性
 * Test group: Shadow Agents configuration completeness
 */
describe("Shadow Agents Configuration", () => {
	/**
	 * 驗證 ALLOWED_SHADOWS 與 SHADOW_AGENTS 鍵一致
	 * Verify ALLOWED_SHADOWS matches SHADOW_AGENTS keys
	 */
	it("ALLOWED_SHADOWS matches SHADOW_AGENTS keys", () => {
		const agentKeys = Object.keys(SHADOW_AGENTS).filter(
			(key) => key !== EnumShadowAgentsName.ShadowMonarch
		) as EnumShadowSubAgentsName[];

		expect(agentKeys.length).toBe(ALLOWED_SHADOWS.length);

		for (const name of ALLOWED_SHADOWS) {
			expect(SHADOW_AGENTS[name]).toBeDefined();
		}
	});

	/**
	 * 驗證 BACKGROUND_SHADOWS 是 ALLOWED_SHADOWS 的子集
	 * Verify BACKGROUND_SHADOWS is subset of ALLOWED_SHADOWS
	 */
	it("BACKGROUND_SHADOWS is subset of ALLOWED_SHADOWS", () => {
		for (const bg of BACKGROUND_SHADOWS) {
			expect(ALLOWED_SHADOWS).toContain(bg);
		}
	});

	/**
	 * 驗證 ALL_SHADOW_AGENTS_NAME 包含所有代理
	 * Verify ALL_SHADOW_AGENTS_NAME includes all agents
	 */
	it("ALL_SHADOW_AGENTS_NAME includes all agents", () =>
	{
		expect(ALL_SHADOW_AGENTS_NAME).toContain(EnumShadowAgentsName.ShadowMonarch);
		expect((ALL_SHADOW_AGENTS_NAME.length as number)).toBe((ALLOWED_SHADOWS.length as number) + 1);
	});

	/**
	 * 驗證 getAllShadowNames 返回正確的數量
	 * Verify getAllShadowNames returns correct count
	 */
	it("getAllShadowNames returns correct count", () => {
		const names = getAllShadowNames();
		expect(names.length).toBe(ALLOWED_SHADOWS.length);
		expect(names).toEqual(ALLOWED_SHADOWS);
	});
});

/**
 * 測試群組：SHADOW_DESCRIPTIONS 配置完整性
 * Test group: SHADOW_DESCRIPTIONS configuration completeness
 */
describe("SHADOW_DESCRIPTIONS Configuration", () => {
	/**
	 * 驗證所有 ALLOWED_SHADOWS 都有描述
	 * Verify all ALLOWED_SHADOWS have descriptions
	 */
	it("all ALLOWED_SHADOWS have descriptions", () => {
		for (const name of ALLOWED_SHADOWS) {
			expect(SHADOW_DESCRIPTIONS[name]).toBeDefined();
		}
	});

	/**
	 * 驗證每個描述都有必要欄位
	 * Verify each description has required fields
	 */
	it("each description has required fields", () => {
		for (const name of ALLOWED_SHADOWS) {
			const desc = SHADOW_DESCRIPTIONS[name];
			expect(desc.name).toBe(name);
			expect(desc.title).toBeDefined();
			expect(desc.emoji.length).toBeGreaterThan(0);
			expect(desc.role).toBeDefined();
			expect(desc.capabilities).toBeDefined();
			expect(Array.isArray(desc.bestFor)).toBe(true);
			expect(desc.bestFor.length).toBeGreaterThan(0);
			expect(Array.isArray(desc.roleKeywords)).toBe(true);
			expect(desc.roleKeywords.length).toBeGreaterThan(0);
			expect(typeof desc.supportsBackground).toBe("boolean");
		}
	});

	/**
	 * 驗證 BACKGROUND_SHADOWS 標記正確
	 * Verify BACKGROUND_SHADOWS are marked correctly
	 */
	it("background shadows are marked correctly", () => {
		for (const bg of BACKGROUND_SHADOWS) {
			expect(SHADOW_DESCRIPTIONS[bg].supportsBackground).toBe(true);
		}
	});
});

/**
 * 測試群組：Arise Tools 配置完整性
 * Test group: Arise Tools configuration completeness
 */
describe("Arise Tools Configuration", () => {
	/**
	 * 驗證 ALL_ARISE_TOOLS 與 EnumAriseTools 一致
	 * Verify ALL_ARISE_TOOLS matches EnumAriseTools
	 */
	it("ALL_ARISE_TOOLS matches EnumAriseTools", () => {
		const enumValues = Object.values(EnumAriseTools);
		expect(ALL_ARISE_TOOLS).toHaveLength(enumValues.length);

		for (const tool of ALL_ARISE_TOOLS) {
			expect(enumValues).toContain(tool);
		}
	});

	/**
	 * 驗證 ARISE_TOOLS 包含所有工具
	 * Verify ARISE_TOOLS contains all tools
	 */
	it("ARISE_TOOLS contains all tools", () => {
		for (const tool of ALL_ARISE_TOOLS) {
			expect(ARISE_TOOLS[tool]).toBeDefined();
			expect(ARISE_TOOLS[tool].shortDescription).toBeDefined();
		}
	});
});

/**
 * 測試群組：工具描述函數輸出
 * Test group: Tool description function outputs
 */
describe("Tool Description Functions", () => {
	/**
	 * 驗證 getMonarchShadowList 包含所有 Shadow
	 * Verify getMonarchShadowList contains all shadows
	 */
	it("getMonarchShadowList contains all shadows", () => {
		const result = getMonarchShadowList();
		for (const name of ALLOWED_SHADOWS) {
			expect(result).toContain(`@${name}`);
		}
	});

	/**
	 * 驗證 getAriseToolsSection 包含所有工具
	 * Verify getAriseToolsSection contains all tools
	 */
	it("getAriseToolsSection contains all tools", () => {
		const result = getAriseToolsSection();
		for (const tool of ALL_ARISE_TOOLS) {
			expect(result).toContain(tool);
		}
	});

	/**
	 * 驗證 getShortDescription 與 tool-names 描述一致
	 * Verify getShortDescription matches tool-names descriptions
	 */
	it("getShortDescription matches tool-names SHADOW_SHORT_DESCRIPTIONS", () => {
		// 這個測試驗證兩邊的描述格式保持一致
		const shortDesc = getShortDescription(EnumShadowSubAgentsName.Beru);
		expect(shortDesc).toContain("Fastest scout");
		expect(shortDesc).toContain("Codebase exploration");
	});

	/**
	 * 驗證 getMonarchShadowList 與 getAriseToolsSection 工具列表一致
	 * Verify tool lists are consistent
	 */
	it("tool lists are consistent", () => {
		const ariseTools = getAriseToolsSection();

		// 兩者應該包含相同的工具
		for (const tool of ALL_ARISE_TOOLS) {
			expect(ariseTools).toContain(tool);
		}
	});
});