import { z } from "zod";

export const githubTokenSchema = z.object({
	token: z.string().trim().min(1, "GitHub token is required"),
});

export const githubPrsSchema = z.object({
	token: z.string().trim().min(1, "GitHub token is required"),
	repoName: z.string().trim().min(1, "repoName is required"),
});

export const githubAnalyzeSchema = z.object({
	token: z.string().trim().min(1),
	repoName: z.string().trim().min(1),
	prNumber: z.coerce.number().int().positive(),
	username: z.string().trim().min(1),
});

export const githubConflictsSchema = z.object({
	token: z.string().trim().min(1),
	repoName: z.string().trim().min(1),
	prNumber: z.coerce.number().int().positive(),
});

export const repositoryHabitsSchema = z.object({
	repoName: z.string().trim().min(1),
	taskDescription: z.string().trim().min(1),
});

export const usernameQuerySchema = z.object({
	username: z.string().trim().min(1),
});
