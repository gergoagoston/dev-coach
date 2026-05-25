import { rm } from "node:fs/promises";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { RepositoryHabitsBody } from "../types/repository-habits.types.js";
import { analyzeRepositoryHabits } from "../services/gemini.service.js";
import {
	buildRepositoryIndex,
	vectorSearchIndex,
} from "../services/repo-indexer/indexer.service.js";
import { getOrBuildRepositoryIndex } from "../services/repository-index.service.js";
import { RepoGitService } from "../services/repo-indexer/git.service.js";
import { GitCloneError } from "../services/repo-indexer/types.js";
import { badRequest } from "../utils/http.utils.js";
import { parseRepoSlug } from "../utils/github.utils.js";

const RAG_TOP_K = 10;
const MAX_HABITS = 5;

export function createRepositoryHabitsRouter(prisma: PrismaClient) {
	const router = Router();
	const gitService = new RepoGitService();

	router.post("/", async (req, res) => {
		const { repoName, taskDescription = "" } = req.body as RepositoryHabitsBody;

		if (!repoName) {
			badRequest(res, "repoName is required");
			return;
		}

		const task = taskDescription.trim();
		if (!task) {
			badRequest(res, "taskDescription is required");
			return;
		}

		const normalizedRepo = parseRepoSlug(repoName);
		if (!normalizedRepo) {
			badRequest(res, 'repoName must be in the format "owner/repo"');
			return;
		}

		const repoKey = `${normalizedRepo.owner}/${normalizedRepo.repo}`;

		try {
			const { index, cached } = await getOrBuildRepositoryIndex(
				prisma,
				repoKey,
				async () => {
					let localPath: string | null = null;

					try {
						const cloneResult = await gitService.cloneRepository({
							owner: normalizedRepo.owner,
							repo: normalizedRepo.repo,
						});
						localPath = cloneResult.localPath;

						const builtIndex = await buildRepositoryIndex({
							workspaceDir: localPath,
							repoUrl: repoKey,
							maxFiles: 400,
							maxChunkSize: 2500,
						});
						return builtIndex;
					} finally {
						if (localPath) {
							await rm(localPath, { recursive: true, force: true }).catch(
								() => undefined,
							);
						}
					}
				},
			);

			const ragQuery = buildRagQuery(task);
			const hits = vectorSearchIndex(index, ragQuery, RAG_TOP_K);
			const context = formatRagContext(hits);
			const analysis = await analyzeRepositoryHabits(context, task);

			res.status(200).json({
				repoName: repoKey,
				task,
				habits: analysis.habits.slice(0, MAX_HABITS),
				recommendations: analysis.recommendations,
				filesScanned: index.filesScanned,
				ragChunksUsed: hits.length,
				cached,
			});
		} catch (error) {
			if (error instanceof GitCloneError) {
				console.error("Repository habits clone failed:", error.message);
				res.status(404).json({ error: error.message });
				return;
			}

			console.error("Repository habits analysis failed:", error);
			res.status(500).json({ error: "Failed to analyze repository habits" });
		}
	});

	return router;
}

function buildRagQuery(task: string) {
	return [
		task,
		"repository conventions",
		"patterns to follow",
		"folder structure",
		"testing style",
		"error handling",
		"API routes services components",
	].join("\n");
}

function formatRagContext(
	hits: Array<{ score: number; chunk: { filepath: string; code: string } }>,
) {
	return hits
		.map(
			(hit, index) =>
				`=== chunk ${index + 1} (score ${hit.score.toFixed(3)}) — ${hit.chunk.filepath}\n${hit.chunk.code}`,
		)
		.join("\n\n");
}
