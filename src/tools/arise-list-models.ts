import type { PluginInput } from "@opencode-ai/plugin";
import { EnumAriseTools } from '../types/enums';
import { getAriseToolsConfigEntry } from '../agents/shadows';
import { tool2 } from '../types/types-opencode';
import { getErrorMessage } from '../utils/error';
import { logArise2WithLevel } from '../utils/debug-control';
import { tzDayjs, fromNow } from '../utils/date/dayjs';
import { DEFAULT_DATE_TIME_FORMAT } from "../types/const-default";
import {
  type IProvidersCache,
  getProvidersCache,
  setProvidersCache,
  DEFAULT_PROVIDERS_CACHE_TTL,
} from '../config/model-cache';
import {
  formatAriseMsgError,
  formatAriseMsgSuccess,
} from '../utils/string/arise-message';
import { IOpenCodeProvider } from '../types/opencode/types-provider';

/**
 * 格式化模型列表
 * Format models list
 *
 * @param provider - 提供者資料
 * @returns 格式化後的模型列表
 */
function formatModelsForProvider(provider: IOpenCodeProvider): string[]
{
	const lines: string[] = [];

	lines.push(`## ${provider.id}`);

	if (provider.models && Object.keys(provider.models).length > 0)
	{
		for (const [modelKey, model] of Object.entries(provider.models))
		{
			const modelId = model?.id ?? model?.name ?? modelKey;
			const contextLimit = model?.limit?.context
				? ` (${(model.limit.context / 1000).toFixed(0)}K context)`
				: "";
			lines.push(`- ${provider.id}/${modelId}${contextLimit}`);
		}
	}
	else
	{
		lines.push("- (No models listed)");
	}

	lines.push(""); // 空行分隔
	return lines;
}

/**
 * 建立可用模型列表工具
 * Create available models list tool
 *
 * @see docs/tools/list-models.md
 * @param ctx - Plugin 上下文
 */
export function createListModelsTool(ctx: PluginInput)
{
	const {
		description,
		args,
	} = getAriseToolsConfigEntry(EnumAriseTools.ARISE_LIST_MODELS);

	return tool2({
		description,
		args,

		async execute(args)
		{
			const { provider, forceRefresh } = args;
			/** 是否為第一次查詢（用於提示用戶可使用緩存） */
			let fromCache = false;

			try
			{
				/** 檢查是否有有效的緩存 / Check if valid cache exists */
				const cached = forceRefresh ? null : getProvidersCache();
				let providers: IOpenCodeProvider[];

				if (cached)
				{
					providers = cached.data;
					fromCache = true;
					/** 計算緩存剩餘時間 / Calculate remaining cache time */
					const now = Date.now();
					const age = now - cached.timestamp;
					const remaining = cached.expiresIn - age;
					const expiresAt = tzDayjs(cached.timestamp + cached.expiresIn);
					const expiresAtStr = expiresAt.format(DEFAULT_DATE_TIME_FORMAT);
					const remainingStr = fromNow(cached.timestamp + cached.expiresIn); // 人類可讀的剩餘時間 / Human-readable remaining time
					logArise2WithLevel("info", () => [
						"Using cached providers",
						{
							count: providers.length,
							expiresIn: cached.expiresIn,
							remainingMs: remaining,
							expiresAt: expiresAtStr,
							remaining: remainingStr,
						},
					]);
				}
				else
				{
					/** 從 OpenCode SDK 取得提供者列表 / Get providers list from OpenCode SDK */
					const providersResult = await ctx.client.config.providers();

					if (!providersResult.data)
					{
						return formatAriseMsgError("Failed to fetch providers: No data returned");
					}

					/** 輸出預設提供者日誌 / Log default provider */
					logArise2WithLevel("info", () => ["Default provider:", providersResult.data.default]);

					providers = providersResult.data.providers as unknown as IOpenCodeProvider[];

					/** 緩存結果 / Cache the result (傳入舊緩存用於比較差異與歷史記錄) */
					if (providers && providers.length > 0)
					{
						const oldCache = getProvidersCache(true); // 強制獲取舊緩存（即使過期）
						setProvidersCache(providers, DEFAULT_PROVIDERS_CACHE_TTL, oldCache);
						const expiresAt = tzDayjs(Date.now() + DEFAULT_PROVIDERS_CACHE_TTL);
						const expiresAtStr = expiresAt.format(DEFAULT_DATE_TIME_FORMAT);
						const remainingStr = fromNow(Date.now() + DEFAULT_PROVIDERS_CACHE_TTL); // 人類可讀的剩餘時間 / Human-readable remaining time
						logArise2WithLevel("info", () => [
							"Cached providers",
							{
								count: providers.length,
								ttl: DEFAULT_PROVIDERS_CACHE_TTL,
								expiresAt: expiresAtStr,
								remaining: remainingStr,
							},
						]);
					}
				}

				if (!providers || providers.length === 0)
				{
					return formatAriseMsgError("No providers configured. Add providers in your opencode.json config file.");
				}

				/** 根據篩選條件過濾提供者 / Filter providers based on criteria */
				const filteredProviders = provider
					? providers.filter((p) => p.id.toLowerCase().includes(provider.toLowerCase()))
					: providers;

				if (filteredProviders.length === 0)
				{
					return formatAriseMsgError(`No providers found matching "${provider}". Available providers: ${providers.map((p) => p.id)
						.join(", ")}`);
				}

				/** 格式化模型列表 / Format models list */
				const lines: string[] = [];

				for (const p of filteredProviders)
				{
					lines.push(...formatModelsForProvider(p));
				}

				const header = provider
					? `Available models for provider "${provider}":\n`
					: "All available models:\n";

				const cacheNote = fromCache ? " (cached)" : "";

				return formatAriseMsgSuccess(`${cacheNote} ${header}
${lines.join("\n").trim()}

Use these model names with the 'model' parameter when calling arise_summon or arise_background.`);
			}
			catch (error)
			{
				const msg = getErrorMessage(error);
				return formatAriseMsgError(`Failed to fetch models: ${msg}`);
			}
		},
	});
}
