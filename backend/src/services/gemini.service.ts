import { geminiClient, GEMINI_MODEL } from "../gemini-client.js";
import type { ContentListUnion } from "@google/genai";
import type {
	GeminiCodeReviewResult,
	GeminiConflictFinding,
} from "./gemini.types";
import { codeReviewSchema, conflictResponseSchema } from "./gemini.schemas.js";

const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_DELAY_MS = 1000;
const GEMINI_QUOTA_COOLDOWN_MS = 60000; // 1 perc pihenő, ha elfogy a kvóta

// Globális változó a rate limit (429) kezeléséhez
let geminiDisabledUntil = 0;

export async function analyzePullRequestCode(
	diffContent: string,
): Promise<GeminiCodeReviewResult> {
	const truncatedDiff = truncateText(diffContent, 25000);

	try {
		return await generateStructuredJson<GeminiCodeReviewResult>({
			fallback: { improvements: [] },
			responseSchema: codeReviewSchema,
			systemInstruction: `You are an elite, brutally honest Senior Code Reviewer and Software Architect. 
Your job is to audit the provided git diff for logical bugs, security risks, missing try-catch error handling, memory leaks, and architectural anti-patterns.

Strict Rules for your output:
1. "concept": Create a short, unique kebab-case identifier (e.g., "missing-try-catch", "sql-injection", "unhandled-promise").
2. "title": A brief, human-readable title of the issue.
3. "explanation": Explain exactly WHY this code is dangerous or sub-optimal in production.
4. "badExample": Extract the exact bad line or snippet from the diff.
5. "goodExample": Write the beautifully refactored, production-ready, safe version of that exact snippet. Make sure it is instantly copy-pasteable.

Do not include markdown code fences (\`\`\`) inside the badExample or goodExample fields, just raw code string. Be extremely precise.`,
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `Review this raw git diff and identify critical engineering improvements:\n\n${truncatedDiff}`,
						},
					],
				},
			],
		});
	} catch (error) {
		console.error("Gemini code review failed:", error);
		return { improvements: [] };
	}
}

export async function predictConflicts(
	payload: any,
): Promise<{ conflicts: any[] }> {
	// Biztonsági okokból stringgé alakítjuk, és ha túl nagy, levágjuk (bár a 2.5 flash elbírja)
	const stringifiedPayload = JSON.stringify(payload);

	try {
		const response = await generateContentWithRetry(() =>
			geminiClient.models.generateContent({
				model: GEMINI_MODEL,
				config: {
					responseMimeType: "application/json",
					responseSchema: conflictResponseSchema,
					systemInstruction: `You are an advanced Git Conflict Radar. Your job is to analyze code changes from a target Pull Request and compare them against other open Pull Requests in the same repository.
            
Look for LOGICAL conflicts, structural overlaps, and architectural dependencies. For example:
- One developer modifies a function signature, while another developer calls that same function elsewhere.
- Both developers heavily modify the exact same utility file or database schema helper.
- One developer deletes an API route that another developer is expanding.

For each issue found, populate the array item with:
1. "filename": The file where the overlap occurs.
2. "conflictingPrNumber": The number of the other open PR causing the clash.
3. "conflictingUser": The GitHub username of that PR's creator.
4. "reasoning": Clear explanation detailing who is doing what, and exactly how it will break the application if merged without synchronization.`,
				},
				contents: [
					{
						role: "user",
						parts: [
							{
								text: `Analyze these active code changes for cross-PR intersections:\n\n${stringifiedPayload}`,
							},
						],
					},
				],
			}),
		);

		return parseJsonResponse(response.text, { conflicts: [] });
	} catch (error) {
		// <--- EZ A RÉSZ ÉS A ZÁRÓJEL HIÁNYZOTT!
		console.error("Conflict prediction failed:", error);
		return { conflicts: [] };
	}
} // <--- ÉS EZ A FÜGGVÉNYT LEZÁRÓ ZÁRÓJEL IS HIÁNYZOTT!

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
		console.error("🔥 GEMINI API HIBA RÉSZLETEI:", error); // Ezt a sort adtuk hozzá!
		console.warn("Gemini structured request failed; using fallback.");
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

	// A JAVÍTOTT RÉSZ: `{3} használata a három backtick (```) helyett
	const cleaned = rawText
		.trim()
		.replace(/^`{3}json\s*/i, "")
		.replace(/^`{3}\s*/i, "")
		.replace(/\s*`{3}$/i, "");

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

function emptyCodeReview(): GeminiCodeReviewResult {
	return { improvements: [] };
}
