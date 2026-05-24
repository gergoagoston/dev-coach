import type { Response } from "express";

export function badRequest(res: Response, message: string) {
	res.status(400).json({ error: message });
}

export function parsePrNumber(value: unknown): number | null {
	const prNumber = Number(value);
	return Number.isFinite(prNumber) && prNumber > 0 ? prNumber : null;
}
