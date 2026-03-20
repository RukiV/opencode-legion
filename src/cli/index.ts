#!/usr/bin/env bun

import { existsSync } from "fs";
import { getBanner } from "../hooks/arise-banner";
import {
	findOpencodeConfig,
	getAriseConfigPath,
	createDefaultAriseConfig,
} from "../config/paths";
import {
	checkPluginRegistration,
	registerPlugin,

} from "../config/io";
import { LEGACY_PLUGIN_NAME, PLUGIN_NAME } from '../config/plugin-name';

function createDefaultAriseConfigHandler(): void {
	const configPath = getAriseConfigPath();
	const success = createDefaultAriseConfig(configPath);

	if (success) {
		console.log(`✓ Created default config at ${configPath}`);
	} else {
		console.log(`✓ opencode-arise.json already exists at ${configPath}`);
	}
}

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

	if (checkResult.hasLegacyPlugin) {
		console.log(`\n⚠️  Warning: Found legacy plugin name(s):`);
		for (const legacyName of checkResult.legacyPluginNames) {
			console.log(`  - "${legacyName}"`);
		}
		console.log(`  Please manually remove the legacy plugin name from your config file.`);
		console.log("");
	}

	if (checkResult.isRegistered) {
		console.log(`✓ ${PLUGIN_NAME} is already registered`);
	} else {
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

function showHelp(): void {
	console.log(`
${getBanner()}
Usage: opencode-arise <command>

Commands:
  install   Register plugin with OpenCode and create default config
  doctor    Check installation status
  help      Show this help message

Examples:
  bunx opencode-arise install
  npx opencode-arise install
`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
	case "install":
		install();
		break;
	case "doctor":
		doctor();
		break;
	case "help":
	case "--help":
	case "-h":
		showHelp();
		break;
	default:
		if (command) {
			console.error(`Unknown command: ${command}`);
		}
		showHelp();
		process.exit(command ? 1 : 0);
}
