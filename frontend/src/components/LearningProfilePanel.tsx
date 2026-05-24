import { useEffect, useState } from "react";

type LearningMemoryRecord = {
	id: number;
	githubUsername: string;
	concept: string;
	count: number;
	title: string;
	description: string;
	badExample: string;
	goodExample: string;
	lastSeen: string;
};

type LearningProfileResponse = {
	mistakes?: LearningMemoryRecord[];
	summary?: {
		totalPatterns: number;
		uniqueConcepts: number;
		topConcept: string | null;
		recentTitle: string | null;
	};
	error?: string;
};

const formatDate = (value: string) => {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Unknown"
		: date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
};

export const LearningProfilePanel = () => {
	const username = localStorage.getItem("githubUsername") ?? "";
	const [mistakes, setMistakes] = useState<LearningMemoryRecord[]>([]);
	const [loading, setLoading] = useState(Boolean(username));
	const [errorMessage, setErrorMessage] = useState("");
	const [summary, setSummary] =
		useState<LearningProfileResponse["summary"]>(undefined);

	useEffect(() => {
		if (!username) {
			return;
		}

		let isActive = true;

		const loadProfile = async () => {
			try {
				const response = await fetch(
					`http://localhost:3000/api/github/learning-profile?username=${encodeURIComponent(username)}`,
				);

				const data = (await response.json()) as LearningProfileResponse;

				if (!response.ok) {
					throw new Error(data.error ?? "Failed to load learning profile");
				}

				if (isActive) {
					setMistakes(data.mistakes ?? []);
					setSummary(data.summary);
				}
			} catch (error) {
				if (isActive) {
					setErrorMessage(
						error instanceof Error
							? error.message
							: "Failed to load learning profile",
					);
				}
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		};

		loadProfile();

		return () => {
			isActive = false;
		};
	}, [username]);

	if (!username) {
		return (
			<div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-8 text-slate-600 shadow-sm">
				<p className="text-lg font-semibold text-slate-900">
					Learning Profile
				</p>
				<p className="mt-2 text-sm">
					Sign in again so I can load your personal learning memory.
				</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="space-y-4">
				<div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
				<div className="grid gap-4 md:grid-cols-2">
					<div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
					<div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
				</div>
			</div>
		);
	}

	if (errorMessage) {
		return (
			<div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
				{errorMessage}
			</div>
		);
	}

	const maxCount = Math.max(...mistakes.map((item) => item.count), 1);
	const topConcepts = mistakes.slice(0, 3);

	return (
		<div className="space-y-6 text-slate-700">
			<div className="overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg">
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
							Personal Learning Profile
						</p>
						<h2 className="mt-2 text-3xl font-bold tracking-tight">
							What you keep repeating, and how to fix it
						</h2>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
							These patterns are ranked by how often they appeared in your own
							reviews. Use them as a checklist before you open the next pull
							request.
						</p>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur">
						<div className="text-slate-400">Developer</div>
						<div className="mt-1 font-semibold text-white">@{username}</div>
					</div>
				</div>

				<div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<StatTile
						label="Total patterns"
						value={summary?.totalPatterns ?? 0}
					/>
					<StatTile
						label="Unique concepts"
						value={summary?.uniqueConcepts ?? 0}
					/>
					<StatTile
						label="Top concept"
						value={summary?.topConcept ?? "None"}
					/>
					<StatTile
						label="Recent title"
						value={summary?.recentTitle ?? "None"}
					/>
				</div>
			</div>

			{mistakes.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
					No saved learning memories yet. Once you run AI reviews, the patterns
					will show up here.
				</div>
			) : (
				<div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
					<div className="space-y-4">
						{mistakes.map((item) => (
							<article
								key={item.id}
								className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
							>
								<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
											{item.concept}
										</p>
										<h3 className="mt-1 text-lg font-semibold text-slate-900">
											{item.title}
										</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											{item.description}
										</p>
									</div>
									<div className="flex flex-col items-start gap-2 md:items-end">
										<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
											{item.count}x seen
										</span>
										<span className="text-xs text-slate-400">
											Last seen {formatDate(item.lastSeen)}
										</span>
									</div>
								</div>

								<div className="mt-5 space-y-4">
									<div>
										<div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
											Anti-pattern
										</div>
										<pre className="overflow-auto rounded-2xl border border-rose-200 bg-rose-50 p-4 font-mono text-sm whitespace-pre-wrap text-rose-900">
											{item.badExample}
										</pre>
									</div>

									<div>
										<div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
											Refactored habit
										</div>
										<pre className="overflow-auto rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-mono text-sm whitespace-pre-wrap text-emerald-950">
											{item.goodExample}
										</pre>
									</div>
								</div>

								<div className="mt-5 h-2 rounded-full bg-slate-100">
									<div
										className="h-2 rounded-full bg-slate-900 transition-all duration-500"
										style={{ width: `${(item.count / maxCount) * 100}%` }}
									/>
								</div>
							</article>
						))}
					</div>

					<aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
								Quick review path
							</p>
							<h4 className="mt-2 text-lg font-semibold text-slate-900">
								Read this before your next PR
							</h4>
						</div>

						<div className="space-y-3">
							{topConcepts.map((item, index) => (
								<div
									key={`${item.id}-${index}`}
									className="rounded-2xl border border-white bg-white p-4 shadow-sm"
								>
									<div className="flex items-center justify-between gap-3">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
												#{index + 1}
											</p>
											<div className="mt-1 font-semibold text-slate-900">
												{item.title}
											</div>
										</div>
										<span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
											{item.count}x
										</span>
									</div>
									<p className="mt-3 text-sm leading-6 text-slate-600">
										{item.description}
									</p>
								</div>
							))}
						</div>
					</aside>
				</div>
			)}
		</div>
	);
};

type StatTileProps = {
	label: string;
	value: string | number;
};

const StatTile = ({ label, value }: StatTileProps) => (
	<div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
		<div className="text-xs uppercase tracking-[0.18em] text-slate-400">
			{label}
		</div>
		<div className="mt-2 text-lg font-semibold text-white">{value}</div>
	</div>
);
