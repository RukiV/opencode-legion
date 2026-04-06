/**
 * arise_collaborate 正規化工具測試
 * arise_collaborate normalizer utility tests
 *
 * 測試 shadows 正规化功能的正确性
 */

/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import {
	normalizeShadowsEntries,
	extractShadowNames,
	extractLabels,
	extractModels,
	type INormalizedCollaborateShadowEntry,
} from "../src/tools/lib/arise-collaborate-normalizer";
import { EnumShadowAgentsName } from "../src/types/enums";
import { ITSPickExtra } from 'ts-type';

type ICollaborateShadowEntry = ITSPickExtra<INormalizedCollaborateShadowEntry, 'agent'>;

describe("arise_collaborate 正規化工具", () =>
{
	/**
	 * 測試用 agent 資料
	 * Test agent data
	 */
	const TEST_AGENTS = {
		beru: "beru" as EnumShadowAgentsName,
		bellion: "bellion" as EnumShadowAgentsName,
		tank: "tank" as EnumShadowAgentsName,
	};

	describe("normalizeShadowsEntries", () =>
	{
		it("空陣列應返回空陣列", () =>
		{
			const result = normalizeShadowsEntries([]);
			expect(result).toEqual([]);
		});

		it("單一 agent 應產生遞增編號，model 為 undefined", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru },
			];
			const result = normalizeShadowsEntries(input);

			expect(result).toHaveLength(1);
			expect(result[0].agent).toBe(TEST_AGENTS.beru);
			expect(result[0].model).toBeUndefined();
			expect(result[0].label).toBe("beru#001");
		});

		it("多個相同 agent 應產生遞增編號", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru },
				{ agent: TEST_AGENTS.beru },
				{ agent: TEST_AGENTS.beru },
			];
			const result = normalizeShadowsEntries(input);

			expect(result).toHaveLength(3);
			expect(result[0].label).toBe("beru#001");
			expect(result[1].label).toBe("beru#002");
			expect(result[2].label).toBe("beru#003");
		});

		it("不同 agent 應各自產生編號（相同 agent 才遞增）", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru },
				{ agent: TEST_AGENTS.bellion },
				{ agent: TEST_AGENTS.beru },
			];
			const result = normalizeShadowsEntries(input);

			expect(result[0].label).toBe("beru#001");
			expect(result[1].label).toBe("bellion#001");
			expect(result[2].label).toBe("beru#002");
		});

		it("自訂 label 應優先使用，不產生編號", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, label: "beru 姐" },
				{ agent: TEST_AGENTS.beru },
				{ agent: TEST_AGENTS.beru, label: "第二個 beru" },
			];
			const result = normalizeShadowsEntries(input);

			expect(result[0].label).toBe("beru 姐");
			expect(result[1].label).toBe("beru#001");
			expect(result[2].label).toBe("第二個 beru");
		});

		it("自訂 model 應正確保留，未提供則為 undefined", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, model: "claude-opus" },
				{ agent: TEST_AGENTS.bellion },
				{ agent: TEST_AGENTS.tank, model: "gpt-4" },
			];
			const result = normalizeShadowsEntries(input);

			expect(result[0].model).toBe("claude-opus");
			expect(result[1].model).toBeUndefined();
			expect(result[2].model).toBe("gpt-4");
		});

		it("完整輸入應正確處理", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, model: "claude-haiku", label: "先鋒" },
				{ agent: TEST_AGENTS.bellion, model: "gpt-5" },
			];
			const result = normalizeShadowsEntries(input);

			expect(result).toMatchObject([
				{ agent: TEST_AGENTS.beru, model: "claude-haiku", label: "先鋒" },
				{ agent: TEST_AGENTS.bellion, model: "gpt-5", label: "bellion#001" },
			]);
		});

		it("相同 agent 的自訂 label 衝突時，後者改為自動編號", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, label: "beru 姐" },
				{ agent: TEST_AGENTS.beru, label: "beru 姐" },
			];

			const result = normalizeShadowsEntries(input);
			expect(result).toHaveLength(2);
			expect(result[0].label).toBe("beru 姐");
			expect(result[1].label).toBe("beru#001");
		});

		it("不同 agent 的相同 label 應允許（不同 agent 可用相同 label）", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, label: "同名" },
				{ agent: TEST_AGENTS.bellion, label: "同名" },
			];

			const result = normalizeShadowsEntries(input);
			expect(result).toHaveLength(2);
			expect(result[0].label).toBe("同名");
			expect(result[1].label).toBe("同名");
		});

		it("自訂 label 應與自動編號 label 區分開，不衝突", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, label: "beru#001" },
				{ agent: TEST_AGENTS.beru },
			];

			const result = normalizeShadowsEntries(input);
			expect(result[0].label).toBe("beru#001");
			expect(result[1].label).toBe("beru#002");
		});

		it("自訂 label 符合 #XXX 格式時，應改為自動編號", () =>
		{
			const input: ICollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, label: "beru#001" },
				{ agent: TEST_AGENTS.beru },
			];

			const result = normalizeShadowsEntries(input);
			expect(result[0].label).toBe("beru#001");
			expect(result[1].label).toBe("beru#002");
		});
	});

	describe("extractShadowNames", () =>
	{
		it("應正確提取 agent 列表", () =>
		{
			const input: INormalizedCollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, model: undefined, label: "beru#001" },
				{ agent: TEST_AGENTS.bellion, model: undefined, label: "bellion" },
				{ agent: TEST_AGENTS.tank, model: undefined, label: "tank" },
			];

			const result = extractShadowNames(input);
			expect(result).toEqual([
				TEST_AGENTS.beru,
				TEST_AGENTS.bellion,
				TEST_AGENTS.tank,
			]);
		});
	});

	describe("extractLabels", () =>
	{
		it("應正確提取 label 列表", () =>
		{
			const input: INormalizedCollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, model: undefined, label: "beru#001" },
				{ agent: TEST_AGENTS.beru, model: undefined, label: "beru#002" },
				{ agent: TEST_AGENTS.bellion, model: undefined, label: "元帥" },
			];

			const result = extractLabels(input);
			expect(result).toEqual(["beru#001", "beru#002", "元帥"]);
		});
	});

	describe("extractModels", () =>
	{
		it("應正確提取 model 列表", () =>
		{
			const input: INormalizedCollaborateShadowEntry[] = [
				{ agent: TEST_AGENTS.beru, model: "claude-haiku", label: "beru#001" },
				{ agent: TEST_AGENTS.bellion, model: undefined, label: "bellion" },
				{ agent: TEST_AGENTS.tank, model: "gpt-4", label: "tank" },
			];

			const result = extractModels(input);
			expect(result).toEqual(["claude-haiku", undefined, "gpt-4"]);
		});
	});
});
