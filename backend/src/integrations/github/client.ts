import { Octokit } from "@octokit/rest";

export function createGithubClient(token: string) {
	return new Octokit({ auth: token });
}
