import { defineConfig } from "vite";

export default defineConfig({
	publicDir: "public",

	build: {
		sourcemap: false,
		outDir: "dist",
		emptyOutDir: false,
		lib: {
			entry: "src/main.js",
			formats: ["es"],
			fileName: "scripts/main",
		},

	},
});
