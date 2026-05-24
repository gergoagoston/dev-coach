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

export type RepositoryIndexResult = {
	repoUrl: string;
	localPath: string;
	branch: string;
	filesScanned: number;
	chunks: RepositoryChunk[];
	chunkCount: number;
};

export type ParsedSymbolChunk = {
	filepath: string;
	symbolName: string;
	code: string;
	nodeKind: "function" | "class" | "interface" | "hook";
	isExported: boolean;
};

export class RepoIndexerError extends Error {
	constructor(message: string, public readonly cause?: unknown) {
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

export class RepoScanError extends RepoIndexerError {
	constructor(message: string, cause?: unknown) {
		super(message, cause);
		this.name = "RepoScanError";
	}
}

export class RepoParseError extends RepoIndexerError {
	constructor(message: string, cause?: unknown) {
		super(message, cause);
		this.name = "RepoParseError";
	}
}