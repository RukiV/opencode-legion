import type { PluginInput } from "@opencode-ai/plugin";
import { PLUGIN_VERSION, PLUGIN_VERSION_HOMEPAGE } from "../types/version";
import { console } from 'debug-color2';

/**
 * 產生居中填充的字串
 * Generate center-padded string
 *
 * @param text - 要顯示的文字
 * @param totalWidth - 總寬度（不含邊框字符）
 * @returns 填充後的字串
 */
function centerPad(text: string, totalWidth: number): string {
  const textLength = text.length;
  const padding = totalWidth - textLength;

  if (padding <= 0) {
    return text;
  }

  const leftPadding = Math.floor(padding / 2);
  const rightPadding = padding - leftPadding;

  return " ".repeat(leftPadding) + text + " ".repeat(rightPadding);
}

/** 從 package.json 取得的版本號 */
// const PLUGIN_VERSION = getVersionFromPackageJson();

/** 橫幅內容區域寬度（不含邊框字符） */
const BANNER_CONTENT_WIDTH = 58;

/**
 * 產生版本號行（含動態寬度對齊）
 * Generate version line with dynamic width alignment
 *
 * @param version - 版本號
 * @returns 對齊後的版本號行
 */
function generateVersionLine(version: string): string {
  const versionText = `v${version}`;
  const padded = centerPad(versionText, BANNER_CONTENT_WIDTH);
  return `║${padded}║`;
}

/**
 * 產生 ASCII 橫幅（含版本號）
 * Generate ASCII banner (with version)
 *
 * 當插件啟動時顯示的歡迎橫幅
 * Welcome banner displayed when plugin starts
 *
 * @param version - 版本號（可選，預設為 PLUGIN_VERSION）
 * @returns ASCII 藝術橫幅字串
 */
function generateBannerASCII(version?: string): string {
  const ver = version ?? PLUGIN_VERSION;
  const versionLine = generateVersionLine(ver);

  return `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║               ⚔️  A R I S E !  ⚔️                     ║
║                                                       ║
║         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           ║
║         ░░    Shadow Army Assembled    ░░░           ║
║         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           ║
║                                                       ║
║   Monarch ready. Shadows await your command.          ║
║                                                       ║
${versionLine}
╚═══════════════════════════════════════════════════════╝
${PLUGIN_VERSION_HOMEPAGE}
`;
}

/** Toast 通知訊息（含版本號）/ Toast notification message (with version) */
const TOAST_MESSAGE = `⚔️ ARISE! Shadow Army Assembled. Monarch ready. v${PLUGIN_VERSION}`;

/**
 * 程序級標誌：確保橫幅只顯示一次
 * Process-level flag: ensures banner is shown only once
 */
let bannerShownThisProcess = false;

/**
 * 建立歡迎橫幅 Hook
 * Create welcome banner hook
 *
 * @param ctx - Plugin 上下文
 * @returns 橫幅 Hook 物件
 */
export function createAriseBannerHook(ctx: PluginInput) {
  /**
   * 顯示 Toast 通知
   * Show toast notification
   */
  const showToast = async () => {
    try {
      await ctx.client.tui.showToast({
        body: {
          title: "opencode-arise",
          message: TOAST_MESSAGE,
          variant: "info",
          duration: 4000,
        },
      });
    } catch {
      /** TUI 可能不可用（非互動模式）/ TUI might not be available (non-interactive mode) */
    }
  };

  return {
    /**
     * 會話創建時的回調
     * Callback when session is created
     */
    async onSessionCreated() {
      /** 只在程序首次執行時顯示 / Only show on first execution of process */
      if (!bannerShownThisProcess) {
        bannerShownThisProcess = true;
        await showToast();
      }
    },
  };
}

/**
 * 取得 ASCII 橫幅
 * Get ASCII banner
 *
 * @returns ASCII 藝術橫幅字串
 */
export function getBanner(): string {
  // 每次調用時重新讀取版本號，確保顯示最新版本
  return generateBannerASCII(PLUGIN_VERSION);
}

/**
 * 將橫幅輸出到控制台
 * Print banner to console
 *
 * 用於 CLI 模式的初始化輸出
 * Used for initialization output in CLI mode
 */
export function printBannerToConsole(): void {
  if (!bannerShownThisProcess) {
    console.yellow.log(getBanner());
    bannerShownThisProcess = true;
  }
}
