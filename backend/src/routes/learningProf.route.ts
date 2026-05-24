import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type {
	LearningProfileResponse,
	LearningMemoryRecord,
} from "../schemas/learning-profile.types.js";

export function createLearningProfileRouter(prisma: PrismaClient) {
	const router = Router();

	router.get("/learning-profile", async (req, res) => {
		const { username } = req.query;

		if (!username || typeof username !== "string") {
			res.status(400).json({ error: "Missing username query parameter" });
			return;
		}

		try {
			const mistakes = await prisma.learningMemory.findMany({
				where: { githubUsername: username },
				orderBy: [{ count: "desc" }, { lastSeen: "desc" }],
			});

			const orderedMistakes = mistakes as LearningMemoryRecord[];
			const summary: LearningProfileResponse["summary"] = {
				totalPatterns: orderedMistakes.reduce(
					(total, item) => total + item.count,
					0,
				),
				uniqueConcepts: orderedMistakes.length,
				topConcept: orderedMistakes[0]?.concept ?? null,
				recentTitle: orderedMistakes[0]?.title ?? null,
			};

			res.status(200).json({ mistakes: orderedMistakes, summary });
		} catch (error) {
			console.error("Failed to fetch learning profile:", error);
			res
				.status(500)
				.json({ error: "Failed to load engineering black-box records." });
		}
	});

	return router;
}
