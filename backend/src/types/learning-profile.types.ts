export type LearningMemoryRecord = {
	id: number;
	githubUsername: string;
	concept: string;
	count: number;
	title: string;
	description: string;
	badExample: string;
	goodExample: string;
	lastSeen: string;
};

export type LearningProfileSummary = {
	totalPatterns: number;
	uniqueConcepts: number;
	topConcept: string | null;
	recentTitle: string | null;
};

export type LearningProfileResponse = {
	mistakes: LearningMemoryRecord[];
	summary: LearningProfileSummary;
};