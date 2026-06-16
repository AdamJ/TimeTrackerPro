import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";

interface ProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  project?: Project;
}

export const ProjectSheet: React.FC<ProjectSheetProps> = ({
  open,
  onOpenChange,
  mode,
  project,
}) => {
  const {
    clients,
    addClient,
    persistClient,
    addProject,
    updateProject,
    forceSyncToDatabase,
  } = useTimeTracking();

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [isBillable, setIsBillable] = useState(true);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  const activeClients = clients.filter((c) => !c.archived);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && project) {
      setName(project.name);
      setClient(project.client);
      setHourlyRate(project.hourlyRate?.toString() ?? "");
      setColor(project.color || "#3B82F6");
      setIsBillable(project.isBillable !== false);
    } else {
      setName("");
      setClient("");
      setHourlyRate("");
      setColor("#3B82F6");
      setIsBillable(true);
    }
    setIsAddingClient(false);
    setNewClientName("");
  }, [open, mode, project]);

  const handleAddClientInline = async () => {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    const created = addClient(trimmed);
    if (created) await persistClient(created);
    setClient(trimmed);
    setNewClientName("");
    setIsAddingClient(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const trimmedClient = client.trim();
    if (!trimmed || !trimmedClient) return;

    const data = {
      name: trimmed,
      client: trimmedClient,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      color,
      isBillable,
    };

    if (mode === "add") {
      addProject(data);
      toast({
        title: "Project added",
        description: `"${trimmed}" has been added.`,
      });
    } else if (mode === "edit" && project) {
      updateProject(project.id, data);
      toast({
        title: "Project updated",
        description: `"${trimmed}" has been updated.`,
      });
    }

    await forceSyncToDatabase();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "add" ? "Add Project" : "Edit Project"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div>
            <Label htmlFor="project-name">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          <div>
            <Label htmlFor="project-client">
              Client Name <span className="text-destructive">*</span>
            </Label>
            {isAddingClient ? (
              <div className="flex items-center space-x-2">
                <Input
                  id="project-client"
                  autoFocus
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="New client name"
                />
                <Button type="button" size="sm" onClick={handleAddClientInline}>
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingClient(false);
                    setNewClientName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Select
                value={client}
                onValueChange={(value) => {
                  if (value === "__add_new__") {
                    setIsAddingClient(true);
                    return;
                  }
                  setClient(value);
                }}
              >
                <SelectTrigger id="project-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {client && !clients.some((c) => c.name === client) && (
                    <SelectItem value={client} disabled>
                      {client} (unmanaged)
                    </SelectItem>
                  )}
                  <SelectItem value="__add_new__">+ Add new client</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="project-hourly-rate">Hourly Rate ($)</Label>
              <Input
                id="project-hourly-rate"
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="project-color">Project Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="project-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-10"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="project-billable"
              checked={isBillable}
              onCheckedChange={(checked) => setIsBillable(checked === true)}
            />
            <Label htmlFor="project-billable" className="text-sm font-medium">
              Billable project
            </Label>
            <span className="text-xs text-muted-foreground">
              (Tasks in this project can generate revenue)
            </span>
          </div>

          <SheetFooter className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{mode === "add" ? "Add" : "Save"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
