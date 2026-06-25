import { defineConfig } from "vite";
import path from "path";

// Vite config for compiling the Electron main process and preload script.
// Outputs CJS to dist-electron/ — no app plugins, no PWA, no React.
export default defineConfig({
	build: {
		outDir: "dist-electron",
		emptyOutDir: true,
		lib: {
			entry: {
				main: path.resolve(__dirname, "electron/main.ts"),
				preload: path.resolve(__dirname, "electron/preload.ts"),
			},
			formats: ["cjs"],
			fileName: (_format, entryName) => `${entryName}.cjs`,
		},
		rollupOptions: {
			external: [
				"electron",
				"electron-updater",
				"path",
				"url",
				"fs",
				"fs/promises",
				"os",
				"crypto",
				"stream",
				"net",
				"tls",
				"http",
				"https",
			],
			output: {
				format: "cjs",
			},
		},
		target: "node18",
		minify: false,
		sourcemap: false,
	},
});
