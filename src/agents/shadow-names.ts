/**
 * Shadow Agent 名稱定義
 * Shadow Agent name definitions
 *
 * 從 enums.ts 重新導出所有枚舉和類型
 * Re-export all enums and types from enums.ts
 */

// 重新導出所有枚舉和常量
// Re-export all enums and constants
export {
	EnumOpencodeAgentMode,
	EnumOpencodeAgentPermission,
	EnumShadowAgentsName,
	EnumShadowSubAgentsName,
	ALLOWED_SHADOWS,
	BACKGROUND_SHADOWS,
	ALL_SHADOW_AGENTS_NAME,
	type IBackgroundShadowAgentsName,
	type IAllShadowAgentsName,
	type IAllowedShadowName,
} from '../types/enums';