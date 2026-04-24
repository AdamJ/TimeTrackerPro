import { createRunnerConfig } from "./config.ts";
import {
	runAutoTimeCapture,
} from "./core.ts";
import { createRepository } from "./repository.ts";

const main = async () => {
	const config = createRunnerConfig();
	const repository = (config.supabaseUrl && config.supabaseServiceRoleKey)
		? createRepository(config.supabaseUrl, config.supabaseServiceRoleKey)
		: {
			createRun: async () => {
				throw new Error("Dry-run repository should not create run records");
			},
			finalizeRun: async () => undefined
		};
	const result = await runAutoTimeCapture({
		config,
		repository
	});

	console.log(JSON.stringify({
		status: result.status,
		runId: result.runId ?? null,
		summary: result.summary
	}, null, 2));
};

main().catch((error) => {
	console.error("[asset-log-time-capture] runner failed");
	console.error(error);
	process.exitCode = 1;
});
