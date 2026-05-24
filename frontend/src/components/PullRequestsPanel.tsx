import { useState } from "react";
import { PullRequestDetailsRow } from "./PullRequestDetailsRow";
import { PullRequestRow } from "./PullRequestRow";
import { Fragment } from "react";

type PullRequestRecord = {
	id?: number;
	prNumber: number;
	title: string;
	status: string;
};

type PullRequestAction = "analyze" | "radar";

type PrsResponse = {
	pullRequests?: PullRequestRecord[];
	prs?: PullRequestRecord[];
	error?: string;
};

export const PullRequestsPanel = () => {
	const [repoName, setRepoName] = useState("");
	const [prs, setPrs] = useState<PullRequestRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [selectedPullRequest, setSelectedPullRequest] =
		useState<PullRequestRecord | null>(null);
	const [activeAction, setActiveAction] = useState<PullRequestAction | null>(
		null,
	);

	const fetchPRs = async () => {
		const githubToken = localStorage.getItem("githubToken") ?? "";
		const githubUsername = localStorage.getItem("githubUsername") ?? "";

		if (!githubToken) {
			setErrorMessage("Missing GitHub token. Please sign in again.");
			return;
		}

		if (!repoName.trim()) {
			setErrorMessage("Enter a repository name before syncing.");
			return;
		}

		setLoading(true);
		setErrorMessage("");

		try {
			const response = await fetch("http://localhost:3000/api/github/prs", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					token: githubToken,
					repoName: repoName.trim(),
					username: githubUsername,
				}),
			});

			const data = (await response.json()) as PrsResponse;

			if (!response.ok) {
				throw new Error(data.error ?? "Failed to sync repository");
			}

			const nextPrs = data.pullRequests ?? data.prs ?? [];
			setPrs(nextPrs);

			if (nextPrs.length > 0) {
				setSelectedPullRequest(nextPrs[0]);
				setActiveAction(null);
			} else {
				setSelectedPullRequest(null);
				setActiveAction(null);
			}
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to sync repository",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
				<input
					type="text"
					value={repoName}
					onChange={(event) => setRepoName(event.target.value)}
					placeholder="owner/repository (e.g., facebook/react)"
					className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-black"
				/>

				<button
					type="button"
					onClick={fetchPRs}
					className="rounded-lg bg-black px-5 py-2 text-xl font-medium text-white transition-all hover:bg-slate-800"
				>
					Sync
				</button>
			</div>

			{loading ? (
				<div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm animate-pulse">
					Fetching repository trails from GitHub...
				</div>
			) : errorMessage ? (
				<div className="rounded-xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
					{errorMessage}
				</div>
			) : prs.length === 0 ? (
				<div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
					<p className="text-sm text-slate-500">
						No repositories synced yet. Enter a repository name above to stream
						active Pull Requests.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
					<table className="min-w-full divide-y divide-slate-100">
						<thead className="bg-slate-50">
							<tr>
								<th className="px-6 py-4 text-left text-xl font-semibold uppercase tracking-[0.2em] text-slate-500">
									Pull Request
								</th>
								<th className="px-6 py-4 text-left text-xl font-semibold uppercase tracking-[0.2em] text-slate-500">
									Status
								</th>
								<th className="px-6 py-4 text-right text-xl font-semibold uppercase tracking-[0.2em] text-slate-500">
									Actions
								</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-slate-50 bg-white">
							{prs.map((pullRequest) => (
								<Fragment key={pullRequest.id ?? pullRequest.prNumber}>
									<PullRequestRow
										prNumber={pullRequest.prNumber}
										title={pullRequest.title}
										status={pullRequest.status}
										isSelected={
											selectedPullRequest?.prNumber === pullRequest.prNumber
										}
										onSelectAnalyze={() => {
											setSelectedPullRequest(pullRequest);
											setActiveAction((currentAction) =>
												selectedPullRequest?.prNumber ===
													pullRequest.prNumber && currentAction === "analyze"
													? null
													: "analyze",
											);
										}}
										onSelectRadar={() => {
											setSelectedPullRequest(pullRequest);
											setActiveAction((currentAction) =>
												selectedPullRequest?.prNumber ===
													pullRequest.prNumber && currentAction === "radar"
													? null
													: "radar",
											);
										}}
									/>
									{selectedPullRequest?.prNumber === pullRequest.prNumber &&
									activeAction ? (
										<PullRequestDetailsRow
											key={`${repoName.trim()}-${pullRequest.prNumber}`}
											repoName={repoName.trim()}
											prId={pullRequest.id ?? pullRequest.prNumber}
											prNumber={pullRequest.prNumber}
											title={pullRequest.title}
											action={activeAction}
										/>
									) : null}
								</Fragment>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};
