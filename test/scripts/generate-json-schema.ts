/**
 * JSON Schema 生成腳本
 * JSON Schema generation script
 *
 * 使用 Zod 生成 opencode-arise.json 的 JSON Schema
 * Generate JSON Schema for opencode-arise.json using Zod
 *
 * 運行方式 / Usage:
 *   bun test/scripts/generate-json-schema.ts
 *   tsx test/scripts/generate-json-schema.ts
 */

import { writeFileSync } from "fs-extra";
import { join } from "upath2";
import { z } from "zod";
import { __ROOT } from "../../__root";
import { AriseConfigSchema } from "../../src/config/schema";
import { sortObject } from "sort-object-keys2";

function _sortObject<T extends Record<string, any>>(obj: T): T
{
	return sortObject(obj as any, {
		keys: [
			'$schema', 
			'type',
			'title',
			'description',
			'additionalProperties',
			'default',
			'required',
		].concat(Object.keys(obj)),
		useSource: true,
	});
}

function sortObjectDeep<T extends Record<string, any>>(obj: T): T
{
	Object.entries(obj).forEach(([key, value]) => {
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) 
		{
			(obj as any)[key] = sortObjectDeep(value);
		}
	});

	return _sortObject(obj as any);
}

/**
 * 生成 JSON Schema
 * Generate JSON Schema
 */
function generateJSONSchema()
{
	// 使用 Zod v4 的 toJSONSchema 方法
	// Use Zod v4's toJSONSchema method
	const jsonSchema = z.toJSONSchema(AriseConfigSchema);

	// 添加標準的 JSON Schema 屬性
	// Add standard JSON Schema properties
	jsonSchema.$schema ||= "http://json-schema.org/draft-07/schema#";

	return sortObjectDeep(jsonSchema);
}

// 主邏輯
const jsonSchema = generateJSONSchema();

// 輸出路徑
const outputPath = join(__ROOT, "opencode-arise.schema.json");

// 寫入檔案（格式化輸出）
writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2), "utf-8");

console.log(`✅ JSON Schema generated: ${outputPath}`);
console.log(`   Schema title: ${jsonSchema.title}`);
console.log(`   Schema type: ${jsonSchema.type}`);
