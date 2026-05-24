import { AiCodeReviewPanel } from "./AiCodeReviewPanel";
import { ConflictRadarPanel } from "./ConflictRadarPanel";

type PullRequestAction = "analyze" | "radar";

type PullRequestDetailsRowProps = {
	repoName: string;
	prNumber: number;
	title: string;
	action: PullRequestAction;
};

export const PullRequestDetailsRow = ({
	repoName,
	prNumber,
	title,
	action,
}: PullRequestDetailsRowProps) => (
	<tr>
		<td colSpan={3} className="bg-slate-50 px-6 pb-6 pt-2">
			<div className="pt-2">
				{action === "analyze" ? (
					<AiCodeReviewPanel prNumber={prNumber} repoName={repoName} />
				) : (
					<ConflictRadarPanel
						prNumber={prNumber}
						title={title}
						repoName={repoName}
					/>
				)}
			</div>
		</td>
	</tr>
);
