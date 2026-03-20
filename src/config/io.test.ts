/**
 * 配置 I/O 測試
 * Configuration I/O tests
 *
 * 測試 hasPlugin 和 checkPluginRegistration 函數的行為
 * Tests for hasPlugin and checkPluginRegistration functions
 */

import { describe, expect, test } from "bun:test";
import { PLUGIN_NAME, LEGACY_PLUGIN_NAME } from "./plugin-name";
import { hasPlugin, isPluginNameMatch } from "./io";

describe("isPluginNameMatch", () => {
	test("精確匹配時返回 true", () => {
		expect(isPluginNameMatch("opencode-arise", "opencode-arise")).toBe(true);
	});

	test("不匹配時返回 false", () => {
		expect(isPluginNameMatch("other-plugin", "opencode-arise")).toBe(false);
	});

	test("scoped package 精確匹配", () => {
		expect(isPluginNameMatch("@username/opencode-arise", "@username/opencode-arise")).toBe(true);
	});

	test("scoped package 不匹配 unscoped", () => {
		expect(isPluginNameMatch("@username/opencode-arise", "opencode-arise")).toBe(false);
		expect(isPluginNameMatch("opencode-arise", "@username/opencode-arise")).toBe(false);
	});
});

describe("hasPlugin", () => {
	test("空插件列表返回 null", () => {
		const result = hasPlugin([], [PLUGIN_NAME]);
		expect(result[PLUGIN_NAME]).toBeUndefined();
	});

	test("單一插件名稱匹配", () => {
		const pluginList = ["@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME]);
		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
	});

	test("多個插件中只有一個匹配", () => {
		const pluginList = ["other-plugin", "@bluelovers/opencode-arise", "another-plugin"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME]);
		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
	});

	test("舊版插件名稱匹配", () => {
		const pluginList = ["opencode-arise"];
		const result = hasPlugin(pluginList, [LEGACY_PLUGIN_NAME]);
		expect(result[LEGACY_PLUGIN_NAME]).toEqual(["opencode-arise"]);
	});

	test("同時檢查新舊插件名稱 - 只有新版", () => {
		const pluginList = ["@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
		expect(result[LEGACY_PLUGIN_NAME]).toBeUndefined();
	});

	test("同時檢查新舊插件名稱 - 只有舊版", () => {
		const pluginList = ["opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		expect(result[PLUGIN_NAME]).toBeUndefined();
		expect(result[LEGACY_PLUGIN_NAME]).toEqual(["opencode-arise"]);
	});

	test("同時檢查新舊插件名稱 - 兩者都有", () => {
		const pluginList = ["opencode-arise", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
		expect(result[LEGACY_PLUGIN_NAME]).toEqual(["opencode-arise"]);
	});

	test("陣列形式的插件名稱查詢", () => {
		const pluginList = ["plugin-a", "plugin-b", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, ["plugin-a", PLUGIN_NAME] as const);

		expect(result["plugin-a"]).toEqual(["plugin-a"]);
		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
	});

	test("多個插件匹配同一名稱", () => {
		const pluginList = [
			"opencode-arise",
			"opencode-arise@1.0.0",
		];
		const result = hasPlugin(pluginList, [LEGACY_PLUGIN_NAME]);

		// hasPlugin 會返回所有匹配的項目
		expect(result[LEGACY_PLUGIN_NAME]).toEqual([
			"opencode-arise",
			"opencode-arise@1.0.0",
		]);
	});
});

describe("checkPluginRegistration 邏輯測試", () => {
	test("無插件時 isRegistered 為 false", () => {
		const result = hasPlugin([], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const isRegistered = result[PLUGIN_NAME]?.length! > 0;

		expect(isRegistered).toBe(false);
	});

	test("有新版插件時 isRegistered 為 true", () => {
		const result = hasPlugin(["@bluelovers/opencode-arise"], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const isRegistered = result[PLUGIN_NAME]?.length! > 0;

		expect(isRegistered).toBe(true);
	});

	test("舊版插件檢測邏輯 - 只有舊版名稱", () => {
		const result = hasPlugin(["opencode-arise"], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		// 過濾舊版插件列表（排除同時匹配新版的項目）
		const legacyPluginNames = result[LEGACY_PLUGIN_NAME]?.filter(
			(plugin) => !isPluginNameMatch(plugin, PLUGIN_NAME),
		) ?? [];

		expect(legacyPluginNames.length).toBeGreaterThan(0);
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	test("舊版插件檢測邏輯 - 有新版時舊版列表為空", () => {
		const pluginList = ["opencode-arise", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		// "opencode-arise" 不匹配 "@bluelovers/opencode-arise"
		// 所以 legacyPluginNames 會包含 "opencode-arise"
		const legacyPluginNames = result[LEGACY_PLUGIN_NAME]?.filter(
			(plugin) => !isPluginNameMatch(plugin, PLUGIN_NAME),
		) ?? [];

		// 由於 "opencode-arise" 不匹配 scoped package 名稱，所以會被保留
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	test("新版插件名稱不會被視為舊版", () => {
		const pluginList = ["@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		// 過濾舊版插件列表
		const legacyPluginNames = result[LEGACY_PLUGIN_NAME]?.filter(
			(plugin) => !isPluginNameMatch(plugin, PLUGIN_NAME),
		) ?? [];

		expect(legacyPluginNames.length).toBe(0);
	});
});

describe("整合場景測試", () => {
	test("場景 1: 全新安裝 - 無插件", () => {
		const pluginList: string[] = [];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = result[LEGACY_PLUGIN_NAME]?.filter(
			(p) => !isPluginNameMatch(p, PLUGIN_NAME),
		) ?? [];

		expect(isRegistered).toBe(false);
		expect(legacyPluginNames.length).toBe(0);
	});

	test("場景 2: 正確安裝 - 使用新版名稱", () => {
		const pluginList = ["@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = result[LEGACY_PLUGIN_NAME]?.filter(
			(p) => !isPluginNameMatch(p, PLUGIN_NAME),
		) ?? [];

		expect(isRegistered).toBe(true);
		expect(legacyPluginNames.length).toBe(0);
	});

	test("場景 3: 舊版插件檢測", () => {
		const pluginList = ["opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = result[LEGACY_PLUGIN_NAME]?.filter(
			(p) => !isPluginNameMatch(p, PLUGIN_NAME),
		) ?? [];

		expect(isRegistered).toBe(false);
		expect(legacyPluginNames.length).toBe(1);
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	test("場景 4: 同時使用新舊插件", () => {
		const pluginList = ["opencode-arise", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = result[LEGACY_PLUGIN_NAME]?.filter(
			(p) => !isPluginNameMatch(p, PLUGIN_NAME),
		) ?? [];

		expect(isRegistered).toBe(true);
		expect(legacyPluginNames.length).toBe(1);
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	test("場景 5: 其他插件共存", () => {
		const pluginList = [
			"other-plugin",
			"@bluelovers/opencode-arise",
			"another-plugin",
		];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = result[LEGACY_PLUGIN_NAME]?.filter(
			(p) => !isPluginNameMatch(p, PLUGIN_NAME),
		) ?? [];

		expect(isRegistered).toBe(true);
		expect(legacyPluginNames.length).toBe(0);
	});
});
