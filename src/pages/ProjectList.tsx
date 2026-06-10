import React, { useState } from "react";
import { TimeTrackingProvider, Project } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  Briefcase,
  Trash2,
  RotateCcw,
  Plus,
  Archive,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Badge } from "@radix-ui/themes";
import { toast } from "@/hooks/use-toast";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemMedia } from "@/components/ui/item";
import { ProjectSheet } from "@/components/ProjectSheet";

const ProjectContent: React.FC = () => {
  const {
    projects,
    deleteProject,
    resetProjectsToDefaults,
    archiveProject,
    restoreProject,
    forceSyncToDatabase,
  } = useTimeTracking();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeProjects = projects.filter((project) => !project.archived);
  const archivedProjects = projects.filter((project) => project.archived);

  const handleArchiveProject = async (projectId: string) => {
    const archivedName = projects.find(
      (project) => project.id === projectId,
    )?.name;
    archiveProject(projectId);
    await forceSyncToDatabase();
    toast({
      title: "Project archived",
      description: archivedName
        ? `"${archivedName}" has been archived.`
        : undefined,
    });
  };

  const handleRestoreProject = async (projectId: string) => {
    const restoredName = projects.find(
      (project) => project.id === projectId,
    )?.name;
    restoreProject(projectId);
    await forceSyncToDatabase();
    toast({
      title: "Project restored",
      description: restoredName
        ? `"${restoredName}" has been restored.`
        : undefined,
    });
  };

  const handleOpenAdd = () => {
    setEditingProject(null);
    setSheetOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setSheetOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    deleteProject(deleteTargetId);
    await forceSyncToDatabase();
    setDeleteTargetId(null);
  };

  const handleResetConfirm = () => {
    resetProjectsToDefaults();
    setShowResetDialog(false);
  };

  return (
    <PageLayout
      title={
        <>
          Projects <Badge variant="outline">{activeProjects.length}</Badge>
        </>
      }
      actions={
        <div className="flex space-x-2">
          <Button onClick={() => setShowResetDialog(true)} variant="outline">
            <RotateCcw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:block">Reset to Defaults</span>
          </Button>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:block">Add Project</span>
          </Button>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto p-6 print:p-4">
        {/* Projects List */}
        <div className="space-y-6">
          {activeProjects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No projects yet. Add your first project to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex w-full flex-col gap-4">
                {activeProjects.map((project) => (
                <Item
                  variant="outline"
                  className="shadow-none duration-100 hover:shadow-md transition-shadow"
                  >
                    <ItemMedia>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>
                        {project.name}
                        <span className="hidden sm:block">
                        {project.id.startsWith("default-") && (
                          <Badge variant="surface" color="blue">
                            Default
                          </Badge>
                        )}
                        {project.isBillable !== false ? (
                          <Badge variant="surface" color="green">
                            Billable
                          </Badge>
                        ) : (
                          <Badge variant="surface" color="gray">
                            Non-billable
                          </Badge>
                          )}
                          </span>
                      </ItemTitle>
                      <ItemDescription>
                        <p>
                          <Label>Client:</Label> {project.client}
                        </p>
                        {project.hourlyRate && (
                        <p>
                          <Label>Rate:</Label> ${project.hourlyRate}/hour
                        </p>
                        )}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(project)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        <span className="hidden sm:block">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        aria-label="Archive project"
                        onClick={() => handleArchiveProject(project.id)}
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        <span className="hidden sm:block">Archive</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteTargetId(project.id)}
                        className="text-destructive hover:text-secondary bg-transparent hover:bg-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:block">Delete</span>
                      </Button>
                    </ItemActions>
                  </Item>
              ))}
            </div>
          )}

          {/* Archived Projects (collapsed by default) */}
          {archivedProjects.length > 0 && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => setShowArchived((prev) => !prev)}
                className="px-0 hover:bg-transparent"
              >
                {showArchived ? (
                  <ChevronDown className="w-4 h-4 mr-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                Archived ({archivedProjects.length})
              </Button>
              {showArchived && (
                <div className="grid gap-4">
                  {archivedProjects.map((project) => (
                  <div className="flex w-full flex-col gap-4">
                    <Item
                      key={project.id}
                      variant="outline"
                      className="bg-muted"
                      >
                        <ItemMedia>
                          <div
                            className="w-4 h-4 rounded-full opacity-70"
                            style={{ backgroundColor: project.color }}
                          />
                        </ItemMedia>
                        <ItemContent className="opacity-70">
                          <ItemTitle>{project.name}</ItemTitle>
                          <ItemDescription>
                            <p>
                              <Label>Client:</Label> {project.client}
                            </p>
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Restore project"
                            onClick={() => handleRestoreProject(project.id)}
                          >
                            <RotateCcw className="w-3 h-3 sm:mr-2" />
                            <span className="hidden sm:block">Restore</span>
                          </Button>
                        </ItemActions>
                    </Item>
                  </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset projects to defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove any custom projects you've added. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingProject(null);
        }}
        mode={editingProject ? "edit" : "add"}
        project={editingProject ?? undefined}
      />
    </PageLayout>
  );
};

const ProjectList: React.FC = () => {
  return <ProjectContent />;
};

export default ProjectList;
