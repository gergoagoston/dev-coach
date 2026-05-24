import { join } from "node:path";
import {
	indexRepository,
	vectorSearch,
} from "../src/services/repo-indexer/indexer.service.js";

async function main() {
	const argv = process.argv.slice(2);
	const repoArgIndex = argv.findIndex((a) => a === "--repoDir");
	const questionArgIndex = argv.findIndex((a) => a === "--question");
	const repoDir =
		repoArgIndex >= 0 ? argv[repoArgIndex + 1] : join(__dirname, "..", "..");
	const question =
		questionArgIndex >= 0
			? argv[questionArgIndex + 1]
			: "Give me an overview of backend routes.";

	console.log("Indexing repository at:", repoDir);
	const res = await indexRepository({
		workspaceDir: repoDir,
		repoUrl: "local",
		maxFiles: 800,
		maxChunkSize: 3000,
	});
	console.log(`Indexed ${res.filesScanned} files -> ${res.chunkCount} chunks`);

	const indexPath = join(repoDir, ".pr-assistant-index.json");
	const hits = await vectorSearch(indexPath, question, 8);

	for (let i = 0; i < hits.length; i++) {
		const h = hits[i];
		console.log(
			`\n--- HIT ${i + 1} (score=${h.score.toFixed(3)}) [${h.chunk.filepath}] ---\n`,
		);
		console.log(h.chunk.code.slice(0, 1200));
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
