import type { ErrorRequestHandler, RequestHandler } from "express";

export class HttpError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
		public readonly code = "INTERNAL_ERROR",
	) {
		super(message);
		this.name = "HttpError";
	}
}

export const notFoundHandler: RequestHandler = (_req, res) => {
	res.status(404).json({ error: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	console.error("Unhandled request error:", error);

	if (error instanceof HttpError) {
		res.status(error.statusCode).json({
			error: error.message,
			code: error.code,
		});
		return;
	}

	res.status(500).json({
		error: "Unexpected server error",
		code: "INTERNAL_ERROR",
	});
};
