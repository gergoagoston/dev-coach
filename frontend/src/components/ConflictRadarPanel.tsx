import { useEffect, useState } from "react";

type ConflictRadarPanelProps = {
	prId: number;
	prNumber: number;
	title?: string;
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
	cached?: boolean;
	error?: string;
};

export const ConflictRadarPanel = ({
	prId,
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
				const response = await fetch(
					"http://localhost:3000/api/github/check-conflicts",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							token: githubToken,
							repoName,
							prNumber,
						}),
					},
				);

				const data = (await response.json()) as ConflictResponse;

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

		runRadar();

		return () => {
			isActive = false;
		};
	}, [canLoad, githubToken, prNumber, repoName]);

	return (
		<div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div>
				<div className="mb-4 flex items-center gap-2">
					<span className="text-lg">🛰️</span>
					<div>
						<h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
							Cross-PR Conflict Radar
						</h4>
						<p className="text-xs text-slate-400">
							{title ? `Analyzing ${title}` : `PR #${prNumber} in ${repoName}`}
						</p>
					</div>
				</div>

				{!canLoad ? (
					<div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
						Select a synced PR to load the conflict radar.
					</div>
				) : loading ? (
					<div className="animate-pulse rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
						Scanning repository trails for logical overlaps...
					</div>
				) : errorMessage ? (
					<div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
						{errorMessage}
					</div>
				) : conflicts.length === 0 ? (
					<div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
						No conflict hotspots were returned for this PR.
					</div>
				) : (
					<div className="space-y-4">
						{conflicts.map((conflict) => (
							<div
								key={`${conflict.conflictingPrNumber}-${conflict.filename}`}
								className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4"
							>
								<div className="mb-2 flex items-start justify-between gap-3">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
											Potential overlap with PR #{conflict.conflictingPrNumber}
										</p>
										<h5 className="mt-1 text-sm font-semibold text-indigo-950">
											@{conflict.conflictingUser}
										</h5>
									</div>
									<span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-800">
										Radar
									</span>
								</div>

								<p className="text-sm leading-6 text-slate-600">
									{conflict.reasoning}
								</p>

								<div className="mt-3 rounded-lg border border-white bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
									<div className="font-semibold text-slate-900">
										File: {conflict.filename}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
				<span>
					{canLoad
						? "Live branch intersection active"
						: "Waiting for a synced PR"}
				</span>
				<span>PR ID {prId}</span>
			</div>
		</div>
	);
};
