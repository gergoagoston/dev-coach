import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { RepositoryIndexRequest, RepositoryChunk } from "./types.js";
import {
	embedText,
	GEMINI_EMBEDDING_MODEL,
} from "../../integrations/gemini/client.js";

export type IndexedChunk = RepositoryChunk & {
	embedding: number[];
};

export type RepositoryVectorIndex = {
	version: 2;
	repoUrl: string;
	embeddingModel: string;
	filesScanned: number;
	chunkCount: number;
	chunks: IndexedChunk[];
};

export type VectorSearchHit = {
	score: number;
	chunk: IndexedChunk;
};

function isTextFile(name: string) {
	return /\.(ts|tsx|js|jsx|json|md|py|java|go|rs|css|html)$/i.test(name);
}

function cosine(a: number[], b: number[]) {
	if (a.length !== b.length || a.length === 0) return 0;

	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let index = 0; index < a.length; index += 1) {
		dot += a[index] * b[index];
		na += a[index] * a[index];
		nb += b[index] * b[index];
	}

	return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const SKIPPED_DIR_NAMES = new Set([
	".git",
	"node_modules",
	"dist",
	"build",
	"coverage",
	".next",
	"vendor",
	"tmp",
	"temp",
]);

async function walkFiles(root: string, maxFiles: number) {
	const out: string[] = [];

	async function walk(dir: string) {
		if (out.length >= maxFiles) {
			return;
		}

		let items;
		try {
			items = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const it of items) {
			if (out.length >= maxFiles) {
				return;
			}

			if (it.name === "." || it.name === "..") {
				continue;
			}

			const full = join(dir, it.name);

			if (typeof it.isSymbolicLink === "function" && it.isSymbolicLink()) {
				continue;
			}

			if (it.isDirectory()) {
				if (SKIPPED_DIR_NAMES.has(it.name)) {
					continue;
				}

				try {
					await walk(full);
				} catch {
					continue;
				}
				continue;
			}

			if (it.isFile() && isTextFile(it.name)) {
				out.push(full);
			}
		}
	}

	await walk(root);
	return out;
}

export async function buildRepositoryIndex(
	request: RepositoryIndexRequest,
): Promise<RepositoryVectorIndex> {
	const {
		workspaceDir,
		maxChunkSize = 2000,
		maxFiles = 1000,
		repoUrl = "local",
	} = request;

	if (!workspaceDir) {
		throw new Error("workspaceDir is required for local indexing");
	}

	const files = await walkFiles(workspaceDir, maxFiles);
	const chunks: RepositoryChunk[] = [];

	for (const fp of files) {
		let text = "";
		try {
			text = await readFile(fp, "utf8");
		} catch {
			continue;
		}

		if (!text.trim()) continue;

		for (let i = 0; i < text.length; i += maxChunkSize) {
			const slice = text.slice(i, i + maxChunkSize);
			chunks.push({
				filepath: relative(workspaceDir, fp).replace(/\\/g, "/"),
				chunkType: "service",
				symbolName: "",
				code: slice,
			});
		}
	}

	const indexedChunks: IndexedChunk[] = [];
	for (let index = 0; index < chunks.length; index += 1) {
		const chunk = chunks[index];
		const embedding = await embedText(
			`${chunk.filepath}\n${chunk.code}`,
			"RETRIEVAL_DOCUMENT",
		);
		indexedChunks.push({ ...chunk, embedding });
	}

	return {
		version: 2,
		repoUrl,
		embeddingModel: GEMINI_EMBEDDING_MODEL,
		filesScanned: files.length,
		chunkCount: indexedChunks.length,
		chunks: indexedChunks,
	};
}

export async function vectorSearchIndex(
	index: RepositoryVectorIndex,
	query: string,
	topK = 5,
): Promise<VectorSearchHit[]> {
	const qvec = await embedText(query, "RETRIEVAL_QUERY");
	const scores = index.chunks.map((chunk) => ({
		score: cosine(qvec, chunk.embedding),
		chunk,
	}));

	scores.sort((left, right) => right.score - left.score);
	return scores.slice(0, topK);
}
