import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type {
	LearningMemoryRecord,
	LearningProfileResponse,
} from "../types/learning-profile.types.js";
import { badRequest } from "../utils/http.utils.js";
import { usernameQuerySchema } from "../schemas/api.schemas.js";

export function createLearningProfileRouter(prisma: PrismaClient) {
	const router = Router();

	router.get("/learning-profile", async (req, res) => {
		const { username } = req.query;

		const parsedQuery = usernameQuerySchema.safeParse({ username });
		if (!parsedQuery.success) {
			badRequest(res, "Missing username query parameter");
			return;
		}
		const validUsername = parsedQuery.data.username;

		try {
			const mistakes = await prisma.learningMemory.findMany({
				where: { githubUsername: validUsername },
				orderBy: [{ count: "desc" }, { lastSeen: "desc" }],
			});

			const orderedMistakes: LearningMemoryRecord[] = mistakes.map(
				(mistake) => ({
					...mistake,
					lastSeen: mistake.lastSeen.toISOString(),
				}),
			);
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
			res.status(500).json({ error: "Failed to load learning profile" });
		}
	});

	return router;
}
