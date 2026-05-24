import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
	throw new Error("GEMINI_API_KEY environment variable is not set");
}

// Inicializáljuk a kliens példányt a biztosan létező kulccsal
export const geminiClient = new GoogleGenAI({ apiKey });

export const GEMINI_MODEL = "gemini-3.1-flash-lite";
