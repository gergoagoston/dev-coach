import { useEffect, useState } from "react";
import { apiPost } from "../lib/api";

type ConflictRadarPanelProps = {
	prNumber: number;
	title: string;
	repoName: string;
};

type ConflictFinding = {
	filename: string;
	conflictingPrNumber: number;
	conflictingUser: string;
	reasoning: string;
};

type ConflictResponse = {
	conflicts?: ConflictFinding[];
	error?: string;
};

export const ConflictRadarPanel = ({
	prNumber,
	title,
	repoName,
}: ConflictRadarPanelProps) => {
	const [conflicts, setConflicts] = useState<ConflictFinding[]>([]);
	const [loading, setLoading] = useState(Boolean(repoName && prNumber));
	const [errorMessage, setErrorMessage] = useState("");
	const githubToken = localStorage.getItem("githubToken") ?? "";
	const canLoad = Boolean(repoName && prNumber && githubToken);

	useEffect(() => {
		if (!canLoad) {
			return;
		}

		let isActive = true;

		const runRadar = async () => {
			try {
				const { response, data } = await apiPost<ConflictResponse>(
					"/api/github/check-conflicts",
					{
						token: githubToken,
						repoName,
						prNumber,
					},
				);

				if (!response.ok) {
					throw new Error(data.error ?? "Failed to load conflict radar");
				}

				if (isActive) {
					setErrorMessage("");
					setConflicts(data.conflicts ?? []);
				}
			} catch (error) {
				if (isActive) {
					setErrorMessage(
						error instanceof Error
							? error.message
							: "Failed to load conflict radar",
					);
				}
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		};

		void runRadar();

		return () => {
			isActive = false;
		};
	}, [canLoad, githubToken, prNumber, repoName]);

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="mb-4">
				<h4 className="text-sm font-semibold text-slate-800">
					Cross-PR Conflict Radar
				</h4>
				<p className="text-xs text-slate-400">
					{title ? `Analyzing ${title}` : `PR #${prNumber} in ${repoName}`}
				</p>
			</div>

			{!canLoad ? (
				<p className="text-sm text-slate-500">
					Select a synced PR to load the conflict radar.
				</p>
			) : loading ? (
				<p className="animate-pulse text-sm text-slate-500">
					Scanning open pull requests for overlaps...
				</p>
			) : errorMessage ? (
				<p className="text-sm text-rose-700">{errorMessage}</p>
			) : conflicts.length === 0 ? (
				<p className="text-sm text-slate-500">
					No conflict hotspots were found for this PR.
				</p>
			) : (
				<div className="space-y-4">
					{conflicts.map((conflict) => (
						<article
							key={`${conflict.conflictingPrNumber}-${conflict.filename}`}
							className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4"
						>
							<p className="text-xs font-semibold uppercase text-indigo-700">
								Overlap with PR #{conflict.conflictingPrNumber} · @
								{conflict.conflictingUser}
							</p>
							<p className="mt-2 text-sm leading-6 text-slate-600">
								{conflict.reasoning}
							</p>
							<p className="mt-3 text-xs text-slate-700">
								File: <span className="font-medium">{conflict.filename}</span>
							</p>
						</article>
					))}
				</div>
			)}
		</div>
	);
};
