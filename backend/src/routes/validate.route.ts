import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { GithubValidateBody } from "../types/github.types.js";
import { badRequest } from "../utils/http.utils.js";
import { createOctokit, ensureGithubUser } from "../utils/github.utils.js";

export function createGithubValidateRouter(prisma: PrismaClient) {
	const router = Router();

	router.post("/validate", async (req, res) => {
		const { token } = req.body as GithubValidateBody;

		if (!token) {
			badRequest(res, "GitHub token is required");
			return;
		}

		try {
			const octokit = createOctokit(token);
			const { data: user } = await octokit.rest.users.getAuthenticated();
			const savedUser = await ensureGithubUser(prisma, user.login);

			res.status(200).json({
				username: user.login,
				profile: {
					id: user.id,
					name: user.name,
					avatarUrl: user.avatar_url,
					createdAt: savedUser.createdAt,
				},
			});
		} catch (error) {
			console.error("GitHub validate failed:", error);
			res.status(401).json({ error: "GitHub token validation failed" });
		}
	});

	return router;
}
