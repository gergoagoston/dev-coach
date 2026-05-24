const API_BASE =
	import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
	"http://localhost:3000";

export function apiUrl(path: string) {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE}${normalizedPath}`;
}

export async function apiPost<TResponse>(
	path: string,
	body: unknown,
): Promise<{ response: Response; data: TResponse }> {
	const response = await fetch(apiUrl(path), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	const data = (await response.json()) as TResponse;
	return { response, data };
}

export async function apiGet<TResponse>(
	path: string,
): Promise<{ response: Response; data: TResponse }> {
	const response = await fetch(apiUrl(path));
	const data = (await response.json()) as TResponse;
	return { response, data };
}
