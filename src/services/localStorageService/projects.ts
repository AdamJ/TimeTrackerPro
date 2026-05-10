import { Project } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { readVersioned } from "./utils";

export async function saveProjects(projects: Project[]): Promise<void> {
	try {
		localStorage.setItem(
			STORAGE_KEYS.PROJECTS,
			JSON.stringify({ data: projects, _v: SCHEMA_VERSION })
		);
	} catch (error) {
		console.warn("Failed to save projects to localStorage:", error);
	}
}

export async function getProjects(): Promise<Project[]> {
	try {
		return readVersioned<Project>(STORAGE_KEYS.PROJECTS, "data");
	} catch (error) {
		console.error("Error loading projects from localStorage:", error);
		return [];
	}
}
