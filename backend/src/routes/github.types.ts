export type GithubValidateBody = {
	token?: string;
};

export type GithubPrsBody = {
	token?: string;
	repoName?: string;
};

export type GithubAnalyzeBody = {
	token?: string;
	repoName?: string;
	prNumber?: number;
	username?: string;
};

export type GithubConflictsBody = {
	token?: string;
	repoName?: string;
	prNumber?: number;
};

export type GithubCheckConflictsBody = GithubConflictsBody;

export type RepoSlug = {
	owner: string;
	repo: string;
};

export type GithubPullRequest = {
	number: number;
	title: string;
	state: string;
	user: { login: string } | null;
};

export type GithubPullRequestFile = {
	filename: string;
	status: string;
	additions: number;
	deletions: number;
	changes: number;
	patch?: string | null;
};

export type GithubConflictFile = {
	filename: string;
	status: string;
	additions: number;
	deletions: number;
	changes: number;
	patch?: string | null;
};

export type GithubConflictPullRequest = {
	prNumber: number;
	title: string;
	state: string;
	creator: string;
	diff: string;
	changedFiles: GithubConflictFile[];
	overlappingFiles: string[];
};

export type GithubConflictPayload = {
	repository: string;
	currentPullRequest: {
		number: number;
		title: string;
		state: string;
		diff: string;
		changedFiles: GithubConflictFile[];
	};
	otherOpenPullRequests: GithubConflictPullRequest[];
	conflictingPullRequests: GithubConflictPullRequest[];
};
