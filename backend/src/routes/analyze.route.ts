import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { GithubAnalyzeBody } from "../types/github.types.js";
import { analyzePullRequestCode } from "../services/gemini.service.js";
import { fetchPullRequestDiff } from "../services/github.service.js";
import { parseCachedReview } from "../utils/cache.utils.js";
import { badRequest, parsePrNumber } from "../utils/http.utils.js";
import {
	createOctokit,
	ensureGithubUser,
	extractLearningSignals,
	parseRepoSlug,
	upsertLearningMemoryEntries,
} from "../utils/github.utils.js";

export function createGithubAnalyzeRouter(prisma: PrismaClient) {
	const router = Router();

	router.post("/analyze", async (req, res) => {
		const { token, repoName, prNumber: rawPrNumber, username } =
			req.body as GithubAnalyzeBody;

		if (!token || !repoName || rawPrNumber == null || !username) {
			badRequest(
				res,
				"GitHub token, repoName, prNumber, and username are required",
			);
			return;
		}

		const prNumber = parsePrNumber(rawPrNumber);
		if (!prNumber) {
			badRequest(res, "prNumber must be a positive number");
			return;
		}

		const repoSlug = parseRepoSlug(repoName);
		if (!repoSlug) {
			badRequest(res, 'repoName must be in the format "owner/repo"');
			return;
		}

		try {
			const existingPr = await prisma.pullRequest.findUnique({
				where: { repoName_prNumber: { repoName, prNumber } },
			});

			if (existingPr?.aiAnalysis) {
				res.status(200).json({
					review: parseCachedReview(existingPr.aiAnalysis),
					cached: true,
				});
				return;
			}

			const diffContent = await fetchPullRequestDiff(
				token,
				repoName,
				prNumber,
			);
			const review = await analyzePullRequestCode(diffContent);
			const octokit = createOctokit(token);
			const { data: currentPr } = await octokit.rest.pulls.get({
				owner: repoSlug.owner,
				repo: repoSlug.repo,
				pull_number: prNumber,
			});

			await ensureGithubUser(prisma, username);
			await prisma.pullRequest.upsert({
				where: { repoName_prNumber: { repoName, prNumber } },
				create: {
					githubUsername: username,
					repoName,
					prNumber,
					title: currentPr.title,
					status: currentPr.state,
					aiAnalysis: JSON.stringify(review),
				},
				update: {
					githubUsername: username,
					title: currentPr.title,
					status: currentPr.state,
					aiAnalysis: JSON.stringify(review),
				},
			});

			await upsertLearningMemoryEntries(
				prisma,
				username,
				extractLearningSignals(review.improvements),
			);

			res.status(200).json({ review, cached: false });
		} catch (error) {
			console.error("GitHub analyze failed:", error);
			res.status(500).json({ error: "Failed to analyze pull request" });
		}
	});

	return router;
}
