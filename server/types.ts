// Type-only imports — erased at build time, so importing them here never
// pulls the React/Supabase-heavy runtime code in src/ into the Node server.
export type {
	Task,
	DayRecord,
	Project,
	Client,
	TodoItem,
	PlannedTask,
	PlannedTaskStatus
} from "../src/contexts/TimeTrackingContext";
export type { TaskCategory } from "../src/config/categories";

import type { Task } from "../src/contexts/TimeTrackingContext";

export interface CurrentDayData {
	isDayStarted: boolean;
	dayStartTime: Date | null;
	currentTask: Task | null;
	tasks: Task[];
}
