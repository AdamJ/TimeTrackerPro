import { defineConfig, loadEnv } from "vite";
import path from "path";

// Vite config for compiling the Electron main process and preload script.
// Outputs CJS to dist-electron/ — no app plugins, no PWA, no React.
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "VITE_");
	// main.ts targets "module": "commonjs" (see electron/tsconfig.json), which
	// can't use import.meta.env like the renderer does — resolve the same
	// VITE_SQL_API_URL var here instead and inject it as a literal via `define`.
	const sqlApiOrigin = (() => {
		try {
			return new URL(env.VITE_SQL_API_URL ?? "http://localhost:4001/api").origin;
		} catch {
			return "http://localhost:4001";
		}
	})();

	return {
		define: {
			__SQL_API_ORIGIN__: JSON.stringify(sqlApiOrigin),
		},
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
	};
});
