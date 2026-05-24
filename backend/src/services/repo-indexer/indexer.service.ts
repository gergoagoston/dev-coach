import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
	RepositoryIndexRequest,
	RepositoryIndexResult,
	RepositoryChunk,
} from "./types.js";

function isTextFile(name: string) {
	return /\.(ts|tsx|js|jsx|json|md|py|java|go|rs|css|html)$/i.test(name);
}

function tokenize(text: string) {
	return text
		.toLowerCase()
		.split(/[^a-z0-9_]+/i)
		.filter(Boolean);
}

function textToVector(text: string) {
	const tokens = tokenize(text);
	const freqs: Record<string, number> = {};
	for (const t of tokens) freqs[t] = (freqs[t] ?? 0) + 1;

	// normalize (L2)
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

async function walkFiles(root: string, maxFiles: number) {
	const out: string[] = [];
	async function walk(dir: string) {
		const items = await readdir(dir, { withFileTypes: true });
		for (const it of items) {
			const full = join(dir, it.name);
			if (it.isDirectory()) {
				await walk(full);
			} else if (it.isFile() && isTextFile(it.name)) {
				out.push(full);
				if (out.length >= maxFiles) return;
			}
		}
	}
	await walk(root);
	return out;
}

export async function indexRepository(
	request: RepositoryIndexRequest,
): Promise<RepositoryIndexResult> {
	const {
		workspaceDir,
		maxChunkSize = 2000,
		maxFiles = 1000,
		repoUrl = "local",
	} = request;
	if (!workspaceDir)
		throw new Error("workspaceDir is required for local indexing");

	const files = await walkFiles(workspaceDir, maxFiles);
	const chunks: RepositoryChunk[] = [];
	for (const fp of files) {
		const text = await readFile(fp, "utf8");
		if (!text.trim()) continue;

		// simple chunking by size
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

	// compute embeddings
	const persisted = {
		repoUrl,
		localPath: workspaceDir,
		branch: "local",
		filesScanned: files.length,
		chunks: [] as Array<
			RepositoryChunk & { embedding: Record<string, number> }
		>,
		chunkCount: chunks.length,
	};

	for (const c of chunks) {
		const embedding = textToVector(c.code);
		(persisted.chunks as any).push({ ...c, embedding });
	}

	// write index file next to workspace
	const indexPath = join(workspaceDir, ".pr-assistant-index.json");
	await writeFile(indexPath, JSON.stringify(persisted, null, 2), "utf8");

	return {
		repoUrl: persisted.repoUrl,
		localPath: persisted.localPath,
		branch: persisted.branch,
		filesScanned: persisted.filesScanned,
		chunks: persisted.chunks.map((c: any) => ({
			filepath: c.filepath,
			chunkType: c.chunkType,
			symbolName: c.symbolName,
			code: c.code,
		})),
		chunkCount: persisted.chunkCount,
	};
}

export async function vectorSearch(
	indexPath: string,
	query: string,
	topK = 5,
) {
	const raw = await readFile(indexPath, "utf8");
	const idx = JSON.parse(raw) as any;
	const qvec = textToVector(query);
	const scores = idx.chunks.map((c: any) => ({
		score: cosine(qvec, c.embedding),
		chunk: c,
	}));
	scores.sort((a: any, b: any) => b.score - a.score);
	return scores.slice(0, topK);
}

export { textToVector };
