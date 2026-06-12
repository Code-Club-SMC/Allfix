import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	server: {
		host: "::",
		port: 5173,
		hmr: {
			overlay: false,
		},
		proxy: {
			// Proxy all /api requests to the Go backend — avoids CORS issues in dev
			"/api": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
			// Proxy uploaded files
			"/uploads": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
		},
	},
	plugins: [
		tailwindcss(),
		react(),
		mode === "development" && componentTagger(),
	].filter(Boolean),
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
		dedupe: [
			"react",
			"react-dom",
			"react/jsx-runtime",
			"react/jsx-dev-runtime",
			"@tanstack/react-query",
			"@tanstack/query-core",
		],
	},
}));


