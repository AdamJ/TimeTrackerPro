import React, { useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { InitiativeTimeline } from "@/components/InitiativeTimeline";
import { InitiativeSheet } from "@/components/InitiativeSheet";
import { Initiative } from "@/contexts/TimeTrackingContext";

const ProjectPlanning: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projects, initiatives, loading } = useTimeTracking();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);

  const project = projects.find((p) => p.id === id);

  const projectInitiatives = useMemo(
    () => initiatives.filter((initiative) => initiative.projectId === id),
    [initiatives, id]
  );

  const handleOpenAdd = useCallback(() => {
    setEditingInitiative(null);
    setSheetOpen(true);
  }, []);

  const handleSelect = useCallback((initiative: Initiative) => {
    setEditingInitiative(initiative);
    setSheetOpen(true);
  }, []);

  const pageActions = useMemo(
    () => (
      <Button onClick={handleOpenAdd} size="sm">
        <Plus className="w-4 h-4 sm:mr-1" />
        <span className="hidden sm:block">New Initiative</span>
      </Button>
    ),
    [handleOpenAdd]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" asChild>
          <Link to="/projectlist">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <PageLayout title={project.name} actions={pageActions}>
      <div className="max-w-6xl mx-auto p-6 print:p-4">
        <InitiativeTimeline initiatives={projectInitiatives} onSelect={handleSelect} />
      </div>

      <InitiativeSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingInitiative(null);
        }}
        mode={editingInitiative ? "edit" : "add"}
        projectId={project.id}
        initiative={editingInitiative ?? undefined}
      />
    </PageLayout>
  );
};

export default ProjectPlanning;
