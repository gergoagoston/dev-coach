import { Octokit } from "@octokit/rest";
import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { GithubValidateBody } from "../schemas/github.types.js";

export function createGithubValidateRouter(prisma: PrismaClient) {
	const router = Router();

	router.post("/validate", async (req, res) => {
		const { token } = req.body as GithubValidateBody;

		if (!token) {
			res.status(400).json({ error: "GitHub token is required" });
			return;
		}

		try {
			const octokit = new Octokit({ auth: token });
			const { data: user } = await octokit.rest.users.getAuthenticated();

			const savedUser = await prisma.user.upsert({
				where: { githubUsername: user.login },
				create: { githubUsername: user.login },
				update: {},
			});

			res.status(200).json({
				username: user.login,
				profile: {
					id: user.id,
					name: user.name,
					avatarUrl: user.avatar_url,
					createdAt: savedUser.createdAt,
				},
			});
			console.log(`GitHub user validated: ${user.login}`);
		} catch (error) {
			console.error("GitHub validate failed:", error);
			res.status(401).json({ error: "GitHub token validation failed" });
		}
	});

	return router;
}
