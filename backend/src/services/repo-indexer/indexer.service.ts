import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { RepositoryIndexRequest, RepositoryChunk } from "./types.js";

export type IndexedChunk = RepositoryChunk & {
	embedding: Record<string, number>;
};

export type RepositoryVectorIndex = {
	repoUrl: string;
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

function tokenize(text: string) {
	return text
		.toLowerCase()
		.split(/[^a-z0-9_]+/i)
		.filter(Boolean);
}

export function textToVector(text: string) {
	const tokens = tokenize(text);
	const freqs: Record<string, number> = {};
	for (const t of tokens) freqs[t] = (freqs[t] ?? 0) + 1;

	let sum = 0;
	for (const v of Object.values(freqs)) sum += v * v;
	const norm = Math.sqrt(sum) || 1;
	for (const k of Object.keys(freqs)) freqs[k] = freqs[k] / norm;
	return freqs;
}

function cosine(a: Record<string, number>, b: Record<string, number>) {
	let dot = 0;
	for (const k of Object.keys(a)) {
		if (k in b) dot += a[k] * (b[k] as number);
	}
	let na = 0;
	let nb = 0;
	for (const v of Object.values(a)) na += v * v;
	for (const v of Object.values(b)) nb += v * v;
	const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
	return dot / denom;
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

	const indexedChunks: IndexedChunk[] = chunks.map((chunk) => ({
		...chunk,
		embedding: textToVector(chunk.code),
	}));

	return {
		repoUrl,
		filesScanned: files.length,
		chunkCount: indexedChunks.length,
		chunks: indexedChunks,
	};
}

export function vectorSearchIndex(
	index: RepositoryVectorIndex,
	query: string,
	topK = 5,
): VectorSearchHit[] {
	const qvec = textToVector(query);
	const scores = index.chunks.map((chunk) => ({
		score: cosine(qvec, chunk.embedding),
		chunk,
	}));

	scores.sort((left, right) => right.score - left.score);
	return scores.slice(0, topK);
}
