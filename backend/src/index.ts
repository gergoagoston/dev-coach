import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { GithubRouter } from "./routes/global.router.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const databaseUrl = process.env.DATABASE_URL;
const geminiApiKey = process.env.GEMINI_API_KEY;
const envPort = Number(process.env.PORT ?? 3000);
const port = Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;

if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const prisma = new PrismaClient({
	adapter: new PrismaPg(databaseUrl),
});

app.use("/api/github", GithubRouter(prisma));

app.get("/api/health", async (_req, res) => {
	res.status(200).json({
		status: "ok",
		port,
		databaseUrlConfigured: Boolean(databaseUrl),
		geminiApiKeyConfigured: Boolean(geminiApiKey),
	});
});

async function startServer() {
	try {
		await prisma.$connect();

		app.listen(port, () => {
			console.log(`Server is running on port ${port}`);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
}

void startServer();
