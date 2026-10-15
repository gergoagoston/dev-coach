import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type {
	GithubPrsBody,
	GithubPullRequest,
} from "../types/github.types.js";
import { badRequest } from "../utils/http.utils.js";
import {
	createOctokit,
	ensureGithubUser,
	parseRepoSlug,
} from "../utils/github.utils.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { githubPrsSchema } from "../schemas/api.schemas.js";

export function createGithubPrsRouter(prisma: PrismaClient) {
	const router = Router();

	router.post("/prs", validateBody(githubPrsSchema), async (req, res) => {
		const { token, repoName } = req.body as GithubPrsBody & {
			token: string;
			repoName: string;
		};

		const repoSlug = parseRepoSlug(repoName);
		if (!repoSlug) {
			badRequest(res, 'repoName must be in the format "owner/repo"');
			return;
		}

		try {
			const octokit = createOctokit(token);
			const { data: authenticatedUser } =
				await octokit.rest.users.getAuthenticated();
			await ensureGithubUser(prisma, authenticatedUser.login);

			const pullRequests = await octokit.paginate(octokit.rest.pulls.list, {
				owner: repoSlug.owner,
				repo: repoSlug.repo,
				state: "all",
				per_page: 100,
				sort: "updated",
				direction: "desc",
			});

			const savedPullRequests = [];

			for (const pullRequest of pullRequests as GithubPullRequest[]) {
				const githubUsername =
					pullRequest.user?.login ?? authenticatedUser.login;
				if (githubUsername !== authenticatedUser.login) {
					continue;
				}

				await ensureGithubUser(prisma, githubUsername);
				const saved = await prisma.pullRequest.upsert({
					where: {
						repoName_prNumber: {
							repoName,
							prNumber: pullRequest.number,
						},
					},
					create: {
						githubUsername,
						repoName,
						prNumber: pullRequest.number,
						title: pullRequest.title,
						status: pullRequest.state,
					},
					update: {
						githubUsername,
						title: pullRequest.title,
						status: pullRequest.state,
					},
				});

				savedPullRequests.push(saved);
			}

			res.status(200).json({
				repoName,
				count: savedPullRequests.length,
				pullRequests: savedPullRequests,
			});
		} catch (error) {
			console.error("GitHub PR sync failed:", error);
			res
				.status(500)
				.json({ error: "Failed to fetch and store pull requests" });
		}
	});

	return router;
}
