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
		return "bg-emerald-50 text-emerald-700";
	}

	return "bg-purple-50 text-purple-700";
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
				? "bg-slate-50/80 transition-colors"
				: "transition-colors hover:bg-slate-50/70"
		}
	>
		<td className="px-6 py-4 align-top">
			<div className="text-sm font-medium text-slate-900">
				#{prNumber} {title}
			</div>
		</td>
		<td className="px-6 py-4 align-top">
			<span
				className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(status)}`}
			>
				{status}
			</span>
		</td>
		<td className="px-6 py-4 text-right align-top">
			<div className="flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onSelectAnalyze}
					className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50"
				>
					Analyze
				</button>
				<button
					type="button"
					onClick={onSelectRadar}
					className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50"
				>
					Conflict Radar
				</button>
			</div>
		</td>
	</tr>
);
