import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { GithubRouter } from "./routes/global.router.js";
import { createRepositoryHabitsRouter } from "./routes/repository-habits.route.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient({
	adapter: new PrismaPg(env.DATABASE_URL),
});

app.use("/api/github", GithubRouter(prisma));
app.use("/api/repository-habits", createRepositoryHabitsRouter(prisma));

app.get("/api/health", async (_req, res) => {
	res.status(200).json({
		status: "ok",
		port: env.PORT,
		databaseUrlConfigured: true,
		geminiApiKeyConfigured: true,
	});
});

app.use(notFoundHandler);
app.use(errorHandler);

function assertPrismaClientIsCurrent() {
	if (!prisma.repositoryIndex) {
		throw new Error(
			"Prisma client is missing RepositoryIndex. Run: cd backend && npm run db:generate",
		);
	}
}

async function startServer() {
	try {
		assertPrismaClientIsCurrent();
		await prisma.$connect();

		app.listen(env.PORT, () => {
			console.log(`Server is running on port ${env.PORT}`);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
}

void startServer();
