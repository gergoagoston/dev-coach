import { Octokit } from "@octokit/rest";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type {
	GithubPrsBody,
	GithubPullRequest,
} from "../schemas/github.types.js";
import { ensureGithubUser, parseRepoSlug } from "../utils/github.utils.js";

export function createGithubPrsRouter(prisma: PrismaClient) {
	const router = Router();

	router.post("/prs", async (req, res) => {
		const { token, repoName } = req.body as GithubPrsBody;

		if (!token || !repoName) {
			res
				.status(400)
				.json({ error: "GitHub token and repoName are required" });
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
			const octokit = new Octokit({ auth: token });
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
				await ensureGithubUser(prisma, githubUsername);
				if (githubUsername == authenticatedUser.login) {
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
