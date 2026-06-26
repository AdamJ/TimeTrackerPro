import { Project } from "@/contexts/TimeTrackingContext";
import { STORAGE_KEYS, SCHEMA_VERSION } from "./constants";
import { notifyWriteFailure, readVersioned, writeVersioned } from "./utils";

export async function saveProjects(projects: Project[]): Promise<void> {
	const result = writeVersioned(STORAGE_KEYS.PROJECTS, { data: projects, _v: SCHEMA_VERSION });
	if (!result.ok) notifyWriteFailure(STORAGE_KEYS.PROJECTS);
}

export async function getProjects(): Promise<Project[]> {
	try {
		return readVersioned<Project>(STORAGE_KEYS.PROJECTS, "data");
	} catch (error) {
		console.error("Error loading projects from localStorage:", error);
		return [];
	}
}

export async function deleteProject(id: string): Promise<void> {
	const projects = await getProjects();
	await saveProjects(projects.filter((project) => project.id !== id));
}
