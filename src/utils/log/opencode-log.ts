
import { AppLogData, OpencodeClient, TuiShowToastData } from '@opencode-ai/sdk/client';
import { IEventHandlerContext } from '../../plugin/event-handler';
import { Options } from '@opencode-ai/sdk/v2/gen/client';
import { ITSResolvable } from 'ts-type';
import { logArise2WithLevel } from '../debug-control';

/**
 * ctx.client.app.log
 * 
 * @see OpencodeClient
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
