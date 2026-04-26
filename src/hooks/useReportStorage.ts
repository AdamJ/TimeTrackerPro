import { useState, useEffect, useCallback } from "react";
import { ReportTone } from "@/utils/reportUtils";

export interface SavedSummary {
	text: string;
	generatedAt: string;
	weekLabel: string;
}

function buildKey(weekKey: string, tone: ReportTone): string {
	return `ttp_report_${weekKey}_${tone}`;
}

function readEntry(key: string): SavedSummary | null {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as SavedSummary) : null;
	} catch {
		return null;
	}
}

export function useReportStorage(weekKey: string, tone: ReportTone) {
	const key = buildKey(weekKey, tone);

	const [saved, setSaved] = useState<SavedSummary | null>(() =>
		readEntry(key)
	);

	useEffect(() => {
		setSaved(readEntry(key));
	}, [key]);

	const save = useCallback(
		(text: string, weekLabel: string) => {
			const entry: SavedSummary = {
				text,
				generatedAt: new Date().toISOString(),
				weekLabel,
			};
			try {
				localStorage.setItem(key, JSON.stringify(entry));
				setSaved(entry);
			} catch {
				// localStorage quota exceeded — silently ignore
			}
		},
		[key]
	);

	const clear = useCallback(() => {
		localStorage.removeItem(key);
		setSaved(null);
	}, [key]);

	return { saved, save, clear };
}
