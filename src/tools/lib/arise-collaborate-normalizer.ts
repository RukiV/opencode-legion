/**
 * Shadows 項目正規化工具
 * Shadows entry normalization utility
 *
 * 將 shadows 輸入正規化為統一格式，自動產生 label
 * Normalize shadows input to unified format, auto-generate labels
 */

import type { IAllShadowAgentsName } from "../../types/enums";
import { _trimLazy } from "../../utils/string/string-utils";
import { getOrInsertComputedFromMap, getOrInsertFromMap } from "../../utils/syntax/map-set";
import { ITSPickExtra } from 'ts-type';

/**
 * 正規化後的 Shadows 項目
 * Normalized shadows entry
 */
export interface INormalizedCollaborateShadowEntry
{
	index: number;
	/** Shadow agent 名稱 / Shadow agent name */
	agent: IAllShadowAgentsName;
	/** 模型名稱，可選 / Model name, optional */
	model?: string;
	/** 自訂標籤，選填 / Custom label, optional */
	label: string;
}

/**
 * 正規化 Shadows 陣列
 * Normalize shadows array
 *
 * 自動處理：
 * - 自動產生 label（agent#XXX），編號從 #001 開始
 * - model 保持原樣（undefined 或自訂值），由 summon 系統自動處理
 * - 衝突處理：
 *   - 自訂 label 與現有 label 衝突 → 改為自動產生 label
 *   - 自訂 label 符合 #XXX 格式 → 改為自動產生 label
 *   - 自動 label 編號被佔用 → 跳到下一個可用編號
 *
 * @param entries - 原始 shadows 陣列
 * @returns 正規化後的陣列
 *
 * @example
 * // 無自訂標籤
 * normalize([{agent: "beru"}, {agent: "beru"}, {agent: "bellion"}])
 * // [
 * //   { agent: "beru", model: undefined, label: "beru#001" },
 * //   { agent: "beru", model: undefined, label: "beru#002" },
 * //   { agent: "bellion", model: undefined, label: "bellion#001" }
 * // ]
 *
 * @example
 * // 有自訂標籤（不衝突）
 * normalize([{agent: "beru", label: "beru 姐"}, {agent: "beru"}])
 * // [
 * //   { agent: "beru", model: undefined, label: "beru 姐" },
 * //   { agent: "beru", model: undefined, label: "beru#001" }
 * // ]
 *
 * @example
 * // 有自訂標籤（衝突，自動改為遞增編號）
 * normalize([{agent: "beru", label: "beru 姐"}, {agent: "beru", label: "beru 姐"}])
 * // [
 * //   { agent: "beru", model: undefined, label: "beru 姐" },
 * //   { agent: "beru", model: undefined, label: "beru#001" }
 * // ]
 */
export function normalizeShadowsEntries(
	entries: ITSPickExtra<INormalizedCollaborateShadowEntry, 'agent'>[],
): INormalizedCollaborateShadowEntry[]
{
	/**
	 * 追蹤每個 agent 已使用的 label
	 * Track labels used by each agent
	 */
	const usedLabels = new Map<IAllShadowAgentsName, Set<string>>();

	/**
	 * 追蹤下一個編號
	 * Track next sequence number
	 */
	const nextSequence = new Map<IAllShadowAgentsName, number>();

	return entries.map((entry, index) =>
	{
		let { agent, model, label } = entry;

		/**
		 * 產生自動標籤
		 * Generate auto label
		 *
		 * 編號從 #001 開始，按照出現順序遞增
		 * 如果遇到衝突（label 已被使用），則跳到下一個可用編號
		 * Number starts from #001, increments by appearance order
		 * If conflict exists (label already used), skip to next available number
		 */
		const agentLabels = getOrInsertComputedFromMap(usedLabels, agent, () => new Set<string>());

		model = _trimLazy(model);
		label = _trimLazy(label);

		/**
		 * 如果有自訂標籤，檢查是否與同 agent 的現有 label 衝突
		 * If custom label exists, check for conflicts with existing labels for same agent
		 */
		if (label)
		{
			/**
			 * 檢查自訂 label 是否與同 agent 的其他 label 衝突
			 * Check if custom label conflicts with other labels for same agent
			 */
			if (agentLabels.has(label) || label.match(/#\d+/i))
			{
				label = void 0;
			}
			else
			{
				/**
				 * 標記此 label 為已使用
				 * Mark this label as used
				 */
				agentLabels.add(label);

				return { index, agent, model, label };
			}
		}

		let currentSeq = (nextSequence.get(agent) ?? 0) + 1;
		nextSequence.set(agent, currentSeq);

		/**
		 * 找到第一個可用的編號
		 * Find first available sequence number
		 */
		let seqStr = String(currentSeq).padStart(3, "0");
		let autoLabel = `${agent}#${seqStr}`;

		while (agentLabels.has(autoLabel))
		{
			currentSeq++;
			seqStr = String(currentSeq).padStart(3, "0");
			autoLabel = `${agent}#${seqStr}`;
			nextSequence.set(agent, currentSeq);
		}

		/**
		 * 標記此 label 為已使用
		 * Mark this label as used
		 */
		agentLabels.add(autoLabel);

		return { index, agent, model, label: autoLabel };
	});
}

/**
 * 從正規化後的陣列中提取 agent 名稱列表
 * Extract agent name list from normalized array
 *
 * @param entries - 正規化後的陣列
 * @returns agent 名稱陣列
 */
export function extractShadowNames(
	entries: INormalizedCollaborateShadowEntry[],
): IAllShadowAgentsName[]
{
	return entries.map(e => e.agent);
}

/**
 * 從正規化後的陣列中提取 label 列表
 * Extract label list from normalized array
 *
 * @param entries - 正規化後的陣列
 * @returns label 陣列
 */
export function extractLabels(
	entries: INormalizedCollaborateShadowEntry[],
): string[]
{
	return entries.map(e => e.label);
}

/**
 * 從正規化後的陣列中提取 model 列表
 * Extract model list from normalized array
 *
 * @param entries - 正規化後的陣列
 * @returns model 陣列
 */
export function extractModels(
	entries: INormalizedCollaborateShadowEntry[],
): (string | undefined)[]
{
	return entries.map(e => e.model);
}

/**
 * 取得 Shadow Agent 的顯示名稱
 * Get display name for Shadow Agent
 *
 * @param entry - 正規化後的陣列項目
 * @returns 顯示名稱
 */
export function getShadowDisplayName(entry: INormalizedCollaborateShadowEntry): string
{
	return `${entry.label}(${entry.agent}${entry.model ? ` - ${entry.model}` : ""})`;
}
