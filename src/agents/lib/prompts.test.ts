/**
 * Shadow Agents Prompts 測試
 * Shadow Agents Prompts Tests
 *
 * 使用 Snapshot 驗證 Shadow Agents prompts 的輸出穩定性
 * Uses Snapshots to verify Shadow Agents prompts output stability
 */

import { describe, expect, it } from "bun:test";
import { SHADOW_PROMPTS } from "./prompts";
import { EnumShadowSubAgentsName } from "../../types/enums";
import { SHADOW_DESCRIPTIONS } from "./shadow-descriptions";
import { tsObjectEntries } from "ts-type-object-entries";

/**
 * Snapshot 測試 - 驗證所有 Shadow prompts 輸出穩定性
 * Snapshot tests - verify all Shadow prompts output stability
 */
describe("SHADOW_PROMPTS Snapshot tests", () => {

	tsObjectEntries(SHADOW_PROMPTS)
		.forEach(([key, value]) => {
			it(`${SHADOW_DESCRIPTIONS[key].displayName} prompt snapshot`, () => {
				expect(value).toMatchSnapshot();
			});
		})
	;

});
