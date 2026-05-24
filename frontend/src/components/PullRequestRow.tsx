type PullRequestRowProps = {
	prNumber: number;
	title: string;
	status: string;
	isSelected: boolean;
	onSelectAnalyze: () => void;
	onSelectRadar: () => void;
};

const getStatusBadgeClassName = (status: string) => {
	const normalizedStatus = status.toLowerCase();

	if (normalizedStatus === "open") {
		return "bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xl font-semibold";
	}

	return "bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xl font-semibold";
};

export const PullRequestRow = ({
	prNumber,
	title,
	status,
	isSelected,
	onSelectAnalyze,
	onSelectRadar,
}: PullRequestRowProps) => (
	<tr
		className={
			isSelected
				? "group bg-slate-50/80 transition-colors"
				: "group transition-colors hover:bg-slate-50/70"
		}
	>
		<td className="px-6 py-5 align-top">
			<div className=" font-medium text-slate-900 text-xl">
				#{prNumber} {title}
			</div>
		</td>
		<td className="px-6 py-5 align-top">
			<span className={getStatusBadgeClassName(status)}>{status}</span>
		</td>
		<td className="px-6 py-5 text-right align-top">
			<div className="flex items-center justify-end gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 pointer-events-none group-hover:pointer-events-auto">
				<button
					type="button"
					onClick={onSelectAnalyze}
					className="rounded-lg border border-slate-200 px-3 py-1.5 text-xl font-medium text-slate-700 transition-all hover:bg-slate-50"
				>
					Analyze
				</button>
				<button
					type="button"
					onClick={onSelectRadar}
					className="rounded-lg border border-slate-200 px-3 py-1.5 text-xl font-medium text-slate-700 transition-all hover:bg-slate-50"
				>
					Conflict Radar
				</button>
			</div>
		</td>
	</tr>
);
