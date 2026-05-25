export type ChunkType =
	| "function"
	| "class"
	| "interface"
	| "hook"
	| "service"
	| "controller";

export type RepositoryChunk = {
	filepath: string;
	chunkType: ChunkType;
	symbolName: string;
	code: string;
};

export type RepositoryIndexRequest = {
	repoUrl: string;
	branch?: string;
	workspaceDir?: string;
	maxChunkSize?: number;
	maxFiles?: number;
};

export class RepoIndexerError extends Error {
	constructor(
		message: string,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "RepoIndexerError";
	}
}

export class GitCloneError extends RepoIndexerError {
	constructor(message: string, cause?: unknown) {
		super(message, cause);
		this.name = "GitCloneError";
	}
}
