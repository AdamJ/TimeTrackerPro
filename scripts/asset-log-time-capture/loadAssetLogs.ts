import type { SupabaseClient } from "@supabase/supabase-js";
import type {
	AutoTimeAction,
	AutoTimeAssetLog,
	LoadAssetLogsParams
} from "./core.ts";

const PAGE_SIZE = 1000;

const resolveSourceTableName = (sourceTable: string): string => {
	if (sourceTable === "public.asset_version_log" || sourceTable === "asset_version_log") {
		return "asset_version_log";
	}

	throw new Error(`Unsupported source table: ${sourceTable}`);
};

export const createLoadAssetLogs = (client: SupabaseClient) =>
	async ({
		sourceTable,
		rangeStartIso,
		rangeEndIso,
		actions
	}: LoadAssetLogsParams): Promise<AutoTimeAssetLog[]> => {
		const tableName = resolveSourceTableName(sourceTable);
		const rows: AutoTimeAssetLog[] = [];
		let page = 0;

		while (true) {
			const from = page * PAGE_SIZE;
			const to = from + PAGE_SIZE - 1;
			const { data, error } = await client
				.from(tableName)
				.select("id,file_path,nas_username,action,detected_at,sa_ai_user_id,created_at")
				.gte("detected_at", rangeStartIso)
				.lt("detected_at", rangeEndIso)
				.in("action", actions as AutoTimeAction[])
				.order("detected_at", {
					ascending: true
				})
				.range(from, to);

			if (error) {
				throw new Error(`Failed to load asset_version_log rows: ${error.message}`);
			}

			const batch = (data ?? []) as AutoTimeAssetLog[];
			rows.push(...batch);

			if (batch.length < PAGE_SIZE) {
				break;
			}

			page += 1;
		}

		return rows;
	};
