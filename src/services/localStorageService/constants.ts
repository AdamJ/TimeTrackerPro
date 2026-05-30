export const STORAGE_KEYS = {
	CURRENT_DAY: "timetracker_current_day",
	ARCHIVED_DAYS: "timetracker_archived_days",
	PROJECTS: "timetracker_projects",
	CATEGORIES: "timetracker_categories",
	TODOS: "timetracker_todos",
	PLANNED_TASKS: "timetracker_planned_tasks",
	CLIENTS: "timetracker_clients"
};

// Increment this when the stored data format changes in a breaking way.
// On read, if the stored version is lower than SCHEMA_VERSION the data is
// treated as legacy and the key is cleared rather than letting corrupted data
// propagate through the application.
export const SCHEMA_VERSION = 1;
