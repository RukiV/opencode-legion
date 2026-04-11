
import { AppLogData, OpencodeClient, TuiShowToastData } from '@opencode-ai/sdk/client';
import { IEventHandlerContext } from '../../plugin/event-handler';
import { Options } from '@opencode-ai/sdk/v2/gen/client';
import { ITSResolvable } from 'ts-type';
import { logArise2WithLevel } from '../debug-control';

/**
 * 使用 OpenCode 客戶端向開發者 (IDE) 顯示應用程式程式碼級別訊息
 * Show application-level code messages to developers (IDE) using OpenCode Client
 *
 * @param ctx - 事件處理函式上下文 / Event handler context
 * @param fn - 取得 log 選項的函式 / Function to get log options
 * @returns OpenCode 客戶端的 log 呼叫結果 / OpenCode client's log call result
 * @see OpencodeClient#app$log
 * @see App
 */
export async function log2OpenCode<ThrowOnError extends boolean = false>(ctx: IEventHandlerContext, fn: () => ITSResolvable<Options<AppLogData, ThrowOnError>>)
{
  let ret: ReturnType<OpencodeClient['app']['log']>;

  if (ctx?.client?.app?.log)
  {
    const options = await fn();
    
    ret = ctx.client.app.log(options as any)
      .catch((e) =>
      {
        logArise2WithLevel("error", () => [
          `Client failed to show log`,
          e,
        ]);
      }) as any
  }

  // @ts-ignore
  return ret;
}

/**
 * 使用 OpenCode 客戶端向開發者 (IDE) 顯示提示訊息 (Toast)
 * Show Toast messages (notifications) to developers (IDE) using OpenCode Client
 *
 * @param ctx - 事件處理函式上下文 / Event handler context
 * @param fn - 取得 showToast 選項的函式 / Function to get showToast options
 * @returns OpenCode 客戶端的 showToast 呼叫結果 / OpenCode client's showToast call result
 * @see OpencodeClient#tui$showToast
 */
export async function showToastOpenCode<ThrowOnError extends boolean = false>(ctx: IEventHandlerContext, fn: () => ITSResolvable<Options<TuiShowToastData, ThrowOnError>>)
{
  let ret: ReturnType<OpencodeClient['tui']['showToast']>;

  if (ctx?.client?.tui?.showToast)
  {
    const options = await fn();

    ret = ctx.client.tui.showToast(options as any)
      .catch((e) =>
      {
        logArise2WithLevel("error", () => [
          `TUI failed to show toast`,
          e,
        ]);
      }) as any
    ;
  }
  
  // @ts-ignore
  return ret;
}
