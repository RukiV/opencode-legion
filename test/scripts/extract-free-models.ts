/**
 * Free Models Extractor Script
 *
 * 用途：從 providers-cache.json 中提取免費模型並存到單獨檔案
 * Usage: Extract free models from providers-cache.json to a separate file
 *
 * 免費模型定義：input 和 output 費用都為 0
 * Free model definition: both input and output costs are 0
 *
 * 輸出格式：依照提供商分類 (providers-history.json 格式)
 * Output format: Grouped by provider (providers-history.json format)
 *
 * 執行方式 / Usage:
 *   bun run test/scripts/extract-free-models.ts
 *   bun test/scripts/extract-free-models.ts
 */
// @ts-ignore
import { readJSONSync, outputJSONSync, readJSON } from "fs-extra";
import { join } from "path";
import { IOpenCodeProvider } from '../../src/types/opencode/types-provider';
// @ts-ignore
import { __TEST_FIXTURES } from '../../__root';
import { console } from 'debug-color2';
import { sortObject } from "sort-object-keys2";
import { findFreeModelsRecord } from '../../src/config/model-cache';
import { tsObjectEntries } from 'ts-type-object-entries';

const _dir = join(__TEST_FIXTURES, "api");

const INPUT_FILE = join(_dir, "providers-cache.json");
const OUTPUT_FILE = join(_dir, "free-models.json");

/**
 * 輸出檔案資料結構
 * Output file data structure
 */
interface IFreeModelsOutput
{
	note?: string;
	extractedAt?: string;
	totalCount?: number;
	providerCount?: number;
	data: ReturnType<typeof findFreeModelsRecord>;
}

/**
 * 提取免費模型
 * Extract free models
 */
async function extractFreeModels(): Promise<void>
{
	console.info(`讀取 ${INPUT_FILE}...`);

	// 讀取原始檔案 / Read source file
	const cache = readJSONSync(INPUT_FILE) as {
		data: IOpenCodeProvider[];
	};

	if (!cache.data || !Array.isArray(cache.data))
	{
		console.error(`[ERROR] Invalid cache file format`);
		process.exit(1);
	}

	// 讀取現有輸出檔案 / Read existing output file
	let oldOutput: IFreeModelsOutput = await readJSON(OUTPUT_FILE).catch(() => null) ?? {};

	const oldJson = JSON.stringify(oldOutput);

	// 找出所有免費模型並依照提供商分類 / Find all free models grouped by provider
	const freeModelsGrouped = findFreeModelsRecord(cache.data);

	sortObject(freeModelsGrouped, {
		useSource: true,
	});

	oldOutput.data = freeModelsGrouped;

	const newJson = JSON.stringify(oldOutput);

	const isUpdated = oldJson !== newJson;

	// 只有在內容變化時才更新時間戳 / Only update timestamp when content changes
	if (isUpdated)
	{
		oldOutput.extractedAt = new Date().toISOString();
	}
	else
	{
		// 保留原有的時間戳，若無則設定當前時間 / Keep original timestamp, or set current time if none
		oldOutput.extractedAt ||= new Date().toISOString();
	}

	// 計算總數 / Calculate total count
	const totalCount = Object.values(freeModelsGrouped).reduce((acc, provider) =>
		acc + Object.keys(provider).length, 0);

	// 建立輸出資料 (providers-history.json 格式) / Create output data (providers-history.json format)
	const newOutput: IFreeModelsOutput = {
		note: "免費模型列表 (依照提供商分類) / Free models list (grouped by provider)",
		extractedAt: oldOutput.extractedAt,
		providerCount: Object.keys(freeModelsGrouped).length,
		totalCount,
		data: freeModelsGrouped,
	};

	console.success(`找到 ${totalCount} 個免費模型，來自 ${Object.keys(freeModelsGrouped).length} 個提供商:`);
	console.log("");

	// 輸出各提供商的模型數量 / Output model count per provider
	for (const [providerId, providerData] of tsObjectEntries(freeModelsGrouped))
	{
		const modelCount = Object.keys(providerData).length;
		console.info(`  [${providerId}] ${modelCount} models`);

		// 顯示前幾個模型 / Show first few models
		const modelIds = Object.keys(providerData).slice(0, 3);
		for (const modelId of modelIds)
		{
			const model = providerData[modelId];
			console.gray.info(`         - ${model.name || modelId}`);
		}

		if (modelCount > 3)
		{
			console.gray.info(`         ... and ${modelCount - 3} more`);
		}

		console.log("");
	}

	// 寫入輸出檔案 / Write output file
	outputJSONSync(OUTPUT_FILE, newOutput, { spaces: 2 });
	console.success(`已將免費模型儲存到: ${OUTPUT_FILE}`);

	if (isUpdated)
	{
		console.info(`內容已更新`);
	}
	else
	{
		console.info(`內容未變化，保持原有時間戳`);
	}
}

// 執行 / Execute
extractFreeModels();
