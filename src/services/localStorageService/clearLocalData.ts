import { STORAGE_KEYS } from "@/services/localStorageService/constants";

const REPORT_SUMMARY_PREFIX = "ttp_report_";
export const SUPABASE_API_CACHE = "supabase-api-cache";

// Removes every piece of the user's time-tracking data from this device:
// the entity blobs, their schema-mismatch backups (`<key>_v<n>_backup_<ts>`),
// and saved AI report summaries. UI preferences (board view, notification
// toggle, updater backoff) are left alone because they hold no personal data.
export function clearLocalAppData(): void {
	const dataKeys = Object.values(STORAGE_KEYS);
	const toRemove: string[] = [];

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key) continue;
		const isDataKey = dataKeys.some((dataKey) => key === dataKey || key.startsWith(`${dataKey}_v`));
		if (isDataKey || key.startsWith(REPORT_SUMMARY_PREFIX)) {
			toRemove.push(key);
		}
	}

	for (const key of toRemove) {
		localStorage.removeItem(key);
	}
}

// Drops the legacy service-worker cache of Supabase API responses. Earlier
// builds cached authenticated REST/auth GETs here; the rule is gone but caches
// already on disk persist until explicitly deleted.
export async function clearSupabaseResponseCache(): Promise<void> {
	if (typeof caches === "undefined") return;
	try {
		await caches.delete(SUPABASE_API_CACHE);
	} catch {
		// Cache Storage can be unavailable (private mode, some webviews); nothing to clear.
	}
}
