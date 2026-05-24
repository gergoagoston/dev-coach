import { useState } from "react";
import { useNavigate } from "react-router-dom";

type GithubValidateResponse = {
	username: string;
	profile?: { avatarUrl?: string | null };
	error?: string;
};

export default function LoginPage() {
	const navigate = useNavigate();
	const [token, setToken] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const trimmed = token.trim();
		if (!trimmed) {
			setErrorMessage("Token is required");
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");

		try {
			const res = await fetch("http://localhost:3000/api/github/validate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: trimmed }),
			});

			const data = (await res.json()) as GithubValidateResponse;

			if (!res.ok) {
				throw new Error(data.error ?? "Validation failed");
			}
			console.log(data);
			localStorage.setItem("githubToken", trimmed);
			localStorage.setItem("githubUsername", data.username);
			localStorage.setItem("githubAvatarUrl", data.profile?.avatarUrl ?? "");

			navigate("/dashboard", { replace: true });
		} catch (err) {
			setErrorMessage(
				err instanceof Error ? err.message : "Validation failed",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
			<div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-8 shadow-2xl">
				<div className="mb-8 text-center">
					<h1 className="text-3xl font-semibold text-white tracking-tight">
						DevCoach
					</h1>

					<p className="mt-2 text-sm text-zinc-400">
						Connect your GitHub token to continue
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div>
						<label className="mb-2 block text-sm font-medium text-zinc-300">
							GitHub Token
						</label>

						<input
							type="password"
							placeholder="ghp_xxxxxxxxxxxxxxxxx"
							value={token}
							onChange={(e) => setToken(e.target.value)}
							className="
				w-full rounded-xl border border-zinc-700
				bg-zinc-950 px-4 py-3
				text-sm text-white
				placeholder:text-zinc-500
				outline-none
				transition-all duration-200
				focus:border-blue-500
				focus:ring-2 focus:ring-blue-500/20
			  "
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						className="
			  w-full rounded-xl
			  bg-white text-black
			  py-3 text-sm font-medium
			  transition-all duration-200
			  hover:scale-[1.01]
			  hover:bg-zinc-200
			  active:scale-[0.99]
			"
					>
						{isSubmitting ? "Validating..." : "Continue"}
					</button>
				</form>

				<div className="mt-6 text-center text-xs text-zinc-500">
					{errorMessage ? (
						<span className="text-red-400">Error: {errorMessage}</span>
					) : (
						"Your token is stored securely"
					)}
				</div>
			</div>
		</div>
	);
}
