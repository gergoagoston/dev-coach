export type GeminiImprovement = {
	concept: string;
	title: string;
	severity: "high" | "medium" | "low";
	explanation: string;
	badExample: string;
	goodExample: string;
};

export type GeminiCodeReviewResult = {
	improvements: GeminiImprovement[];
};

export type GeminiConflictFinding = {
	conflictingPrNumber: number;
	title: string;
	developerToTalkTo: string;
	conflictingFile: string;
	dynamicReasoning: string;
	suggestions: string[];
};

export type GeminiRepoTaskSuggestions = {
	recommendations: string[];
};
