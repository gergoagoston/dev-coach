import { useState } from "react";
import { Navbar } from "./Navbar";
import { LearningProfilePanel } from "./LearningProfilePanel";
import { PullRequestsPanel } from "./PullRequestsPanel";
import { RepositoryHabitsPanel } from "./RepositoryHabitsPanel";
type DashboardSection =
	| "pull-requests"
	| "repository-habits"
	| "learning-profile";

const sectionTitles: Record<DashboardSection, string> = {
	"pull-requests": "Pull Requests",
	"repository-habits": "Repository Habits",
	"learning-profile": "Learning Profile",
};

export const Dashboard = () => {
	const [activeSection, setActiveSection] =
		useState<DashboardSection>("pull-requests");
	const [username] = useState(
		() => localStorage.getItem("githubUsername") ?? "developer_user",
	);
	const [avatarUrl] = useState(
		() => localStorage.getItem("githubAvatarUrl") ?? "",
	);

	const sectionPanels: Record<DashboardSection, React.JSX.Element> = {
		"pull-requests": <PullRequestsPanel />,
		"repository-habits": <RepositoryHabitsPanel />,
		"learning-profile": <LearningProfilePanel />,
	};
	const currentPanel = sectionPanels[activeSection];

	return (
		<div className="min-h-screen bg-slate-50 flex font-sans">
			<Navbar
				activeSection={activeSection}
				onSelectSection={setActiveSection}
			/>

			<div className="flex-1 p-8">
				<header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
					<div>
						<h1 className="text-3xl font-bold text-slate-900">
							{sectionTitles[activeSection]}
						</h1>
					</div>

					<div className="flex items-center gap-3">
						{avatarUrl ? (
							<img
								src={avatarUrl}
								alt={username}
								className="h-10 w-10 rounded-full border border-slate-200 object-cover"
							/>
						) : (
							<div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-300 text-sm font-bold text-slate-700">
								{username.slice(0, 1).toUpperCase()}
							</div>
						)}
						<p className="text-sm font-medium text-slate-700 cursor-default select-none">
							{username}
						</p>
					</div>
				</header>

				<div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
					{currentPanel}
				</div>
			</div>
		</div>
	);
};
