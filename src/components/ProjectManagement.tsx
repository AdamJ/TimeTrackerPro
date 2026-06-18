import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Briefcase, RotateCcw } from "lucide-react";
import { Project } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";
import { ProjectSheet } from "@/components/ProjectSheet";

interface ProjectManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagement: React.FC<ProjectManagementProps> = ({
  isOpen,
  onClose,
}) => {
  const { projects, deleteProject, resetProjectsToDefaults } =
    useTimeTracking();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleOpenAdd = () => {
    setEditingProject(null);
    setSheetOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setSheetOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTargetId) return;
    const deletedName = projects.find((p) => p.id === deleteTargetId)?.name;
    deleteProject(deleteTargetId);
    toast({
      title: "Project deleted",
      description: deletedName
        ? `"${deletedName}" has been removed.`
        : undefined,
    });
    setDeleteTargetId(null);
  };

  const handleResetConfirm = () => {
    resetProjectsToDefaults();
    toast({
      title: "Projects reset",
      description: "Projects have been restored to defaults.",
    });
    setShowResetDialog(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5" />
                <span>Project Management</span>
              </DialogTitle>
              <div className="flex items-center space-x-2 my-4">
                <Button
                  onClick={() => setShowResetDialog(true)}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button onClick={handleOpenAdd} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Projects List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Projects ({projects.length})
              </h3>

              {projects.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No projects yet. Add your first project to get started!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="border-l-4"
                      style={{ borderLeftColor: project.color }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-semibold text-foreground">
                                    {project.name}
                                  </h4>
                                  {project.id.startsWith("default-") && (
                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {project.client}
                                </p>
                                {project.hourlyRate && (
                                  <p className="text-sm text-green-600 font-medium">
                                    ${project.hourlyRate}/hour
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              aria-label="Edit project"
                              onClick={() => handleEdit(project)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              aria-label="Delete project"
                              onClick={() => setDeleteTargetId(project.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              className="bg-destructive text-destructive-foreground hover:opacity-90"
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
    </>
  );
};
