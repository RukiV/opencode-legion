/**
 * API Keys Extractor Script
 *
 * 用途：從 providers-cache.json 中提取 API Keys 並存到單獨檔案
 * Usage: Extract API keys from providers-cache.json to a separate file
 *
 * 執行方式 / Usage:
 *   bun run scripts/extract-api-keys.ts
 */
// @ts-ignore
import { readJSONSync, outputJSONSync } from "fs-extra";
import { join, resolve } from "path";
import { IProvidersCache } from '../../src/config/model-cache';
// @ts-ignore
import { __TEST_FIXTURES } from '../../__root';
import { console } from 'debug-color2';

const _dir = join(__TEST_FIXTURES, "api");

const INPUT_FILE = join(_dir, "providers-cache.json");
const OUTPUT_FILE = join(_dir, "providers-keys.json");
const SANITIZED_FILE = join(_dir, "providers-cache.safe.json");

interface ExtractedKey
{
	id: string;
	name: string;
	env: string[];
	key: string;
}

function extractApiKeys(): void
{
	console.info(`讀取 ${INPUT_FILE}...`);

	// 讀取原始檔案 / Read source file
	const cache: IProvidersCache = readJSONSync(INPUT_FILE);

	const cacheKeys: {
		note: "此檔案包含真實密鑰 API KEY，用於存取提供商服務，絕對要避免洩漏或意外提交至GIT",
		extractedAt: string;
		providers: Record<string, ExtractedKey>;
	} = readJSONSync(OUTPUT_FILE) ?? {};

	cacheKeys.providers = cacheKeys.providers || {};

	let removeKeys = 0;

	// 遍歷 data 陣列，找出所有 key 欄位 / Iterate through data array to find all key fields
	for (const provider of cache.data)
	{
		if (provider.key)
		{
			cacheKeys.providers[provider.id] = {
				id: provider.id,
				name: provider.name!,
				env: provider.env || [],
				key: provider.key,
			};

			console.warn(`[FOUND] Provider: ${provider.name} (${provider.id})`);
			console.yellow.info(`        Key: ${provider.key.substring(0, 5)}...${provider.key.substring(-5, provider.key.length)}`);

			// 從 cache 中移除 key
			delete provider.key;

			removeKeys++;
		}
	}

	if (removeKeys > 0)
	{
		cacheKeys.extractedAt = new Date().toISOString();
	}

	// 建立輸出檔案 / Create output file
	const output = {
		note: "此檔案包含真實密鑰 API KEY，用於存取提供商服務，絕對要避免洩漏或意外提交至GIT",
		extractedAt: cacheKeys.extractedAt || new Date().toISOString(),
		providers: cacheKeys.providers,
	};

	// 寫入輸出檔案 / Write output file
	outputJSONSync(OUTPUT_FILE, output, { spaces: 2 });
	console.info(`已將 API Keys 儲存到: ${OUTPUT_FILE}`);

	// 寫入 sanitized 檔案 / Write sanitized file
	outputJSONSync(SANITIZED_FILE, cache, { spaces: 2 });
	outputJSONSync(INPUT_FILE, cache, { spaces: 2 });
	console.success(`已移除 API Keys x ${removeKeys} 並更新: ${SANITIZED_FILE}`);
}

// 執行 / Execute
extractApiKeys();
