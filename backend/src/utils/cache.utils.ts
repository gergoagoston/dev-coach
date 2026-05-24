import type {
	GeminiCodeReviewResult,
	GeminiConflictResult,
} from "../services/gemini.types.js";

export function parseCachedReview(rawReview: string): GeminiCodeReviewResult {
	try {
		const parsed = JSON.parse(rawReview) as unknown;

		if (Array.isArray(parsed)) {
			return { improvements: parsed as GeminiCodeReviewResult["improvements"] };
		}

		if (
			parsed &&
			typeof parsed === "object" &&
			"improvements" in parsed &&
			Array.isArray((parsed as { improvements?: unknown[] }).improvements)
		) {
			return parsed as GeminiCodeReviewResult;
		}
	} catch {
		// fall through
	}

	return { improvements: [] };
}

export function parseCachedConflicts(rawConflicts: string): GeminiConflictResult {
	try {
		const parsed = JSON.parse(rawConflicts) as {
			conflicts?: GeminiConflictResult["conflicts"];
		};

		return {
			conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
		};
	} catch {
		return { conflicts: [] };
	}
}

export function getCachedConflictRadar(
	pullRequest: { conflictRadar?: string | null } | null,
) {
	return pullRequest?.conflictRadar ?? null;
}
