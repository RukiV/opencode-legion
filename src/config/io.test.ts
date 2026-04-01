/**
 * 配置 I/O 測試
 * Configuration I/O tests
 *
 * 測試 hasPlugin 和 checkPluginRegistration 函數的行為
 * Tests for hasPlugin and checkPluginRegistration functions
 *
 * 測試重點：
 * 1. 插件名稱精確匹配與scoped package匹配
 * 2. 新舊插件名稱的區分邏輯
 * 3. 多個插件同時存在的場景
 * 4. 整合場景（從使用者角度的完整流程）
 *
 * Test focus areas:
 * 1. Plugin name exact matching and scoped package matching
 * 2. New vs legacy plugin name differentiation logic
 * 3. Scenarios with multiple plugins
 * 4. Integration scenarios (complete flow from user perspective)
 */

import { describe, expect, test } from "bun:test";
import { PLUGIN_NAME, LEGACY_PLUGIN_NAME } from "../types/const-default";
import { hasPlugin, isPluginNameMatch, getLegacyPluginNamesFromResult, isPluginRegisteredFromResult } from "./io";

/**
 * isPluginRegisteredFromResult 函數測試
 * isPluginRegisteredFromResult function tests
 *
 * 測試從 hasPlugin 結果中判斷插件是否已註冊的邏輯
 * Tests logic for checking if plugin is registered from hasPlugin result
 */
describe("isPluginRegisteredFromResult", () => {
	test("已註冊時返回 true", () => {
		const result = hasPlugin(["@bluelovers/opencode-arise"], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);

		/** 有匹配 PLUGIN_NAME 的插件 / Has plugins matching PLUGIN_NAME */
		expect(isRegistered).toBe(true);
	});

	test("未註冊時返回 false", () => {
		const result = hasPlugin([], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);

		/** 無匹配 PLUGIN_NAME 的插件 / No plugins matching PLUGIN_NAME */
		expect(isRegistered).toBe(false);
	});

	test("只有舊版插件時返回 false", () => {
		const result = hasPlugin(["opencode-arise"], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);

		/** 舊版插件不視為已註冊新版 / Legacy plugins are not considered registered as new */
		expect(isRegistered).toBe(false);
	});
});

/**
 * getLegacyPluginNamesFromResult 函數測試
 * getLegacyPluginNamesFromResult function tests
 *
 * 測試從 hasPlugin 結果中取得舊版插件名稱的邏輯
 * Tests logic for getting legacy plugin names from hasPlugin result
 */
describe("getLegacyPluginNamesFromResult", () => {
	test("有舊版插件時返回陣列", () => {
		/** 模擬 hasPlugin 返回的結果 / Mock hasPlugin result */
		const result = hasPlugin(["opencode-arise"], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const legacyNames = getLegacyPluginNamesFromResult(result);

		/** 有匹配舊版名稱的插件 / Has plugins matching legacy name */
		expect(legacyNames).toEqual(["opencode-arise"]);
	});

	test("只有新版插件時返回空陣列", () => {
		const result = hasPlugin(["@bluelovers/opencode-arise"], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const legacyNames = getLegacyPluginNamesFromResult(result);

		/** Scoped package 只匹配新版，不在 legacy 名稱中 / Scoped package only matches new, not in legacy */
		expect(legacyNames).toEqual([]);
	});

	test("同時有新舊插件時只返回舊版", () => {
		const pluginList = ["opencode-arise", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const legacyNames = getLegacyPluginNamesFromResult(result);

		/** 函數自動過濾，只返回真正的舊版插件 / Function auto-filters, returns only genuine legacy plugins */
		expect(legacyNames).toEqual(["opencode-arise"]);
	});

	test("多個舊版插件時返回所有匹配", () => {
		const pluginList = ["opencode-arise", "opencode-arise@1.0.0"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const legacyNames = getLegacyPluginNamesFromResult(result);

		/** 返回所有只匹配舊版名稱的插件 / Returns all plugins only matching legacy name */
		expect(legacyNames).toEqual(["opencode-arise", "opencode-arise@1.0.0"]);
	});

	test("空結果時返回空陣列", () => {
		const result = hasPlugin([], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const legacyNames = getLegacyPluginNamesFromResult(result);

		/** 無任何插件時返回空陣列 / Returns empty array when no plugins */
		expect(legacyNames).toEqual([]);
	});
});

/**
 * isPluginNameMatch 函數測試
 * isPluginNameMatch function tests
 *
 * 測試插件名稱比對的基本行為
 * Tests basic plugin name matching behavior
 */
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
		/**
		 * Scoped package 和 unscoped package 是不同的套件名稱
		 * Scoped package and unscoped package are different package names
		 *
		 * "@username/opencode-arise" !== "opencode-arise"
		 */
		expect(isPluginNameMatch("@username/opencode-arise", "opencode-arise")).toBe(false);
		expect(isPluginNameMatch("opencode-arise", "@username/opencode-arise")).toBe(false);
	});
});

/**
 * hasPlugin 函數測試
 * hasPlugin function tests
 *
 * 測試插件清單查詢的各種場景
 * Tests various scenarios for plugin list queries
 */
describe("hasPlugin", () => {
	test("空插件列表返回 undefined", () => {
		const result = hasPlugin([], [PLUGIN_NAME]);
		/** 空列表不會產生任何匹配結果 / Empty list produces no match results */
		expect(result[PLUGIN_NAME]).toBeUndefined();
	});

	test("單一插件名稱匹配", () => {
		const pluginList = ["@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME]);
		/** 返回匹配的插件陣列 / Returns array of matched plugins */
		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
	});

	test("多個插件中只有一個匹配", () => {
		const pluginList = ["other-plugin", "@bluelovers/opencode-arise", "another-plugin"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME]);
		/** 只返回實際匹配的項目 / Only returns actually matched items */
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

		/** Scoped package 只匹配新版名稱 / Scoped package only matches new name */
		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
		expect(result[LEGACY_PLUGIN_NAME]).toBeUndefined();
	});

	test("同時檢查新舊插件名稱 - 只有舊版", () => {
		const pluginList = ["opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		/** Unscoped 名稱只匹配舊版名稱 / Unscoped name only matches legacy name */
		expect(result[PLUGIN_NAME]).toBeUndefined();
		expect(result[LEGACY_PLUGIN_NAME]).toEqual(["opencode-arise"]);
	});

	test("同時檢查新舊插件名稱 - 兩者都有", () => {
		const pluginList = ["opencode-arise", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		/** 兩個不同的插件，分別匹配新舊名稱 / Two different plugins, matching new and legacy respectively */
		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
		expect(result[LEGACY_PLUGIN_NAME]).toEqual(["opencode-arise"]);
	});

	test("陣列形式的插件名稱查詢", () => {
		const pluginList = ["plugin-a", "plugin-b", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, ["plugin-a", PLUGIN_NAME] as const);

		/** 可以同時查詢多個插件名稱 / Can query multiple plugin names simultaneously */
		expect(result["plugin-a"]).toEqual(["plugin-a"]);
		expect(result[PLUGIN_NAME]).toEqual(["@bluelovers/opencode-arise"]);
	});

	test("多個插件匹配同一名稱", () => {
		const pluginList = [
			"opencode-arise",
			"opencode-arise@1.0.0",
		];
		const result = hasPlugin(pluginList, [LEGACY_PLUGIN_NAME]);

		/** hasPlugin 會返回所有匹配的項目 / hasPlugin returns all matched items */
		expect(result[LEGACY_PLUGIN_NAME]).toEqual([
			"opencode-arise",
			"opencode-arise@1.0.0",
		]);
	});
});

/**
 * checkPluginRegistration 邏輯測試
 * checkPluginRegistration logic tests
 *
 * 測試插件註冊狀態判斷的核心邏輯
 * Tests core logic for plugin registration status determination
 */
describe("checkPluginRegistration 邏輯測試", () => {
	test("無插件時 isRegistered 為 false", () => {
		const result = hasPlugin([], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);

		expect(isRegistered).toBe(false);
	});

	test("有新版插件時 isRegistered 為 true", () => {
		const result = hasPlugin(["@bluelovers/opencode-arise"], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);
		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);

		expect(isRegistered).toBe(true);
	});

	test("舊版插件檢測邏輯 - 只有舊版名稱", () => {
		const result = hasPlugin(["opencode-arise"], [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		/** 使用工具函數取得舊版插件名稱 / Use utility function to get legacy plugin names */
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 只有舊版名稱時，legacyPluginNames 包含該插件 / Only legacy name exists, legacyPluginNames contains it */
		expect(legacyPluginNames.length).toBeGreaterThan(0);
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	test("舊版插件檢測邏輯 - 有新舊插件同時存在", () => {
		const pluginList = ["opencode-arise", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		/** 使用工具函數取得舊版插件名稱 / Use utility function to get legacy plugin names */
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** "opencode-arise" 保留因為它只匹配舊版名稱 / "opencode-arise" is kept because it only matches legacy name */
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	test("新版插件名稱不會被視為舊版", () => {
		const pluginList = ["@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		/** 使用工具函數取得舊版插件名稱 / Use utility function to get legacy plugin names */
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** Scoped package 匹配 PLUGIN_NAME，所以不在 legacy 名稱中 / Scoped package matches PLUGIN_NAME, so not in legacy names */
		expect(legacyPluginNames.length).toBe(0);
	});
});

/**
 * 整合場景測試
 * Integration scenario tests
 *
 * 模擬真實使用者場景，測試完整流程
 * Simulates real user scenarios, testing complete flows
 *
 * 每個測試代表一個典型的使用者安裝/升級情境
 * Each test represents a typical user install/upgrade scenario
 */
describe("整合場景測試", () => {
	/**
	 * 場景 1: 全新安裝 - 無插件
	 * Scenario 1: Fresh install - no plugins
	 *
	 * 使用者剛安裝 OpenCode，尚未註冊任何插件
	 * User just installed OpenCode, hasn't registered any plugins yet
	 */
	test("場景 1: 全新安裝 - 無插件", () => {
		const pluginList: string[] = [];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 未註冊，也沒有舊版插件 / Not registered, no legacy plugins */
		expect(isRegistered).toBe(false);
		expect(legacyPluginNames.length).toBe(0);
	});

	test("場景 2: 正確安裝 - 使用新版名稱", () => {
		const pluginList = ["@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 插件已註冊，沒有舊版插件 / Plugin registered, no legacy plugins */
		expect(isRegistered).toBe(true);
		expect(legacyPluginNames.length).toBe(0);
	});

	test("場景 3: 舊版插件檢測", () => {
		const pluginList = ["opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 未註冊新版，但有舊版插件 / Not registered new, but has legacy plugin */
		expect(isRegistered).toBe(false);
		expect(legacyPluginNames.length).toBe(1);
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	test("場景 4: 同時使用新舊插件", () => {
		const pluginList = ["opencode-arise", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 新版已註冊，舊版仍然存在 / New version registered, legacy still present */
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

		const isRegistered = isPluginRegisteredFromResult(result, PLUGIN_NAME);
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 插件已註冊，不影響其他插件 / Plugin registered, doesn't affect other plugins */
		expect(isRegistered).toBe(true);
		expect(legacyPluginNames.length).toBe(0);
	});

	/**
	 * 場景 2: 正確安裝 - 使用新版名稱
	 * Scenario 2: Correct install - using new name
	 *
	 * 使用者使用正確的新版插件名稱安裝
	 * User installs using correct new plugin name
	 */
	test("場景 2: 正確安裝 - 使用新版名稱", () => {
		const pluginList = ["@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 插件已註冊，沒有舊版插件 / Plugin registered, no legacy plugins */
		expect(isRegistered).toBe(true);
		expect(legacyPluginNames.length).toBe(0);
	});

	/**
	 * 場景 3: 舊版插件檢測
	 * Scenario 3: Legacy plugin detection
	 *
	 * 使用者使用舊版插件名稱，可能需要升級提示
	 * User using legacy plugin name, may need upgrade prompt
	 */
	test("場景 3: 舊版插件檢測", () => {
		const pluginList = ["opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 未註冊新版，但有舊版插件 / Not registered new, but has legacy plugin */
		expect(isRegistered).toBe(false);
		expect(legacyPluginNames.length).toBe(1);
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	/**
	 * 場景 4: 同時使用新舊插件
	 * Scenario 4: Using both new and legacy plugins
	 *
	 * 使用者同時安裝了新舊版本（可能是升級過程中的過渡狀態）
	 * User has both versions installed (possibly transitional state during upgrade)
	 */
	test("場景 4: 同時使用新舊插件", () => {
		const pluginList = ["opencode-arise", "@bluelovers/opencode-arise"];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 新版已註冊，舊版仍然存在 / New version registered, legacy still present */
		expect(isRegistered).toBe(true);
		expect(legacyPluginNames.length).toBe(1);
		expect(legacyPluginNames).toEqual(["opencode-arise"]);
	});

	/**
	 * 場景 5: 其他插件共存
	 * Scenario 5: Coexistence with other plugins
	 *
	 * 與其他插件共存，驗證不會影響其他插件的檢測
	 * Coexists with other plugins, verifying it doesn't affect detection of other plugins
	 */
	test("場景 5: 其他插件共存", () => {
		const pluginList = [
			"other-plugin",
			"@bluelovers/opencode-arise",
			"another-plugin",
		];
		const result = hasPlugin(pluginList, [PLUGIN_NAME, LEGACY_PLUGIN_NAME] as const);

		const isRegistered = result[PLUGIN_NAME]?.length! > 0;
		const legacyPluginNames = getLegacyPluginNamesFromResult(result);

		/** 插件已註冊，不影響其他插件 / Plugin registered, doesn't affect other plugins */
		expect(isRegistered).toBe(true);
		expect(legacyPluginNames.length).toBe(0);
	});
});
