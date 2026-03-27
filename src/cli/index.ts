#!/usr/bin/env bun

/**
 * OpenCode Arise CLI 工具
 * OpenCode Arise CLI tool
 *
 * 提供命令行介面用於安裝和維護 opencode-arise 插件
 * Provides command line interface for installing and maintaining opencode-arise plugin
 */

import { existsSync, readFileSync } from "fs-extra";
import { getBanner } from "../hooks/arise-banner";
import {
	findOpencodeConfig,
	getAriseConfigPath,
	getAriseConfigPaths,
	createDefaultAriseConfig,
} from "../config/paths";
import {
	checkPluginRegistration,
	registerPlugin,

} from "../config/io";
import { AriseConfigSchema } from "../config/schema";
import { createJsonHandler } from "../utils/jsonc";
import { getErrorMessage } from "../utils/error";
import { LEGACY_PLUGIN_NAME, PLUGIN_NAME } from '../config/plugin-name';

/**
 * 建立預設 Arise 配置的處理函式
 * Handler for creating default Arise config
 *
 * 如果配置已存在則不會覆蓋
 * Won't overwrite if config already exists
 */
function createDefaultAriseConfigHandler(): void {
	const configPath = getAriseConfigPath();
	const success = createDefaultAriseConfig(configPath);

	if (success) {
		console.log(`✓ Created default config at ${configPath}`);
	} else {
		console.log(`✓ opencode-arise.json already exists at ${configPath}`);
	}
}

/**
 * 安裝命令
 * Install command
 *
 * 執行完整的安裝流程：
 * 1. 檢查 OpenCode 配置是否存在
 * 2. 檢查並處理舊版插件
 * 3. 註冊插件
 * 4. 建立預設配置
 *
 * Performs full installation:
 * 1. Check if OpenCode config exists
 * 2. Check and handle legacy plugins
 * 3. Register plugin
 * 4. Create default config
 */
function install(): void {
	console.log(getBanner());
	console.log("\n🌑 Installing opencode-arise...\n");

	const configPath = findOpencodeConfig();
	if (!configPath) {
		console.error("✗ OpenCode config not found. Is OpenCode installed?");
		console.error("  Expected: ~/.config/opencode/opencode.json");
		process.exit(1);
	}

	/**
	 * 檢查插件註冊狀態
	 * Check plugin registration status
	 *
	 * 注意：此處未檢查 checkResult.success
	 * 因為 hasLegacyPlugin 和 isRegistered 為可選屬性
	 * 若 config 讀取失敗，這些屬性為 undefined，在 if 條件中會被視為 falsy
	 *
	 * Note: success is not checked here
	 * Because hasLegacyPlugin and isRegistered are optional properties
	 * If config read fails, these properties are undefined, which are falsy in if conditions
	 */
	const checkResult = checkPluginRegistration(configPath);

	/** 顯示舊版插件警告 / Show legacy plugin warning */
	if (checkResult.hasLegacyPlugin) {
		console.log(`\n⚠️  Warning: Found legacy plugin name(s):`);
		for (const legacyName of checkResult.legacyPluginNames) {
			console.log(`  - "${legacyName}"`);
		}
		console.log(`  Please manually remove the legacy plugin name from your config file.`);
		console.log("");
	}

	/** 檢查是否已註冊 / Check if already registered */
	if (checkResult.isRegistered) {
		console.log(`✓ ${PLUGIN_NAME} is already registered`);
	} else {
		/** 註冊插件 / Register plugin */
		const success = registerPlugin(configPath);
		if (!success) {
			console.error("✗ Failed to register plugin in config");
			process.exit(1);
		}
		console.log(`✓ Added ${PLUGIN_NAME} to ${configPath}`);
	}

	createDefaultAriseConfigHandler();

	console.log("\n⚔️  Installation complete!");
	console.log("\n  The Shadow Army awaits. Run 'opencode' to begin.\n");
	console.log("  Shadows available:");
	console.log("    @beru      - Fast codebase scout (Ant King)");
	console.log("    @igris     - Precise implementation (Loyal Knight)");
	console.log("    @bellion   - Strategic planning (Grand Marshal)");
	console.log("    @tusk      - UI/UX specialist");
	console.log("    @tank      - External research");
	console.log("    @shadow-sovereign - Deep reasoning (Full Power)");
	console.log("");
}

/**
 * 診斷命令
 * Doctor command
 *
 * 檢查插件安裝狀態：
 * 1. OpenCode 配置是否存在
 * 2. 插件是否已註冊
 * 3. 是否有舊版插件
 * 4. Arise 配置是否存在
 *
 * Checks plugin installation status:
 * 1. Whether OpenCode config exists
 * 2. Whether plugin is registered
 * 3. Whether there are legacy plugins
 * 4. Whether Arise config exists
 */
function doctor(): void {
	console.log("🔍 Checking opencode-arise installation...\n");

	const configPath = findOpencodeConfig();
	if (!configPath) {
		console.log(`✗ OpenCode config not found: ${configPath}`);
	} else {
		console.log(`✓ OpenCode config: ${configPath}`);

		/**
		 * 檢查插件註冊狀態
		 * Check plugin registration status
		 *
		 * doctor() 函數會檢查 success 以區分配置讀取失敗與插件未註冊的情況
		 * doctor() function checks success to distinguish between config read failure and plugin not registered
		 */
		const result = checkPluginRegistration(configPath);

		/**
		 * 正確檢查 success 欄位
		 * Properly check the success field
		 *
		 * success = false 表示無法讀取配置檔案
		 * success = false means config file could not be read
		 */
		if (!result.success) {
			console.log(`✗ Failed to read config`);
		} else if (result.isRegistered) {
			console.log(`✓ ${PLUGIN_NAME} is registered`);
		} else {
			console.log(`✗ ${PLUGIN_NAME} is NOT registered`);
			console.log(`  Run: bunx opencode-arise install`);
		}

		/** 顯示舊版插件警告 / Show legacy plugin warning */
		if (result.hasLegacyPlugin) {
			console.log(`\n⚠️  Warning: Found legacy plugin name(s):`);
			for (const legacyName of result.legacyPluginNames) {
				console.log(`  - "${legacyName}"`);
			}
			console.log(`  Please remove the legacy plugin name and restart OpenCode.`);
		}
	}

	const ariseConfigPath = getAriseConfigPath();
	if (existsSync(ariseConfigPath)) {
		console.log(`✓ opencode-arise.json exists: ${ariseConfigPath}`);
	} else {
		console.log(`○ opencode-arise.json not found (optional): ${ariseConfigPath}`);
	}

	console.log("\n✅ Doctor check complete");
}

/**
 * 驗證命令
 * Validate command
 *
 * 檢查並驗證 Arise 配置：
 * 1. 解析所有配置檔案路徑
 * 2. 讀取並驗證配置內容
 * 3. 使用 Zod schema 進行驗證
 * 4. 顯示驗證結果和錯誤（如有）
 *
 * Validates Arise config:
 * 1. Parse all config file paths
 * 2. Read and validate config content
 * 3. Validate using Zod schema
 * 4. Display validation results and errors (if any)
 */
function validateConfig(): void {
	console.log("🔍 Validating opencode-arise configuration...\n");

	const paths = getAriseConfigPaths();
	let hasConfig = false;
	let hasErrors = false;

	for (const configPath of paths) {
		if (existsSync(configPath)) {
			hasConfig = true;
			console.log(`📄 Found config: ${configPath}`);

			try {
				const content = readFileSync(configPath, "utf-8");
				const handler = createJsonHandler(content);
				const parsed = handler.valueOf();

				/** 使用 Zod schema 驗證 / Validate using Zod schema */
				const result = AriseConfigSchema.safeParse(parsed);

				if (result.success) {
					console.log(`   ✓ Valid configuration`);

					/** 顯示有效配置摘要 / Show valid config summary */
					const config = result.data;
					if (config.disabled_shadows?.length) {
						console.log(`   Disabled shadows: ${config.disabled_shadows.join(", ")}`);
					}
					if (config.agents) {
						const agentCount = Object.keys(config.agents).length;
						console.log(`   Custom agent configs: ${agentCount}`);
					}
				} else {
					console.log(`   ✗ Invalid configuration`);
					hasErrors = true;

					/** 顯示 Zod 驗證錯誤 / Show Zod validation errors */
					for (const issue of result.error.issues) {
						console.log(`     - ${issue.path.join(".")}: ${issue.message}`);
					}
				}
			} catch (err) {
				console.log(`   ✗ Failed to parse config: ${getErrorMessage(err)}`);
				hasErrors = true;
			}
			console.log("");
		}
	}

	if (!hasConfig) {
		console.log(`○ No configuration file found (optional)`);
		console.log(`  Default configuration will be used.`);
		console.log(`  Run 'bunx opencode-arise install' to create a default config.`);
	}

	console.log("\n" + (hasErrors ? "❌ Validation failed" : "✅ Validation complete"));
	process.exit(hasErrors ? 1 : 0);
}

/**
 * 顯示幫助訊息
 * Show help message
 */
function showHelp(): void {
	console.log(`
${getBanner()}
Usage: opencode-arise <command>

Commands:
  install   Register plugin with OpenCode and create default config
  doctor    Check installation status
  validate  Validate Arise configuration
  help      Show this help message

Examples:
  bunx opencode-arise install
  npx opencode-arise install
`);
}

/**
 * 主程式入口
 * Main program entry
 *
 * 解析命令行參數並執行對應命令
 * Parse command line arguments and execute corresponding command
 */
const args = process.argv.slice(2);
const command = args[0];

	switch (command) {
	case "install":
		install();
		break;
	case "doctor":
		doctor();
		break;
	case "validate":
		validateConfig();
		break;
	case "help":
	case "--help":
	case "-h":
		showHelp();
		break;
	default:
		/** 未知命令顯示錯誤和幫助 / Unknown command shows error and help */
		if (command) {
			console.error(`Unknown command: ${command}`);
		}
		showHelp();
		process.exit(command ? 1 : 0);
}
