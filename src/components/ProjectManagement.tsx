import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Briefcase, RotateCcw } from 'lucide-react';
import { Project } from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { DEFAULT_PROJECTS } from '@/config/projects';

interface ProjectManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagement: React.FC<ProjectManagementProps> = ({ isOpen, onClose }) => {
  const { projects, addProject, updateProject, deleteProject, resetProjectsToDefaults } = useTimeTracking();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    hourlyRate: '',
    color: '#3B82F6'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      client: '',
      hourlyRate: '',
      color: '#3B82F6'
    });
    setEditingProject(null);
    setIsAddingNew(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const projectData = {
      name: formData.name.trim(),
      client: formData.client.trim(),
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      color: formData.color
    };

    if (editingProject) {
      updateProject(editingProject.id, projectData);
    } else {
      addProject(projectData);
    }

    resetForm();
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client: project.client,
      hourlyRate: project.hourlyRate?.toString() || '',
      color: project.color || '#3B82F6'
    });
    setIsAddingNew(true);
  };

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(projectId);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to reset all projects to defaults? This will remove any custom projects you\'ve added.')) {
      resetProjectsToDefaults();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Briefcase className="w-5 h-5" />
              <span>Project Management</span>
            </DialogTitle>
            <div className="flex items-center space-x-2 my-4">
              {!isAddingNew && (
                <>
                <Button
                  onClick={handleResetToDefaults}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={() => setIsAddingNew(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Project Form */}
          {isAddingNew && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingProject ? 'Edit Project' : 'Add New Project'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Project Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter project name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="client">Client Name *</Label>
                      <Input
                        id="client"
                        value={formData.client}
                        onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                        placeholder="Enter client name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Project Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="color"
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                          className="w-16 h-10"
                        />
                        <span className="text-sm text-gray-500">{formData.color}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit">
                      {editingProject ? 'Update Project' : 'Add Project'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Projects List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Projects ({projects.length})
            </h3>

            {projects.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No projects yet. Add your first project to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="border-l-4" style={{ borderLeftColor: project.color }}>
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
                                <h4 className="font-semibold text-gray-900">{project.name}</h4>
                                {project.id.startsWith('default-') && (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{project.client}</p>
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
                            onClick={() => handleEdit(project)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(project.id)}
                            className="text-red-600 hover:text-red-700"
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
  );
};
