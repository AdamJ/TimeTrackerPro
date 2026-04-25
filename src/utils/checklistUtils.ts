// src/utils/checklistUtils.ts
// Utilities for parsing and toggling GFM task-list items inside task descriptions.
// Supports the `- [ ] text` (unchecked) and `- [x] text` (checked) syntax.

export interface ChecklistEntry {
	text: string;
	completed: boolean;
	lineIndex: number; // index into description.split('\n') — used for toggling
}

/**
 * Extracts all GFM task-list items from a markdown description string.
 * Returns entries in the order they appear in the text.
 */
export function parseTaskChecklist(description: string): ChecklistEntry[] {
	if (!description) return [];

	return description.split("\n").flatMap((line, lineIndex) => {
		if (!line.includes("- [")) return []; // fast path: skip non-checklist lines
		const unchecked = line.match(/^(\s*)-\s\[ \]\s(.+)/);
		if (unchecked) return [{ text: unchecked[2].trim(), completed: false, lineIndex }];
		const checked = line.match(/^(\s*)-\s\[x\]\s(.+)/i);
		if (checked) return [{ text: checked[2].trim(), completed: true, lineIndex }];
		return [];
	});
}

/**
 * Toggles the checked/unchecked state of a task-list item at `lineIndex`
 * in the given description string. Returns the updated description.
 */
export function toggleDescriptionChecklistItem(description: string, lineIndex: number): string {
	const lines = description.split("\n");
	const line = lines[lineIndex];
	if (!line) return description;

	if (line.match(/^(\s*)-\s\[ \]\s/)) {
		lines[lineIndex] = line.replace(/^(\s*)-\s\[ \]\s/, "$1- [x] ");
	} else if (line.match(/^(\s*)-\s\[x\]\s/i)) {
		lines[lineIndex] = line.replace(/^(\s*)-\s\[x\]\s/i, "$1- [ ] ");
	}

	return lines.join("\n");
}
