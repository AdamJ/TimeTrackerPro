import { defineConfig } from "vite";
import path from "path";

// Vite config for compiling the Electron main process only.
// Outputs CJS to dist-electron/ — no app plugins, no PWA, no React.
export default defineConfig({
	build: {
		outDir: "dist-electron",
		emptyOutDir: true,
		lib: {
			entry: path.resolve(__dirname, "electron/main.ts"),
			formats: ["cjs"],
			fileName: () => "main.cjs",
		},
		rollupOptions: {
			external: [
				"electron",
				"path",
				"url",
				"fs",
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
