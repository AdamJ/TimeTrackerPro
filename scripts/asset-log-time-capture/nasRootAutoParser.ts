import { createNasRootAutoParserConfig } from "./nasRootAutoParserConfig.ts";
import { runNasRootAutoParser } from "./nasRootAutoParserCore.ts";
import { createRepository } from "./repository.ts";

const main = async () => {
	const config = createNasRootAutoParserConfig();
	const repository = createRepository(
		config.supabaseUrl,
		config.supabaseServiceRoleKey
	);
	const result = await runNasRootAutoParser({
		config,
		repository
	});

	console.log(JSON.stringify({
		status: result.status,
		summary: result.summary
	}, null, 2));
};

main().catch((error) => {
	console.error("[asset-log-time-capture] nas root auto parser failed");
	console.error(error);
	process.exitCode = 1;
});
