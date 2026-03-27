import type { PluginInput } from "@opencode-ai/plugin";
import { EnumAriseTools, getAriseToolsConfigEntry } from './tool-names';
import { tool2 } from '../types/opencode';
import { getErrorMessage } from '../utils/error';
import {
  type CachedProvider,
  getProvidersCache,
  setProvidersCache,
  DEFAULT_PROVIDERS_CACHE_TTL,
} from '../config/model-cache';

/**
 * 格式化模型列表
 * Format models list
 *
 * @param provider - 提供者資料
 * @returns 格式化後的模型列表
 */
function formatModelsForProvider(provider: CachedProvider): string[] {
  const lines: string[] = [];

  lines.push(`## ${provider.id}`);

  if (provider.models && Object.keys(provider.models).length > 0) {
    for (const [modelKey, model] of Object.entries(provider.models)) {
      const modelId = model?.id ?? model?.name ?? modelKey;
      const contextLimit = model?.limit?.context
        ? ` (${(model.limit.context / 1000).toFixed(0)}K context)`
        : "";
      lines.push(`- ${provider.id}/${modelId}${contextLimit}`);
    }
  } else {
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
export function createListModelsTool(ctx: PluginInput) {
  const {
    description,
    args,
  } = getAriseToolsConfigEntry(EnumAriseTools.ARISE_LIST_MODELS);

	return tool2({
		description,
		args,

		async execute(args) {
			const { provider } = args;
      /** 是否為第一次查詢（用於提示用戶可使用緩存） */
      let fromCache = false;

			try {
        /** 檢查是否有有效的緩存 / Check if valid cache exists */
        const cached = getProvidersCache();
        let providers: CachedProvider[];

        if (cached) {
          providers = cached.providers;
          fromCache = true;
        } else {
          /** 從 OpenCode SDK 取得提供者列表 / Get providers list from OpenCode SDK */
          const providersResult = await ctx.client.config.providers();

          if (!providersResult.data) {
            return "[arise] Failed to fetch providers: No data returned";
          }

          providers = providersResult.data.providers as CachedProvider[];

          /** 緩存結果 / Cache the result */
          if (providers && providers.length > 0) {
            setProvidersCache(providers, DEFAULT_PROVIDERS_CACHE_TTL);
          }
        }

				if (!providers || providers.length === 0) {
					return "[arise] No providers configured. Add providers in your opencode.json config file.";
				}

				/** 根據篩選條件過濾提供者 / Filter providers based on criteria */
				const filteredProviders = provider
					? providers.filter((p) => p.id.toLowerCase().includes(provider.toLowerCase()))
					: providers;

				if (filteredProviders.length === 0) {
					return `[arise] No providers found matching "${provider}". Available providers: ${providers.map((p) => p.id).join(", ")}`;
				}

				/** 格式化模型列表 / Format models list */
				const lines: string[] = [];

				for (const p of filteredProviders) {
					lines.push(...formatModelsForProvider(p));
				}

				const header = provider
					? `Available models for provider "${provider}":\n`
					: "All available models:\n";

        const cacheNote = fromCache ? " (cached)" : "";

				return `[arise]${cacheNote} ${header}
${lines.join("\n").trim()}

Use these model names with the 'model' parameter when calling arise_summon or arise_background.`;
			} catch (error) {
				const msg = getErrorMessage(error);
				return `[arise] Failed to fetch models: ${msg}`;
			}
		},
	});
}
