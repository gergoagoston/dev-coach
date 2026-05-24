import { join } from "node:path";
import { Router } from "express";
import type { GithubRepositoryHabitsBody } from "../types/github.types.js";
import { analyzeRepositoryHabits } from "../services/gemini.service.js";
import {
	indexRepository,
	vectorSearch,
} from "../services/repo-indexer/indexer.service.js";
import { RepoGitService } from "../services/repo-indexer/git.service.js";
import { badRequest } from "../utils/http.utils.js";
import { parseRepoSlug } from "../utils/github.utils.js";

export function createRepositoryHabitsRouter() {
	const router = Router();
	const gitService = new RepoGitService();

	router.post("/repository-habits", async (req, res) => {
		const { token, repoName, taskDescription = "" } =
			req.body as GithubRepositoryHabitsBody;

		if (!token || !repoName) {
			badRequest(res, "GitHub token and repoName are required");
			return;
		}

		const repoSlug = parseRepoSlug(repoName);
		if (!repoSlug) {
			badRequest(res, 'repoName must be in the format "owner/repo"');
			return;
		}

		let localPath: string | null = null;

		try {
			const cloneResult = await gitService.cloneRepository({
				repoUrl: `https://x-access-token:${token}@github.com/${repoSlug.owner}/${repoSlug.repo}.git`,
			});
			localPath = cloneResult.localPath;

			const indexResult = await indexRepository({
				workspaceDir: localPath,
				repoUrl: repoName,
				maxFiles: 400,
				maxChunkSize: 2500,
			});
			const indexPath = join(localPath, ".pr-assistant-index.json");
			const query =
				taskDescription.trim() ||
				"What conventions and architectural patterns define this repository?";
			const hits = await vectorSearch(indexPath, query, 8);
			const context = hits
				.map(
					(
						hit: { score: number; chunk: { filepath: string; code: string } },
						index: number,
					) =>
						`=== ${index + 1} (${hit.score.toFixed(3)}) ${hit.chunk.filepath}\n${hit.chunk.code}`,
				)
				.join("\n\n");

			const analysis = await analyzeRepositoryHabits(context, query);

			res.status(200).json({
				repoName,
				habits: analysis.habits,
				recommendations: analysis.recommendations,
				filesScanned: indexResult.filesScanned,
				cached: false,
			});
		} catch (error) {
			console.error("Repository habits analysis failed:", error);
			res.status(500).json({ error: "Failed to analyze repository habits" });
		}
	});

	return router;
}
