import { IAnyRecord } from "deepmerge-plus";
import { IAriseConfig } from "../../../src/config/schema";
import { DEFAULT_POLL_INTERVAL, DEFAULT_RETRY_DELAY_INCREMENT, DEFAULT_RETRY_DELAY_MAX } from "../../../src/types/const-default";
import { EnumLogLevel } from "../../../src/types/enum-opencode";
import { EnumAutoResumeOnError, EnumAutoResumeTarget } from "../../../src/types/enums";

/**
 * 預設配置值
 * Default configuration values
 *
 * 當使用者未提供配置或配置無效時使用此值
 * Used when user doesn't provide config or config is invalid
 */
export const ORIGIANL_RAW_DEFAULT_CONFIG = _createDefaultConfig();

/**
 * 建立預設配置物件
 * Create default configuration object
 *
 * 使用函數生成確保永遠一致
 * Use function generation to ensure consistency
 */
export function _createDefaultConfig()
{
  return {
    /** 顯示歡迎橫幅 / Show welcome banner */
    show_banner: true,
    /** 不每個工作階段都顯示橫幅 / Don't show banner every session */
    banner_every_session: false,
    /** 不停用任何 Shadow Agents / Don't disable any Shadow Agents */
    disabled_shadows: [] as IAriseConfig["disabled_shadows"],
    /** 不停用任何 Hook / Don't disable any hooks */
    disabled_hooks: [] as IAriseConfig["disabled_hooks"],
    /** 輸出截斷設定 / Output truncation settings */
    output_shaping: {
      max_chars: 12000,
      preserve_errors: true,
    },
    /** 對話壓縮設定 / Conversation compaction settings */
    compaction: {
      threshold_percent: 80,
      preserve_todos: true,
    },
    /** 背景任務設定 / Background task settings */
    background: {
      poll_interval: DEFAULT_POLL_INTERVAL,
      retry_delay_increment: DEFAULT_RETRY_DELAY_INCREMENT,
      retry_delay_max: DEFAULT_RETRY_DELAY_MAX,
      auto_resume: _createDefaultAutoResume(),
    },
    /** 除錯設定 / Debug settings */
    debug: {
      enabled: false,
      level: EnumLogLevel.Warn,
    },
  } satisfies IAriseConfig;
}

/**
 * 建立預設 auto_resume 物件
 * Create default auto_resume object
 *
 * 使用函數生成確保永遠一致
 * Use function generation to ensure consistency
 */
export function _createDefaultAutoResume()
{
  return {
    enabled: false,
    max_retries: 3,
    retry_delay: 5000,
    on_error: EnumAutoResumeOnError.Ignore,
    target: EnumAutoResumeTarget.Background,
    prompts: {
      retry: undefined as string | undefined,
      final: undefined as string | undefined,
      custom: undefined as string[] | undefined,
    },
  } satisfies NonNullable<NonNullable<IAriseConfig["background"]>["auto_resume"]>;
}
