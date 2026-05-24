import { useEffect, useState } from "react";
import { apiPost } from "../lib/api";

type AiCodeReviewPanelProps = {
	prNumber: number;
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
	review?: { improvements?: GeminiImprovement[] } | GeminiImprovement[];
	error?: string;
};

const severityStyles: Record<GeminiImprovement["severity"], string> = {
	high: "bg-rose-100 text-rose-700",
	medium: "bg-amber-100 text-amber-700",
	low: "bg-emerald-100 text-emerald-700",
};

export const AiCodeReviewPanel = ({
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
				const { response, data } = await apiPost<AnalyzeResponse>(
					"/api/github/analyze",
					{
						token: githubToken,
						repoName,
						prNumber,
						username: githubUsername,
					},
				);

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

		void runAnalysis();

		return () => {
			isActive = false;
		};
	}, [canLoad, githubToken, githubUsername, prNumber, repoName]);

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="mb-4 flex items-center gap-2">
				<h4 className="text-sm font-semibold text-slate-800">AI Code Review</h4>
			</div>

			{!canLoad ? (
				<p className="text-sm text-slate-500">
					Select a synced PR to load the AI review.
				</p>
			) : loading ? (
				<p className="animate-pulse text-sm text-slate-500">
					Analyzing pull request...
				</p>
			) : errorMessage ? (
				<p className="text-sm text-rose-700">{errorMessage}</p>
			) : improvements.length === 0 ? (
				<p className="text-sm text-slate-500">
					No review findings were returned for this PR.
				</p>
			) : (
				<div className="space-y-4">
					{improvements.map((improvement) => (
						<article
							key={`${improvement.concept}-${improvement.title}`}
							className="rounded-lg border border-slate-100 bg-slate-50/80 p-4"
						>
							<div className="mb-2 flex items-center justify-between gap-3">
								<h5 className="text-sm font-semibold text-slate-900">
									{improvement.title}
								</h5>
								<span
									className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyles[improvement.severity]}`}
								>
									{improvement.severity}
								</span>
							</div>
							<p className="text-sm leading-6 text-slate-600">
								{improvement.explanation}
							</p>
							<div className="mt-3 grid gap-2">
								<pre className="overflow-auto rounded border border-rose-200 bg-rose-50 p-2 font-mono text-xs text-rose-900 whitespace-pre-wrap">
									{improvement.badExample}
								</pre>
								<pre className="overflow-auto rounded border border-emerald-200 bg-emerald-50 p-2 font-mono text-xs text-emerald-950 whitespace-pre-wrap">
									{improvement.goodExample}
								</pre>
							</div>
						</article>
					))}
				</div>
			)}
		</div>
	);
};
