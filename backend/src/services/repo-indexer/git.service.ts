import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import simpleGit from "simple-git";
import { GitCloneError } from "./types.js";

export type CloneGithubRepositoryInput = {
	owner: string;
	repo: string;
	branch?: string;
	workspaceDir?: string;
};

export type CloneRepositoryResult = {
	localPath: string;
	branch: string;
};

export class RepoGitService {
	async cloneRepository({
		owner,
		repo,
		branch,
		workspaceDir,
	}: CloneGithubRepositoryInput): Promise<CloneRepositoryResult> {
		const repoKey = `${owner}/${repo}`;
		const metadata = await fetchPublicRepositoryMetadata(owner, repo);

		if (!metadata) {
			throw new GitCloneError(
				`"${repoKey}" is not a public repository (or does not exist). Only public GitHub repos are supported.`,
			);
		}

		const targetRoot = workspaceDir ?? join(tmpdir(), "pr-assistant-indexes");
		const localPath = join(targetRoot, createWorkspaceName(owner, repo));
		const cloneUrl = `https://github.com/${repoKey}.git`;
		const git = simpleGit().env("GIT_TERMINAL_PROMPT", "0");
		const resolvedBranch = branch ?? metadata.defaultBranch;

		try {
			await mkdir(targetRoot, { recursive: true });
			if (existsSync(localPath)) {
				await rm(localPath, { recursive: true, force: true });
			}

			const cloneArgs = [
				"--depth",
				"1",
				...(resolvedBranch
					? ["--branch", resolvedBranch, "--single-branch"]
					: []),
			];

			await git.clone(cloneUrl, localPath, cloneArgs);

			return {
				localPath,
				branch: resolvedBranch ?? "default",
			};
		} catch (error) {
			if (error instanceof GitCloneError) {
				throw error;
			}

			const message = extractGitErrorMessage(error);
			if (/not found/i.test(message)) {
				throw new GitCloneError(
					`Repository "${repoKey}" does not exist or is not public. Use the exact owner/repo from a public GitHub URL.`,
					error,
				);
			}

			throw new GitCloneError(`Failed to clone "${repoKey}". ${message}`, error);
		}
	}
}

async function fetchPublicRepositoryMetadata(owner: string, repo: string) {
	const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
		headers: {
			Accept: "application/vnd.github+json",
			"User-Agent": "devcoach-pr-assistant",
		},
	});

	if (!response.ok) {
		return null;
	}

	const data = (await response.json()) as {
		private?: boolean;
		default_branch?: string;
	};

	if (data.private) {
		return null;
	}

	return {
		defaultBranch: data.default_branch,
	};
}

function createWorkspaceName(owner: string, repo: string) {
	const safeOwner = owner.replace(/[^a-zA-Z0-9-_]/g, "-");
	const safeRepo = repo.replace(/[^a-zA-Z0-9-_]/g, "-");
	return `${safeOwner}-${safeRepo}-${Date.now()}`;
}

function extractGitErrorMessage(error: unknown) {
	if (!error || typeof error !== "object") {
		return "Unknown git error";
	}

	const message =
		"message" in error && typeof (error as { message?: unknown }).message === "string"
			? (error as { message: string }).message
			: "";

	return redactSecrets(message);
}

function redactSecrets(value: string) {
	return value
		.replace(/ghp_[A-Za-z0-9_]+/g, "ghp_[REDACTED]")
		.replace(/github_pat_[A-Za-z0-9_]+/g, "github_pat_[REDACTED]");
}
