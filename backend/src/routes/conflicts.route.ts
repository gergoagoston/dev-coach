import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { GithubConflictsBody } from "../types/github.types.js";
import { buildConflictPayload } from "../services/github.service.js";
import { predictConflicts } from "../services/gemini.service.js";
import {
	getCachedConflictRadar,
	parseCachedConflicts,
} from "../utils/cache.utils.js";
import { badRequest, parsePrNumber } from "../utils/http.utils.js";
import {
	createOctokit,
	ensureGithubUser,
	normalizeConflictUsers,
} from "../utils/github.utils.js";

export function createGithubConflictsRouter(prisma: PrismaClient) {
	const router = Router();

	router.post("/check-conflicts", async (req, res) => {
		const { token, repoName, prNumber: rawPrNumber } =
			req.body as GithubConflictsBody;

		if (!token || !repoName || rawPrNumber == null) {
			badRequest(res, "GitHub token, repoName, and prNumber are required");
			return;
		}

		const prNumber = parsePrNumber(rawPrNumber);
		if (!prNumber) {
			badRequest(res, "prNumber must be a positive number");
			return;
		}

		try {
			const result = await resolveConflictRadar(prisma, {
				token,
				repoName,
				prNumber,
			});

			res.status(200).json({
				conflicts: result.conflicts,
				cached: result.cached,
			});
		} catch (error) {
			console.error("GitHub check-conflicts failed:", error);
			res.status(500).json({ error: "Failed to check conflicts" });
		}
	});

	return router;
}

async function resolveConflictRadar(
	prisma: PrismaClient,
	{
		token,
		repoName,
		prNumber,
	}: {
		token: string;
		repoName: string;
		prNumber: number;
	},
) {
	const existingPr = await prisma.pullRequest.findUnique({
		where: { repoName_prNumber: { repoName, prNumber } },
	});
	const cachedConflictRadar = getCachedConflictRadar(existingPr);
	const conflictPayload = await buildConflictPayload(
		token,
		repoName,
		prNumber,
	);

	if (cachedConflictRadar) {
		const cachedConflicts = parseCachedConflicts(cachedConflictRadar);
		return {
			conflicts: normalizeConflictUsers(cachedConflicts, conflictPayload)
				.conflicts,
			cached: true,
		};
	}

	const conflicts = normalizeConflictUsers(
		await predictConflicts(conflictPayload),
		conflictPayload,
	);
	const octokit = createOctokit(token);
	const { data: authenticatedUser } =
		await octokit.rest.users.getAuthenticated();
	await ensureGithubUser(prisma, authenticatedUser.login);

	await prisma.pullRequest.upsert({
		where: { repoName_prNumber: { repoName, prNumber } },
		create: {
			githubUsername: authenticatedUser.login,
			repoName,
			prNumber,
			title: conflictPayload.currentPullRequest.title,
			status: conflictPayload.currentPullRequest.state,
			conflictRadar: JSON.stringify(conflicts),
		},
		update: {
			title: conflictPayload.currentPullRequest.title,
			status: conflictPayload.currentPullRequest.state,
			conflictRadar: JSON.stringify(conflicts),
		},
	});

	return { conflicts: conflicts.conflicts, cached: false };
}
