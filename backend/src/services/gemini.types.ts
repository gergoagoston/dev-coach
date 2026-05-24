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
	filename: string;
	conflictingPrNumber: number;
	conflictingUser: string;
	reasoning: string;
};

export type GeminiConflictResult = {
	conflicts: GeminiConflictFinding[];
};

export type GeminiRepoHabit = {
	concept: string;
	title: string;
	description: string;
	evidenceFiles: string[];
	priority: "high" | "medium" | "low";
};

export type GeminiRepoHabitsResult = {
	habits: GeminiRepoHabit[];
	recommendations: string[];
};
