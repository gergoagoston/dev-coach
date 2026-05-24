import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
	server: {
		port: 5173,
		host: true, // Ez engedélyezi, hogy a Docker / Ngrok elérje a Vite-et
		allowedHosts: [".ngrok-free.app"], // Ez pedig engedi az ngrok egyedi domainjeit
	},
});

