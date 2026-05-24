import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { createGithubAnalyzeRouter } from "./analyze.route.js";
import { createGithubConflictsRouter } from "./conflicts.route.js";
import { createLearningProfileRouter } from "./learning-profile.route.js";
import { createGithubPrsRouter } from "./prs.route.js";
import { createRepositoryHabitsRouter } from "./repository-habits.route.js";
import { createGithubValidateRouter } from "./validate.route.js";

export function GithubRouter(prisma: PrismaClient) {
	const router = Router();

	router.use(createGithubValidateRouter(prisma));
	router.use(createGithubPrsRouter(prisma));
	router.use(createGithubAnalyzeRouter(prisma));
	router.use(createGithubConflictsRouter(prisma));
	router.use(createLearningProfileRouter(prisma));
	router.use(createRepositoryHabitsRouter());

	return router;
}
