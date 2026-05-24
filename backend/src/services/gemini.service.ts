import { geminiClient, GEMINI_MODEL } from "../gemini-client.js";
import type { ContentListUnion } from "@google/genai";
import type { GithubConflictPayload } from "../types/github.types.js";
import type {
	GeminiCodeReviewResult,
	GeminiConflictResult,
	GeminiRepoHabitsResult,
} from "./gemini.types.js";
import {
	codeReviewSchema,
	conflictResponseSchema,
	repoHabitsSchema,
} from "./gemini.schemas.js";

const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_DELAY_MS = 1000;
const GEMINI_QUOTA_COOLDOWN_MS = 60_000;

let geminiDisabledUntil = 0;

export async function analyzePullRequestCode(
	diffContent: string,
): Promise<GeminiCodeReviewResult> {
	const truncatedDiff = truncateText(diffContent, 25_000);

	return generateStructuredJson<GeminiCodeReviewResult>({
		fallback: { improvements: [] },
		responseSchema: codeReviewSchema,
		systemInstruction: `You are a senior code reviewer. Audit the git diff for logical bugs, security risks, missing error handling, and architectural issues.

For each improvement provide:
- concept: short kebab-case identifier
- title: brief human-readable title
- severity: high, medium, or low
- explanation: why this matters in production
- badExample: the problematic snippet from the diff
- goodExample: a production-ready replacement (no markdown fences)`,
		contents: [
			{
				role: "user",
				parts: [
					{
						text: `Review this git diff:\n\n${truncatedDiff}`,
					},
				],
			},
		],
	});
}

export async function predictConflicts(
	payload: GithubConflictPayload,
): Promise<GeminiConflictResult> {
	const stringifiedPayload = truncateText(JSON.stringify(payload), 50_000);

	return generateStructuredJson<GeminiConflictResult>({
		fallback: { conflicts: [] },
		responseSchema: conflictResponseSchema,
		systemInstruction: `You are a Git conflict radar. Compare the target PR against other open PRs and report logical conflicts: overlapping API changes, signature changes, shared file edits, or deleted code still used elsewhere.

For each conflict return filename, conflictingPrNumber, conflictingUser, and reasoning.`,
		contents: [
			{
				role: "user",
				parts: [
					{
						text: `Analyze these pull requests for cross-PR conflicts:\n\n${stringifiedPayload}`,
					},
				],
			},
		],
	});
}

export async function analyzeRepositoryHabits(
	context: string,
	taskDescription: string,
): Promise<GeminiRepoHabitsResult> {
	const task = taskDescription.trim() || "general repository onboarding";

	return generateStructuredJson<GeminiRepoHabitsResult>({
		fallback: { habits: [], recommendations: [] },
		responseSchema: repoHabitsSchema,
		systemInstruction: `You extract recurring engineering habits from repository context. Focus on conventions, folder structure, testing style, error handling, and naming patterns evidenced in the code.`,
		contents: [
			{
				role: "user",
				parts: [
					{
						text: `Task: ${task}\n\nRepository context:\n${truncateText(context, 30_000)}`,
					},
				],
			},
		],
	});
}

async function generateStructuredJson<T>({
	fallback,
	responseSchema,
	systemInstruction,
	contents,
}: {
	fallback: T;
	responseSchema: unknown;
	systemInstruction: string;
	contents: ContentListUnion;
}): Promise<T> {
	if (isGeminiTemporarilyDisabled()) {
		return fallback;
	}

	try {
		const response = await generateContentWithRetry(() =>
			geminiClient.models.generateContent({
				model: GEMINI_MODEL,
				contents,
				config: {
					responseMimeType: "application/json",
					responseSchema,
					systemInstruction,
				},
			}),
		);

		return parseJsonResponse(response.text, fallback);
	} catch (error) {
		markGeminiTemporarilyDisabled(error);
		console.error("Gemini structured request failed:", error);
		return fallback;
	}
}

async function generateContentWithRetry<T>(requestFactory: () => Promise<T>) {
	let lastError: unknown = null;

	for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
		try {
			return await requestFactory();
		} catch (error) {
			lastError = error;

			if (!isRetryableGeminiError(error) || attempt === GEMINI_MAX_ATTEMPTS) {
				throw error;
			}

			await delay(GEMINI_RETRY_DELAY_MS * attempt);
		}
	}

	throw lastError ?? new Error("Gemini request failed");
}

function parseJsonResponse<T>(rawText: string | undefined, fallback: T): T {
	if (!rawText) {
		return fallback;
	}

	const cleaned = rawText
		.trim()
		.replace(/^```json\s*/i, "")
		.replace(/^```\s*/i, "")
		.replace(/\s*```$/i, "");

	try {
		return JSON.parse(cleaned) as T;
	} catch {
		return fallback;
	}
}

function truncateText(text: string, limit: number) {
	return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function isRetryableGeminiError(error: unknown) {
	if (!error || typeof error !== "object") {
		return false;
	}

	const status =
		"status" in error ? (error as { status?: unknown }).status : undefined;
	return status === 429 || status === 500 || status === 503;
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGeminiTemporarilyDisabled() {
	return Date.now() < geminiDisabledUntil;
}

function markGeminiTemporarilyDisabled(error: unknown) {
	if (!isRetryableGeminiError(error)) {
		return;
	}

	const retryAfterMs = extractRetryAfterMs(error);
	geminiDisabledUntil =
		Date.now() + Math.max(retryAfterMs, GEMINI_QUOTA_COOLDOWN_MS);
}

function extractRetryAfterMs(error: unknown) {
	if (!error || typeof error !== "object") {
		return 0;
	}

	const details =
		"details" in error ? (error as { details?: unknown }).details : undefined;
	if (!Array.isArray(details)) {
		return 0;
	}

	for (const detail of details) {
		if (!detail || typeof detail !== "object") {
			continue;
		}

		const retryDelay =
			"retryDelay" in detail
				? (detail as { retryDelay?: unknown }).retryDelay
				: undefined;
		if (typeof retryDelay === "string") {
			const parsed = parseDurationToMs(retryDelay);
			if (parsed > 0) {
				return parsed;
			}
		}
	}

	return 0;
}

function parseDurationToMs(value: string) {
	const match = value.match(/^(\d+)(ms|s)?$/i);
	if (!match) {
		return 0;
	}

	const amount = Number(match[1]);
	const unit = match[2]?.toLowerCase();

	if (!Number.isFinite(amount) || amount <= 0) {
		return 0;
	}

	if (unit === "s") {
		return amount * 1000;
	}

	return amount;
}
