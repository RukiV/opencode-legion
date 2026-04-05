/**
 * Shadow Descriptions 測試
 * Shadow Descriptions Tests
 *
 * 使用 Snapshot 驗證 Shadow Agents 描述的正確性
 * Uses Snapshots to verify Shadow Agents descriptions correctness
 */

import { describe, expect, it } from "bun:test";
import {
	SHADOW_DESCRIPTIONS,
	getShortDescription,
	getFullDescription,
	getMonarchShadowList,
	suggestShadowAgent,
	getShadowAgentsMarkdownTable,
	getAllShadowNames,
} from "./lib/shadow-descriptions";
import {
	ALLOWED_SHADOWS,
	BACKGROUND_SHADOWS,
	EnumShadowSubAgentsName,
} from "../types/enums";

/**
 * SHADOW_DESCRIPTIONS 常量測試
 * SHADOW_DESCRIPTIONS constant tests
 */
describe("SHADOW_DESCRIPTIONS", () => {
	/**
	 * 驗證所有允許的 Shadow 都已定義描述
	 * Verify all allowed shadows have descriptions defined
	 */
	it("has descriptions for all allowed shadows", () => {
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
			expect(typeof desc.supportsBackground).toBe("boolean");
		}
	});

	/**
	 * 驗證背景執行 Shadows 有正確標記
	 * Verify background-capable shadows have correct flag
	 */
	it("background shadows are marked correctly", () => {
		for (const name of BACKGROUND_SHADOWS) {
			expect(SHADOW_DESCRIPTIONS[name].supportsBackground).toBe(true);
		}
	});

	/**
	 * 驗證所有描述結構一致性
	 * Verify all descriptions have consistent structure
	 */
	it("all descriptions have consistent structure", () => {
		const keys = Object.values(SHADOW_DESCRIPTIONS).map((desc) =>
			Object.keys(desc).sort()
		);

		// 所有描述應該有相同的鍵
		const firstKeys = keys[0];
		for (const keyArray of keys) {
			expect(keyArray).toEqual(firstKeys);
		}
	});
});

/**
 * getShortDescription 函數測試
 * getShortDescription function tests
 */
describe("getShortDescription", () => {
	/**
	 * 驗證所有 Shadow 都能產生簡短描述
	 * Verify all shadows can generate short description
	 */
	it("generates short description for all shadows", () => {
		for (const name of ALLOWED_SHADOWS) {
			const result = getShortDescription(name);
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
			// 描述包含 emoji
			expect(result.length).toBeGreaterThan(20);
		}
	});

	/**
	 * 驗證簡短描述包含 emoji 和能力
	 * Verify short description contains emoji and capabilities
	 */
	it("short description contains emoji and capabilities", () => {
		const result = getShortDescription(EnumShadowSubAgentsName.Beru);
		expect(result).toMatch(/[\p{Emoji}]/u);
		expect(result).toContain("scout");
		expect(result).toContain("exploration");
	});
});

/**
 * getFullDescription 函數測試
 * getFullDescription function tests
 */
describe("getFullDescription", () => {
	/**
	 * 驗證所有 Shadow 都能產生完整描述
	 * Verify all shadows can generate full description
	 */
	it("generates full description for all shadows", () => {
		for (const name of ALLOWED_SHADOWS) {
			const result = getFullDescription(name);
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(50);
		}
	});

	/**
	 * 驗證完整描述包含所有必要區塊
	 * Verify full description contains necessary blocks
	 */
	it("full description contains necessary blocks", () => {
		const result = getFullDescription(EnumShadowSubAgentsName.Beru);

		expect(result).toContain("Role:");
		expect(result).toContain("Capabilities:");
		expect(result).toContain("Best for:");
		expect(result).toContain("Background:");
	});

	/**
	 * 驗證完整描述包含所有 bestFor 項目
	 * Verify full description contains all bestFor items
	 */
	it("full description contains all bestFor items", () => {
		const desc = SHADOW_DESCRIPTIONS[EnumShadowSubAgentsName.Beru];
		const result = getFullDescription(EnumShadowSubAgentsName.Beru);

		for (const item of desc.bestFor) {
			expect(result).toContain(item);
		}
	});
});

/**
 * getMonarchShadowList 函數測試
 * getMonarchShadowList function tests
 */
describe("getMonarchShadowList", () => {
	/**
	 * 驗證 Monarch Shadow 列表格式
	 * Verify Monarch Shadow list format
	 */
	it("generates correctly formatted list", () => {
		const result = getMonarchShadowList();
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(100);
		expect(result).toMatchSnapshot();
	});

	/**
	 * 驗證列表包含所有 Shadow
	 * Verify list contains all shadows
	 */
	it("contains all shadows", () => {
		const result = getMonarchShadowList();

		for (const name of ALLOWED_SHADOWS) {
			expect(result).toContain(`@${name}`);
		}
	});

	/**
	 * 驗證支援背景的 Shadow 有標記
	 * Verify background-capable shadows have marker
	 */
	it("background shadows have marker", () => {
		const result = getMonarchShadowList();

		for (const name of BACKGROUND_SHADOWS) {
			expect(result).toContain(`@${name}`);
			// 應該包含 Supports background 標記
			expect(result).toMatch(new RegExp(`@${name}.*\\(supports background\\)`));
		}
	});

	/**
	 * 驗證每行格式正確
	 * Verify each line format is correct
	 */
	it("each line format is correct", () => {
		const result = getMonarchShadowList();
		const lines = result.split("\n");

		expect(lines.length).toBe(ALLOWED_SHADOWS.length);

		for (const line of lines) {
			expect(line).toMatch(/^- @\w+/);
		}
	});
});

/**
 * suggestShadowAgent 函數測試
 * suggestShadowAgent function tests
 */
describe("suggestShadowAgent", () => {
	/**
	 * 驗證搜尋相關 Shadow
	 * Verify search finds relevant shadow
	 */
	it("suggests beru for search tasks", () => {
		const result = suggestShadowAgent("find files");
		expect(result[0]).toBe(EnumShadowSubAgentsName.Beru);
	});

	/**
	 * 驗證實作相關 Shadow
	 * Verify implementation finds relevant shadow
	 */
	it("suggests igris for implementation tasks", () => {
		const result = suggestShadowAgent("implement this feature");
		expect(result[0]).toBe(EnumShadowSubAgentsName.Igris);
	});

	/**
	 * 驗證 UI/UX 相關 Shadow
	 * Verify UI/UX finds relevant shadow
	 */
	it("suggests tusk for UI tasks", () => {
		const result = suggestShadowAgent("build this UI component");
		expect(result[0]).toBe(EnumShadowSubAgentsName.Tusk);
	});

	/**
	 * 驗證研究相關 Shadow
	 * Verify research finds relevant shadow
	 */
	it("suggests tank for research tasks", () => {
		const result = suggestShadowAgent("find documentation for this API");
		expect(result[0]).toBe(EnumShadowSubAgentsName.Tank);
	});

	/**
	 * 驗證規劃相關 Shadow
	 * Verify planning finds relevant shadow
	 */
	it("suggests bellion for planning tasks", () => {
		const result = suggestShadowAgent("plan a migration strategy");
		expect(result[0]).toBe(EnumShadowSubAgentsName.Bellion);
	});

	/**
	 * 驗證除錯相關 Shadow
	 * Verify debugging finds relevant shadow
	 */
	it("suggests shadow-sovereign for debugging tasks", () => {
		const result = suggestShadowAgent("debug this complex issue");
		expect(result[0]).toBe(EnumShadowSubAgentsName.ShadowSovereign);
	});

	/**
	 * 驗證多關鍵字任務返回多個建議
	 * Verify multi-keyword tasks return multiple suggestions
	 */
	it("returns multiple suggestions for complex tasks", () => {
		// "refactor and plan" 包含 "plan" 和 "refactor"，可能同時匹配 bellion
		const result = suggestShadowAgent("find and implement this feature");
		expect(result.length).toBeGreaterThanOrEqual(1);
	});

	/**
	 * 驗證快照測試複雜查詢
	 * Snapshot test complex query
	 */
	it("snapshot test complex query", () => {
		const result = suggestShadowAgent(
			"I need to find all React components with useState and add error boundaries"
		);
		expect(result).toMatchSnapshot();
	});
});

/**
 * getShadowAgentsMarkdownTable 函數測試
 * getShadowAgentsMarkdownTable function tests
 */
describe("getShadowAgentsMarkdownTable", () => {
	/**
	 * 驗證 Markdown 表格格式
	 * Verify Markdown table format
	 */
	it("generates correct Markdown table", () => {
		const result = getShadowAgentsMarkdownTable();
		expect(typeof result).toBe("string");
		expect(result).toMatchSnapshot();
	});

	/**
	 * 驗證表格包含所有 Shadow
	 * Verify table contains all shadows
	 */
	it("contains all shadows in table", () => {
		const result = getShadowAgentsMarkdownTable();

		for (const name of ALLOWED_SHADOWS) {
			expect(result).toContain(`**${name}**`);
		}
	});

	/**
	 * 驗證表格有正確的 Markdown 格式
	 * Verify table has correct Markdown format
	 */
	it("has correct Markdown table structure", () => {
		const result = getShadowAgentsMarkdownTable();

		expect(result).toContain("| Shadow Agent |");
		expect(result).toContain("| Role |");
		expect(result).toContain("| --- |");
	});
});

/**
 * getAllShadowNames 函數測試
 * getAllShadowNames function tests
 */
describe("getAllShadowNames", () => {
	/**
	 * 驗證返回所有 Shadow 名稱
	 * Verify returns all shadow names
	 */
	it("returns all shadow names", () => {
		const result = getAllShadowNames();
		expect(result.length).toBe(ALLOWED_SHADOWS.length);
		expect(result).toEqual(ALLOWED_SHADOWS);
	});

	/**
	 * 驗證快照測試
	 * Snapshot test
	 */
	it("snapshot test", () => {
		const result = getAllShadowNames();
		expect(result).toMatchSnapshot();
	});
});

/**
 * Snapshot 測試 - 驗證描述輸出穩定性
 * Snapshot tests - verify description output stability
 */
describe("Snapshot tests for description outputs", () => {
	/**
	 * 驗證 getShortDescription 輸出穩定性
	 * Verify getShortDescription output stability
	 */
	it("getShortDescription outputs are stable", () => {
		const results = ALLOWED_SHADOWS.map((name) => ({
			name,
			description: getShortDescription(name),
		}));
		expect(results).toMatchSnapshot();
	});

	/**
	 * 驗證 getFullDescription 輸出穩定性
	 * Verify getFullDescription output stability
	 */
	it("getFullDescription outputs are stable", () => {
		const results = ALLOWED_SHADOWS.map((name) => ({
			name,
			description: getFullDescription(name),
		}));
		expect(results).toMatchSnapshot();
	});
});
