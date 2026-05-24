export type DashboardSection =
	| "pull-requests"
	| "repository-habits"
	| "learning-profile";

type NavbarProps = {
	activeSection: DashboardSection;
	onSelectSection: (section: DashboardSection) => void;
};

const navigationItems: Array<{ id: DashboardSection; label: string }> = [
	{ id: "pull-requests", label: "Pull Requests" },
	{ id: "repository-habits", label: "Repository Habits" },
	{ id: "learning-profile", label: "Learning Profile" },
];

export const Navbar = ({ activeSection, onSelectSection }: NavbarProps) => (
	<div className="flex w-64 flex-col justify-between bg-slate-900 p-4 text-slate-300">
		<div>
			<div className="mb-8 text-lg font-bold tracking-tight text-white">
				DevCoach AI
			</div>

			<nav className="space-y-1">
				{navigationItems.map((item) => {
					const isActive = activeSection === item.id;

					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onSelectSection(item.id)}
							className={
								isActive
									? "w-full rounded-md bg-slate-800 p-2 text-left text-sm font-medium text-white"
									: "w-full rounded-md p-2 text-left text-sm font-medium transition-all hover:bg-slate-800 hover:text-white"
							}
						>
							{item.label}
						</button>
					);
				})}
			</nav>
		</div>

		<div className="font-mono text-xs text-slate-500">v1.0.0 @ 2026</div>
	</div>
);
