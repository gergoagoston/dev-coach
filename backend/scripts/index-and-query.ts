import { join } from "node:path";
import {
	indexRepository,
	vectorSearch,
} from "../src/services/repo-indexer/indexer.service.js";
import { geminiClient, GEMINI_MODEL } from "../src/gemini-client.js";

async function callGemini(prompt: string) {
	const resp = await geminiClient.models.generateContent({
		model: GEMINI_MODEL,
		contents: [
			{
				role: "user",
				parts: [{ text: prompt }],
			},
		],
	});

	return resp?.text ?? "";
}

async function main() {
	const argv = process.argv.slice(2);
	const questionArgIndex = argv.findIndex((a) => a === "--question");
	const repoArgIndex = argv.findIndex((a) => a === "--repoDir");
	const repoDir =
		repoArgIndex >= 0 ? argv[repoArgIndex + 1] : join(__dirname, "..", "..");
	const question =
		questionArgIndex >= 0
			? argv[questionArgIndex + 1]
			: "What are the main backend routes in this repository?";

	console.log("Indexing repository at:", repoDir);
	const res = await indexRepository({
		workspaceDir: repoDir,
		repoUrl: "local",
		maxFiles: 800,
		maxChunkSize: 3000,
	});
	console.log(`Indexed ${res.filesScanned} files -> ${res.chunkCount} chunks`);

	const indexPath = join(repoDir, ".pr-assistant-index.json");
	const hits = await vectorSearch(indexPath, question, 6);

	const context = hits
		.map(
			(h: any, i: number) =>
				`=== HIT ${i + 1} (${h.score.toFixed(3)}) ${h.chunk.filepath}\n${h.chunk.code}\n`,
		)
		.join("\n\n");

	const prompt = `You are a helpful assistant. Use the following repository context to answer the question.\n\nContext:\n${context}\nQuestion:\n${question}`;

	console.log("Querying Gemini with top context...");
	const answer = await callGemini(prompt);
	console.log("--- ANSWER ---\n", answer);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
