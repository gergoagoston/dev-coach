import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
	PORT: z.coerce.number().int().positive().default(3000),
});

export const env = envSchema.parse(process.env);
