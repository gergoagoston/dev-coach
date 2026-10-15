import type { PrismaClient } from "@prisma/client";
import { createGithubClient } from "../integrations/github/client.js";
import type {
	GithubConflictPayload,
	GithubPullRequestFile,
	RepoSlug,
} from "../types/github.types.js";
import type { GeminiImprovement } from "../services/gemini.types.js";

export type GithubLearningImprovement = {
	concept: string;
	title: string;
	severity: "high" | "medium" | "low";
	explanation: string;
	badExample: string;
	goodExample: string;
};

export async function ensureGithubUser(
	prisma: PrismaClient,
	githubUsername: string,
) {
	return prisma.user.upsert({
		where: { githubUsername },
		create: { githubUsername },
		update: {},
	});
}

export async function upsertLearningMemoryEntries(
	prisma: PrismaClient,
	githubUsername: string,
	improvements: GithubLearningImprovement[],
) {
	for (const improvement of improvements) {
		await prisma.learningMemory.upsert({
			where: {
				githubUsername_concept: {
					githubUsername,
					concept: improvement.concept,
				},
			},
			create: {
				githubUsername,
				concept: improvement.concept,
				count: 1,
				title: improvement.title,
				description: improvement.explanation,
				badExample: improvement.badExample,
				goodExample: improvement.goodExample,
			},
			update: {
				count: { increment: 1 },
				title: improvement.title,
				description: improvement.explanation,
				badExample: improvement.badExample,
				goodExample: improvement.goodExample,
			},
		});
	}
}

export function parseRepoSlug(repoName: string): RepoSlug | null {
	const normalized = repoName
		.trim()
		.replace(/^https?:\/\/github\.com\//, "")
		.replace(/\.git$/, "");
	const parts = normalized.split("/").filter(Boolean);

	if (parts.length < 2) {
		return null;
	}

	return {
		owner: parts[0],
		repo: parts[1],
	};
}

export function createOctokit(token: string) {
	return createGithubClient(token);
}

export function normalizeConflictUsers<
	T extends {
		conflicts: Array<{ conflictingPrNumber: number; conflictingUser: string }>;
	},
>(conflictResult: T, conflictPayload: GithubConflictPayload) {
	const creatorByPrNumber = new Map<number, string>();

	for (const pullRequest of conflictPayload.otherOpenPullRequests) {
		creatorByPrNumber.set(pullRequest.prNumber, pullRequest.creator);
	}

	return {
		...conflictResult,
		conflicts: conflictResult.conflicts.map((conflict) => ({
			...conflict,
			conflictingUser:
				creatorByPrNumber.get(conflict.conflictingPrNumber) ??
				conflict.conflictingUser,
		})),
	};
}

function isLearningImprovement(value: unknown): value is GeminiImprovement {
	if (!value || typeof value !== "object") {
		return false;
	}

	const improvement = value as Partial<GeminiImprovement>;
	return (
		typeof improvement.concept === "string" &&
		typeof improvement.title === "string" &&
		(improvement.severity === "high" ||
			improvement.severity === "medium" ||
			improvement.severity === "low") &&
		typeof improvement.explanation === "string" &&
		typeof improvement.badExample === "string" &&
		typeof improvement.goodExample === "string"
	);
}

export function extractLearningSignals(improvements: unknown) {
	if (!Array.isArray(improvements)) {
		return [];
	}

	const severityRank: Record<"high" | "medium" | "low", number> = {
		high: 3,
		medium: 2,
		low: 1,
	};

	const dedupedByConcept = new Map<string, GithubLearningImprovement>();

	for (const item of improvements) {
		if (!isLearningImprovement(item)) {
			continue;
		}

		const improvement: GithubLearningImprovement = {
			concept: item.concept,
			title: item.title,
			severity: item.severity,
			explanation: item.explanation,
			badExample: item.badExample,
			goodExample: item.goodExample,
		};
		const existing = dedupedByConcept.get(improvement.concept);

		if (
			!existing ||
			severityRank[improvement.severity] > severityRank[existing.severity]
		) {
			dedupedByConcept.set(improvement.concept, improvement);
		}
	}

	return [...dedupedByConcept.values()]
		.filter((improvement) => improvement.severity !== "low")
		.sort(
			(left, right) =>
				severityRank[right.severity] - severityRank[left.severity],
		)
		.slice(0, 5);
}

export function findOverlappingFiles(
	currentFiles: GithubPullRequestFile[],
	otherFiles: GithubPullRequestFile[],
) {
	const currentFileNames = new Set(currentFiles.map((file) => file.filename));
	return otherFiles
		.filter((file) => currentFileNames.has(file.filename))
		.map((file) => file.filename);
}
