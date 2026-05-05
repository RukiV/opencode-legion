import { FileDiff, Message, Part, Session, SessionMessagesResponse } from "@opencode-ai/sdk";

export interface IOpenCodeSession extends Session
{
	id: string;
	projectID: string;
	directory: string;
	parentID?: string;
	summary?: {
		additions: number;
		deletions: number;
		files: number;
		diffs?: Array<FileDiff>;
	};
	share?: {
		url: string;
	};
	title: string;
	version: string;
	time: {
		created: number;
		updated: number;
		compacting?: number;
	};
	revert?: {
		messageID: string;
		partID?: string;
		snapshot?: string;
		diff?: string;
	};
};

type I_SessionMessagesResponsesEntry = SessionMessagesResponse[number];

export interface ISessionMessagesResponsesEntry extends I_SessionMessagesResponsesEntry
{
	info: Message;
	parts: Array<Part>;
}
