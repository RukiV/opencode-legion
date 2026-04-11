
import { EnumShadowAgentsName, IAllShadowAgentsName } from "../../types/enums";
import { IShadowAgentPermission, SHADOW_AGENT_PERMISSION_KEY_INVALID } from "../../types/types-opencode";
import { logArise2WithLevel } from "../../utils/debug-control";

/**
 * 處理 Shadow Agent 權限的相容性
 * Handle Shadow Agent permission compatibility
 *
 * 由於 OpenCode 官方權限列表 (https://opencode.ai/docs/permissions/#available-permissions)
 * 中不包含 'write'，為保持向後相容性，進行以下處理：
 * - 若有 edit 但無 write，則 write = edit
 * - 若有 write 但無 edit，則 edit = write
 *
 * Since the official OpenCode permissions list does not include 'write',
 * we handle backward compatibility as follows:
 * - If edit exists but not write, then write = edit
 * - If write exists but not edit, then edit = write
 *
 * @param permission - 原始權限物件 / Original permission object
 * @returns 處理後的權限物件 / Processed permission object
 */
export function _handlePermission<T extends IShadowAgentPermission>(permission: T, runtime?: {
  agentsName?: IAllShadowAgentsName;
}) 
{
  permission.edit = permission.edit ?? permission.write;
  permission.write = permission.write ?? permission.edit;

  Object.keys(permission).forEach(key => {
    if (SHADOW_AGENT_PERMISSION_KEY_INVALID.includes(key as any)) {
      logArise2WithLevel('error', () => [
        `[utils] _handlePermission: Invalid permission key: ${key}, value: ${permission[key as keyof T]}`,
        runtime?.agentsName && `, agentsName: ${runtime.agentsName}`,
      ], {
        force: true,
      });
    }
  });

  return permission;
}
