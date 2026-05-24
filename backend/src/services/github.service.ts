import axios from "axios";
import { Octokit } from "@octokit/rest";
import type {
	GithubConflictPayload,
	GithubConflictPullRequest,
	GithubPullRequest,
	GithubPullRequestFile,
} from "../schemas/github.types.js";
import { findOverlappingFiles, parseRepoSlug } from "../utils/github.utils.js";

export async function fetchPullRequestDiff(
	token: string,
	repoName: string,
	prNumber: number,
): Promise<string> {
	const response = await axios.get(
		`https://api.github.com/repos/${repoName}/pulls/${prNumber}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github.v3.diff",
			},
			responseType: "text",
		},
	);

	return typeof response.data === "string"
		? response.data
		: String(response.data ?? "");
}

export async function buildConflictPayload(
	token: string,
	repoName: string,
	prNumber: number,
): Promise<GithubConflictPayload> {
	const repoSlug = parseRepoSlug(repoName);
	if (!repoSlug) {
		throw new Error('repoName must be in the format "owner/repo"');
	}

	const octokit = new Octokit({ auth: token });
	const [{ data: currentPr }, currentDiff, currentFiles, openPullRequests] =
		await Promise.all([
			octokit.rest.pulls.get({
				owner: repoSlug.owner,
				repo: repoSlug.repo,
				pull_number: prNumber,
			}),
			fetchPullRequestDiff(token, repoName, prNumber),
			octokit.paginate(octokit.rest.pulls.listFiles, {
				owner: repoSlug.owner,
				repo: repoSlug.repo,
				pull_number: prNumber,
				per_page: 100,
			}),
			octokit.paginate(octokit.rest.pulls.list, {
				owner: repoSlug.owner,
				repo: repoSlug.repo,
				state: "open",
				per_page: 100,
			}),
		]);

	const otherOpenPullRequests = (
		openPullRequests as GithubPullRequest[]
	).filter((pullRequest) => pullRequest.number !== prNumber);

	const otherPullRequestsPayload: GithubConflictPullRequest[] = [];

	for (const otherPullRequest of otherOpenPullRequests) {
		const [otherDiff, otherFiles] = await Promise.all([
			fetchPullRequestDiff(token, repoName, otherPullRequest.number),
			octokit.paginate(octokit.rest.pulls.listFiles, {
				owner: repoSlug.owner,
				repo: repoSlug.repo,
				pull_number: otherPullRequest.number,
				per_page: 100,
			}),
		]);

		const overlappingFiles = findOverlappingFiles(
			currentFiles as GithubPullRequestFile[],
			otherFiles as GithubPullRequestFile[],
		);

		otherPullRequestsPayload.push({
			prNumber: otherPullRequest.number,
			title: otherPullRequest.title,
			state: otherPullRequest.state,
			creator: otherPullRequest.user?.login ?? "unknown",
			diff: otherDiff,
			changedFiles: (otherFiles as GithubPullRequestFile[]).map((file) => ({
				filename: file.filename,
				status: file.status,
				additions: file.additions,
				deletions: file.deletions,
				changes: file.changes,
				patch: file.patch,
			})),
			overlappingFiles,
		});
	}

	const currentPullRequest = {
		number: currentPr.number,
		title: currentPr.title,
		state: currentPr.state,
		diff: currentDiff,
		changedFiles: (currentFiles as GithubPullRequestFile[]).map((file) => ({
			filename: file.filename,
			status: file.status,
			additions: file.additions,
			deletions: file.deletions,
			changes: file.changes,
			patch: file.patch,
		})),
	};

	return {
		repository: repoName,
		currentPullRequest,
		otherOpenPullRequests: otherPullRequestsPayload,
		conflictingPullRequests: otherPullRequestsPayload.filter(
			(pullRequest) => pullRequest.overlappingFiles.length > 0,
		),
	};
}
