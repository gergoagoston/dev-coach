import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";

export const geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export const GEMINI_MODEL = "gemini-3.1-flash-lite";
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

export async function embedText(
	text: string,
	taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
) {
	const response = await geminiClient.models.embedContent({
		model: GEMINI_EMBEDDING_MODEL,
		contents: text,
		config: { taskType, outputDimensionality: 768 },
	});

	const values = response.embeddings?.[0]?.values;
	if (!values?.length) {
		throw new Error("Gemini returned an empty embedding");
	}

	return values;
}
