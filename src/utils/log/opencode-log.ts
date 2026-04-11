
import { AppLogData, OpencodeClient } from '@opencode-ai/sdk/client';
import { IEventHandlerContext } from '../../plugin/event-handler';
import { Options } from '@opencode-ai/sdk/v2/gen/client';
import { ITSResolvable } from 'ts-type';

/**
 * ctx.client.app.log
 * 
 * @see OpencodeClient
 * @see App
 */
export async function logOpenCode<ThrowOnError extends boolean = false>(ctx: IEventHandlerContext, fn: () => ITSResolvable<Options<AppLogData, ThrowOnError>>)
{
  if (ctx?.client?.app?.log)
  {
    const options = await fn();
    return ctx.client.app.log(options as any) as ReturnType<OpencodeClient['app']['log']>;
  }

  return void 0 as any as ReturnType<OpencodeClient['app']['log']>;
}
