import { useState } from "react";

type RepositoryHabitInsight = {
	concept: string;
	title: string;
	description: string;
	evidenceFiles: string[];
	priority: "high" | "medium" | "low";
};

type RepositoryHabitsResponse = {
	repoName: string;
	habits?: RepositoryHabitInsight[];
	recommendations?: string[];
	filesScanned?: number;
	cached?: boolean;
	error?: string;
};

const priorityStyles: Record<RepositoryHabitInsight["priority"], string> = {
	high: "bg-rose-100 text-rose-700",
	medium: "bg-amber-100 text-amber-700",
	low: "bg-emerald-100 text-emerald-700",
};

export const RepositoryHabitsPanel = () => {
	const [repoName, setRepoName] = useState("");
	const [taskDescription, setTaskDescription] = useState("");
	const [habits, setHabits] = useState<RepositoryHabitInsight[]>([]);
	const [recommendations, setRecommendations] = useState<string[]>([]);
	const [filesScanned, setFilesScanned] = useState(0);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const analyzeRepository = async () => {
		const githubToken = localStorage.getItem("githubToken") ?? "";

		if (!githubToken) {
			setErrorMessage("Missing GitHub token. Please sign in again.");
			return;
		}

		if (!repoName.trim()) {
			setErrorMessage("Enter a repository name before loading habits.");
			return;
		}

		setLoading(true);
		setErrorMessage("");

		try {
			const response = await fetch(
				"http://localhost:3000/api/github/repository-habits",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						token: githubToken,
						repoName: repoName.trim(),
						taskDescription: taskDescription.trim(),
					}),
				},
			);

			const data = (await response.json()) as RepositoryHabitsResponse;

			if (!response.ok) {
				throw new Error(data.error ?? "Failed to load repository habits");
			}

			setHabits(data.habits ?? []);
			setRecommendations(data.recommendations ?? []);
			setFilesScanned(data.filesScanned ?? 0);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Failed to load repository habits",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6 text-slate-700">
			<div className="overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg">
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
							Repository Habits Radar
						</p>
						<h2 className="mt-2 text-3xl font-bold tracking-tight">
							How this repo expects work to be done
						</h2>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
							Add a repo and a task, and the backend will snapshot the GitHub
							repo, pull the context it needs, and return the rules and habits
							that show up again and again in this codebase.
						</p>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur">
						<div className="text-slate-400">Mode</div>
						<div className="mt-1 font-semibold text-white">
							RAG repo analysis
						</div>
					</div>
				</div>

				<div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<StatTile label="Files scanned" value={filesScanned} />
					<StatTile label="Habits loaded" value={habits.length} />
					<StatTile
						label="Task guidance"
						value={
							recommendations.length
								? `${recommendations.length} bullets`
								: "Ready"
						}
					/>
				</div>
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
				<div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_auto] lg:items-start">
					<div className="space-y-2">
						<label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
							Repository
						</label>
						<input
							type="text"
							value={repoName}
							onChange={(event) => setRepoName(event.target.value)}
							placeholder="owner/repo or https://github.com/owner/repo"
							className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-black"
						/>
					</div>

					<div className="space-y-2">
						<label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
							Task
						</label>
						<textarea
							value={taskDescription}
							onChange={(event) => setTaskDescription(event.target.value)}
							placeholder="Describe the task so the AI can explain the repo-specific rules to follow..."
							className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-black"
						/>
					</div>

					<div className="flex lg:justify-end">
						<button
							type="button"
							onClick={analyzeRepository}
							disabled={loading}
							className="mt-6 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loading ? "Reading repo..." : "Load repo habits"}
						</button>
					</div>
				</div>

				{errorMessage ? (
					<div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
						{errorMessage}
					</div>
				) : null}
			</div>

			{loading ? (
				<div className="grid gap-4 md:grid-cols-2">
					<div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-slate-50" />
					<div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-slate-50" />
				</div>
			) : habits.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
					Load a repository and describe a task to extract the repo's habits,
					rules, and working style.
				</div>
			) : (
				<div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
					<div className="space-y-4">
						{habits.map((habit) => (
							<article
								key={habit.concept}
								className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
							>
								<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
											{habit.concept}
										</p>
										<h3 className="mt-1 text-lg font-semibold text-slate-900">
											{habit.title}
										</h3>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											{habit.description}
										</p>
									</div>
									<span
										className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[habit.priority]}`}
									>
										{habit.priority}
									</span>
								</div>

								{habit.evidenceFiles.length > 0 ? (
									<div className="mt-4 flex flex-wrap gap-2">
										{habit.evidenceFiles.map((file) => (
											<span
												key={file}
												className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
											>
												{file}
											</span>
										))}
									</div>
								) : null}
							</article>
						))}
					</div>

					<div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-lg">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
								Task guidance
							</p>
							<h4 className="mt-2 text-lg font-semibold">
								How to approach this task in this repo
							</h4>
						</div>

						<div className="mt-4 space-y-3">
							{recommendations.length > 0 ? (
								recommendations.map((item, index) => (
									<div
										key={`${index}-${item}`}
										className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200"
									>
										<span className="mr-2 font-semibold text-white">
											{index + 1}.
										</span>
										{item}
									</div>
								))
							) : (
								<div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
									Enter a task to get repo-specific guidance that follows the
									project's habits.
								</div>
							)}
						</div>
					</div>
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
