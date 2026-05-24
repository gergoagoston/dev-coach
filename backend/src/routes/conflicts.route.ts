import { Octokit } from "@octokit/rest";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type {
	GithubCheckConflictsBody,
	GithubConflictsBody,
} from "../schemas/github.types.js";
import { buildConflictPayload } from "../services/github.service.js";
import { predictConflicts } from "../services/gemini.service.js";
import {
	ensureGithubUser,
	getCachedConflictRadar,
	normalizeConflictUsers,
	parseCachedConflicts,
} from "../utils/github.utils.js";

export function createGithubConflictsRouter(prisma: PrismaClient) {
	const router = Router();

	router.post("/conflicts", async (req, res) => {
		const { token, repoName, prNumber } = req.body as GithubConflictsBody;

		if (!token || !repoName || !prNumber) {
			res.status(400).json({
				error: "GitHub token, repoName, and prNumber are required",
			});
			return;
		}

		try {
			const existingPr = await prisma.pullRequest.findUnique({
				where: {
					repoName_prNumber: { repoName, prNumber: Number(prNumber) },
				},
			});
			const cachedConflictRadar = getCachedConflictRadar(existingPr);

			if (cachedConflictRadar) {
				const cachedConflicts = parseCachedConflicts(cachedConflictRadar);
				const conflictPayload = await buildConflictPayload(
					token,
					repoName,
					prNumber,
				);
				const normalizedCachedConflicts = normalizeConflictUsers(
					cachedConflicts,
					conflictPayload,
				);

				console.log(
					`[CACHE HIT]: Returning saved conflict radar for PR #${prNumber}`,
				);
				res.status(200).json({
					...normalizedCachedConflicts,
					cached: true,
				});
				return;
			}

			const conflictPayload = await buildConflictPayload(
				token,
				repoName,
				prNumber,
			);
			const aiConflicts = normalizeConflictUsers(
				await predictConflicts(conflictPayload),
				conflictPayload,
			);
			const octokit = new Octokit({ auth: token });
			const { data: authenticatedUser } =
				await octokit.rest.users.getAuthenticated();
			await ensureGithubUser(prisma, authenticatedUser.login);

			await prisma.pullRequest.upsert({
				where: {
					repoName_prNumber: { repoName, prNumber: Number(prNumber) },
				},
				create: {
					githubUsername: authenticatedUser.login,
					repoName,
					prNumber: Number(prNumber),
					title: conflictPayload.currentPullRequest.title,
					status: conflictPayload.currentPullRequest.state,
					conflictRadar: JSON.stringify(aiConflicts),
				},
				update: {
					title: conflictPayload.currentPullRequest.title,
					status: conflictPayload.currentPullRequest.state,
					conflictRadar: JSON.stringify(aiConflicts),
				},
			});

			res.status(200).json({
				...conflictPayload,
				aiConflicts,
				cached: false,
			});
		} catch (error) {
			console.error("GitHub conflict payload build failed:", error);
			res.status(500).json({
				error: "Failed to prepare the Gemini conflict payload",
			});
		}
	});

	router.post("/check-conflicts", async (req, res) => {
		const { token, repoName, prNumber } = req.body as GithubCheckConflictsBody;

		if (!token || !repoName || !prNumber) {
			res.status(400).json({
				error: "GitHub token, repoName, and prNumber are required",
			});
			return;
		}

		try {
			const existingPr = await prisma.pullRequest.findUnique({
				where: {
					repoName_prNumber: { repoName, prNumber: Number(prNumber) },
				},
			});
			const cachedConflictRadar = getCachedConflictRadar(existingPr);

			if (cachedConflictRadar) {
				const cachedConflicts = parseCachedConflicts(cachedConflictRadar);
				const conflictPayload = await buildConflictPayload(
					token,
					repoName,
					prNumber,
				);
				const normalizedCachedConflicts = normalizeConflictUsers(
					cachedConflicts,
					conflictPayload,
				);

				console.log(
					`[CACHE HIT]: Returning saved conflict radar for PR #${prNumber}`,
				);
				res.status(200).json({
					conflicts: normalizedCachedConflicts.conflicts,
					cached: true,
				});
				return;
			}

			const conflictPayload = await buildConflictPayload(
				token,
				repoName,
				prNumber,
			);
			const conflicts = normalizeConflictUsers(
				await predictConflicts(conflictPayload),
				conflictPayload,
			);
			const octokit = new Octokit({ auth: token });
			const { data: authenticatedUser } =
				await octokit.rest.users.getAuthenticated();
			await ensureGithubUser(prisma, authenticatedUser.login);

			await prisma.pullRequest.upsert({
				where: {
					repoName_prNumber: { repoName, prNumber: Number(prNumber) },
				},
				create: {
					githubUsername: authenticatedUser.login,
					repoName,
					prNumber: Number(prNumber),
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

			res.status(200).json({ conflicts: conflicts.conflicts, cached: false });
		} catch (error) {
			console.error("GitHub check-conflicts failed:", error);
			res.status(500).json({ error: "Failed to check conflicts" });
		}
	});

	return router;
}
