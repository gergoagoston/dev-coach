import { Octokit } from "@octokit/rest";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { GithubAnalyzeBody } from "../schemas/github.types.js";
import { analyzePullRequestCode } from "../services/gemini.service.js";
import { fetchPullRequestDiff } from "../services/github.service.js";
import {
	extractLearningSignals,
	ensureGithubUser,
	parseRepoSlug,
	upsertLearningMemoryEntries,
} from "../utils/github.utils.js";

export function createGithubAnalyzeRouter(prisma: PrismaClient) {
	const router = Router();

	router.post("/analyze", async (req, res) => {
		const { token, repoName, prNumber, username } =
			req.body as GithubAnalyzeBody;

		if (!token || !repoName || !prNumber || !username) {
			res.status(400).json({
				error: "GitHub token, repoName, prNumber, and username are required",
			});
			return;
		}

		const repoSlug = parseRepoSlug(repoName);
		if (!repoSlug) {
			res.status(400).json({
				error: 'repoName must be in the format "owner/repo"',
			});
			return;
		}

		try {
			const existingPr = await prisma.pullRequest.findUnique({
				where: {
					repoName_prNumber: { repoName, prNumber: Number(prNumber) },
				},
			});

			if (existingPr && existingPr.aiAnalysis) {
				const cachedReview = normalizeCachedReview(existingPr.aiAnalysis);
				console.log(
					`[CACHE HIT]: Returning saved AI analysis for PR #${prNumber}`,
				);
				res.status(200).json({
					review: cachedReview,
					cached: true,
				});
				return;
			}

			console.log(
				`[CACHE MISS]: Fetching fresh diff and invoking Gemini for PR #${prNumber}`,
			);
			const diffContent = await fetchPullRequestDiff(
				token,
				repoName,
				prNumber,
			);
			console.log(
				`Fetched diff content for PR #${prNumber}, length: ${diffContent.length} characters`,
			);
			const review = await analyzePullRequestCode(diffContent);
			console.log(
				`Received AI review for PR #${prNumber}, improvements count:}`,
			);
			const octokit = new Octokit({ auth: token });
			const { data: currentPr } = await octokit.rest.pulls.get({
				owner: repoSlug.owner,
				repo: repoSlug.repo,
				pull_number: prNumber,
			});

			await ensureGithubUser(prisma, username);
			console.log(`Ensured GitHub user exists in DB: ${username}`);
			await prisma.pullRequest.upsert({
				where: {
					repoName_prNumber: { repoName, prNumber: Number(prNumber) },
				},
				create: {
					githubUsername: username,
					repoName,
					prNumber: Number(prNumber),
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

function normalizeCachedReview(rawReview: string) {
	try {
		const parsed = JSON.parse(rawReview) as unknown;

		if (Array.isArray(parsed)) {
			return { improvements: parsed };
		}

		if (
			parsed &&
			typeof parsed === "object" &&
			"improvements" in parsed &&
			Array.isArray((parsed as { improvements?: unknown[] }).improvements)
		) {
			return parsed;
		}

		return { improvements: [] };
	} catch {
		return { improvements: [] };
	}
}
