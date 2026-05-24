import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import simpleGit from "simple-git";
import { GitCloneError } from "./types.js";

export type CloneRepositoryInput = {
	repoUrl: string;
	branch?: string;
	workspaceDir?: string;
};

export type CloneRepositoryResult = {
	localPath: string;
	branch: string;
};

export class RepoGitService {
	async cloneRepository({
		repoUrl,
		branch,
		workspaceDir,
	}: CloneRepositoryInput): Promise<CloneRepositoryResult> {
		const targetRoot = workspaceDir ?? join(tmpdir(), "pr-assistant-indexes");
		const localPath = join(targetRoot, this.createWorkspaceName(repoUrl));
		const git = simpleGit();

		try {
			await mkdir(targetRoot, { recursive: true });
			if (existsSync(localPath)) {
				await rm(localPath, { recursive: true, force: true });
			}

			const cloneArgs = branch
				? ["--branch", branch, "--single-branch"]
				: ["--depth", "1"];
			await git.clone(repoUrl, localPath, cloneArgs);

			return {
				localPath,
				branch: branch ?? "default",
			};
		} catch (error) {
			throw new GitCloneError(`Failed to clone repository: ${repoUrl}`, error);
		}
	}

	private createWorkspaceName(repoUrl: string) {
		const normalized = repoUrl
			.replace(/^https?:\/\/github\.com\//, "")
			.replace(/\.git$/, "")
			.replace(/[^a-zA-Z0-9-_./]/g, "-")
			.replace(/[/.]/g, "-");

		return `${normalized}-${Date.now()}`;
	}
}
