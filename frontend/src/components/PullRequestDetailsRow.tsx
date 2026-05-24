import { AiCodeReviewPanel } from "./AiCodeReviewPanel";
import { ConflictRadarPanel } from "./ConflictRadarPanel";

type PullRequestAction = "analyze" | "radar";

type PullRequestDetailsRowProps = {
	repoName: string;
	prId: number;
	prNumber: number;
	title: string;
	action: PullRequestAction;
};

export const PullRequestDetailsRow = ({
	repoName,
	prId,
	prNumber,
	title,
	action,
}: PullRequestDetailsRowProps) => (
	<tr>
		<td colSpan={3} className="bg-slate-50 px-6 pb-6 pt-0">
			<style>{`
				@keyframes pr-drop-in {
					from {
						opacity: 0;
						transform: translateY(-8px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
			<div className="pt-4 animate-[pr-drop-in_180ms_ease-out]">
				{action === "analyze" ? (
					<AiCodeReviewPanel
						prId={prId}
						prNumber={prNumber}
						title={title}
						repoName={repoName}
					/>
				) : (
					<ConflictRadarPanel
						prId={prId}
						prNumber={prNumber}
						title={title}
						repoName={repoName}
					/>
				)}
			</div>
		</td>
	</tr>
);
