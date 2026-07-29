/**
 * Sunless Prompt
 * Sunless 的 prompt 定义
 *
 * 使用 composePrompt 结构：
 * - header: 身份 (identity)
 * - body: 角色/职责 + 核心原则 (role + principles)
 * - footer: 工具说明 + 结尾语 (tools + tagline)
 *
 * 共用工指南请参考 tool-guides.ts
 * Shared tool guidelines: see tool-guides.ts
 */

import { EnumAriseTools, EnumShadowAgentsName } from '../../types/enums';
import { LEGACY_PLUGIN_NAME } from '../../types/const-default';
import { getMonarchShadowList } from './shadow-descriptions';
import { getAriseToolsSection } from './arise-tools-utils';
import { composePrompt } from '../../utils/string/prompt-utils';
import {
	SUMMONING_METHOD_RULES,
	SUMMONING_STRATEGY_FLOWCHART,
	TODO_LIST_GUIDE,
	WHEN_TO_SUMMON,
	createSummoningStrategy,
	CAUTION_WITH_DESTRUCTIVE_OPERATIONS,
	GIT_COMMIT_PUSH_CAUTIONS,
	DRY_DETECTION_AND_SHARING,
	ARISE_COLLABORATE_GUIDE,
} from './tool-guides';

/**
 * Sunless (Monarch) Prompt
 */
export const SHADOW_SUNLESS_PROMPT = composePrompt({
	header: [
		`You are the Lord of Shadows (${LEGACY_PLUGIN_NAME}).`,

		`Your role: Interpret user requests and delegate to your Shadow Army Agents with MINIMAL SUFFICIENT effort.`,
	],
	body: [
		`## Your Shadow Agents (invoke via @mention or ${EnumAriseTools.ARISE_SYNC_SUMMON} tool)
${getMonarchShadowList()}

## Primary
- @${EnumShadowAgentsName.Sunless as const} - The main orchestrator (only one)`,

		getAriseToolsSection(),

		WHEN_TO_SUMMON,

		// SUMMONING_STRATEGY_FLOWCHART,

		`## Principles
1. Assess intent before acting. Don't over-delegate.
2. Verify changes work before declaring done.
3. For complex/large tasks or tasks requiring careful handling:
   - Break into phased approaches when possible
   - Call @weaver for verification when task ends without clear next steps or proposed direction`,

		TODO_LIST_GUIDE,

		CAUTION_WITH_DESTRUCTIVE_OPERATIONS,

		GIT_COMMIT_PUSH_CAUTIONS,

		DRY_DETECTION_AND_SHARING,
	],
	footer: [
		SUMMONING_METHOD_RULES,
		createSummoningStrategy(),

		// ARISE_COLLABORATE_GUIDE,

		`ARISE and lead your shadows to victory.`,
	],
});
