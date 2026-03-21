import type { PluginInput } from "@opencode-ai/plugin";

/**
 * ASCII 藝術橫幅
 * ASCII art banner
 *
 * 當插件啟動時顯示的歡迎橫幅
 * Welcome banner displayed when plugin starts
 */
const BANNER_ASCII = `
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
╚═══════════════════════════════════════════════════════╝
`;

/** Toast 通知訊息 / Toast notification message */
const TOAST_MESSAGE = "⚔️ ARISE! Shadow Army Assembled. Monarch ready.";

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
  return BANNER_ASCII;
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
    console.log(BANNER_ASCII);
    bannerShownThisProcess = true;
  }
}
