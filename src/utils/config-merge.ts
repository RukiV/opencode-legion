
import { deepmergeAll, IAnyRecord } from 'deepmerge-plus';

export function configMergeDeep<T extends IAnyRecord>(inputList: [override: T, ...base: T[]]): T
export function configMergeDeep<T extends IAnyRecord>(inputList: T[]): T
export function configMergeDeep<T extends IAnyRecord>(inputList: T[]): T
{
  return deepmergeAll(inputList, {
    keyValueUpsertMode: true,
    arrayMerge: _arrayMergeLeftTargetWins,
  });
}

/**
 * 左邊為主：完全保留目標陣列
 * Left primary: Keep target array completely
 */
export function _arrayMergeLeftTargetWins(target: any[], source: any[]): any[]
{
	return target.slice();
}

/**
 * 右邊為主：完全使用來源陣列
 * Right primary: Use source array completely
 */
export function _arrayMergeRightSourceWins(target: any[], source: any[]): any[]
{
	return source.slice();
}

