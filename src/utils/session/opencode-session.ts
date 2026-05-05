import { ISessionMessagesResponsesEntry } from '../../types/opencode/types-session';
import { typeNarrowed } from 'ts-type-predicates';
import { IModelBody } from '../../types/types-opencode';

export function _extractModelInfo(messageInfo: ISessionMessagesResponsesEntry["info"])
{
	if (!messageInfo)
	{
		return;
	}

	if (typeNarrowed<{
		model: IModelBody
	}>(messageInfo, () => (messageInfo as any).model))
	{
		return messageInfo.model
	}
	else if (messageInfo.providerID && messageInfo.modelID)
	{
		return {
			providerID: messageInfo.providerID,
			modelID: messageInfo.modelID,
		}
	}
}
