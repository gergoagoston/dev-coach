import { useEffect, useState } from "react";

type AiCodeReviewPanelProps = {
	prId: number;
	prNumber: number;
	title?: string;
	repoName: string;
};

type GeminiImprovement = {
	concept: string;
	title: string;
	severity: "high" | "medium" | "low";
	explanation: string;
	badExample: string;
	goodExample: string;
};

type AnalyzeResponse = {
	review?:
		| {
				improvements?: GeminiImprovement[];
		  }
		| GeminiImprovement[];
	error?: string;
};

const severityStyles: Record<GeminiImprovement["severity"], string> = {
	high: "bg-rose-100 text-rose-700",
	medium: "bg-amber-100 text-amber-700",
	low: "bg-emerald-100 text-emerald-700",
};

export const AiCodeReviewPanel = ({
	prId,
	prNumber,
	repoName,
}: AiCodeReviewPanelProps) => {
	const [improvements, setImprovements] = useState<GeminiImprovement[]>([]);
	const githubToken = localStorage.getItem("githubToken") ?? "";
	const githubUsername = localStorage.getItem("githubUsername") ?? "";
	const canLoad = Boolean(
		repoName && prNumber && githubToken && githubUsername,
	);
	const [loading, setLoading] = useState(canLoad);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		if (!canLoad) {
			return;
		}

		let isActive = true;

		const runAnalysis = async () => {
			try {
				const response = await fetch(
					"http://localhost:3000/api/github/analyze",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							token: githubToken,
							repoName,
							prNumber,
							username: githubUsername,
						}),
					},
				);

				const data = (await response.json()) as AnalyzeResponse;

				if (!response.ok) {
					throw new Error(data.error ?? "Failed to analyze pull request");
				}

				if (isActive) {
					const review = data.review;
					setImprovements(
						Array.isArray(review) ? review : (review?.improvements ?? []),
					);
				}
			} catch (error) {
				if (isActive) {
					setErrorMessage(
						error instanceof Error
							? error.message
							: "Failed to analyze pull request",
					);
				}
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		};

		runAnalysis();

		return () => {
			isActive = false;
		};
	}, [canLoad, githubToken, githubUsername, prId, prNumber, repoName]);

	return (
		<div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div>
				<div className="mb-4 flex items-center space-x-2">
					<span className="text-lg">🤖</span>
					<h4 className="text-lg font-bold  tracking-wider text-slate-800">
						AI Code Review Audit
					</h4>
				</div>

				{!canLoad ? (
					<div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
						Select a synced PR to load the AI review.
					</div>
				) : loading ? (
					<div className="animate-pulse rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
						Analyzing PR with backend code analyzer...
					</div>
				) : errorMessage ? (
					<div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
						{errorMessage}
					</div>
				) : improvements.length === 0 ? (
					<div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
						No AI review findings were returned for this PR.
					</div>
				) : (
					<div className="space-y-4">
						{improvements.map((improvement) => (
							<div
								key={`${improvement.concept}-${improvement.title}`}
								className="rounded-lg border border-slate-100 bg-slate-50/80 p-4"
							>
								<div className="mb-2 flex items-center justify-between gap-3">
									<div>
										<h5 className="mt-1 text-sm font-semibold text-slate-900">
											{improvement.title}
										</h5>
									</div>
									<span
										className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyles[improvement.severity]}`}
									>
										{improvement.severity}
									</span>
								</div>
								<p className="text-sm leading-6 text-slate-600">
									{improvement.explanation}
								</p>
								<div className="mt-3 grid gap-2 font-mono text-lg">
									<div className="rounded border border-rose-200 text-2xl bg-rose-50 p-2 text-rose-900">
										<span className="mb-1 block text-lg font-bold uppercase text-rose-500">
											[-] Anti-pattern
										</span>
										{improvement.badExample}
									</div>
									<div className="rounded border text-lg border-emerald-200 bg-emerald-50 p-2 text-emerald-950">
										<span className="mb-1 block text-lg font-bold uppercase text-emerald-600">
											[+] Refactored best practice
										</span>
										{improvement.goodExample}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};
