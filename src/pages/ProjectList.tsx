import React, { useState } from 'react';
import {
  useTimeTracking,
  TimeTrackingProvider,
  Project
} from '@/contexts/TimeTrackingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Archive as Edit,
  ArrowLeft,
  Briefcase,
  Trash2,
  RotateCcw,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DayRecord } from '@/contexts/TimeTrackingContext';
import SiteNavigationMenu from '@/components/Navigation';

const ProjectContent: React.FC = () => {
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    resetProjectsToDefaults
  } = useTimeTracking();
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
      hourlyRate: formData.hourlyRate
        ? parseFloat(formData.hourlyRate)
        : undefined,
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
    if (
      confirm(
        "Are you sure you want to reset all projects to defaults? This will remove any custom projects you've added."
      )
    ) {
      resetProjectsToDefaults();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation Header */}
      <SiteNavigationMenu />
      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 print:p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span>Project List</span>
          </h1>
          <div className="flex space-x-2 print:hidden">
            {!isAddingNew && (
              <>
                <Button
                  onClick={handleResetToDefaults}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:block">Reset to Defaults</span>
                </Button>
                <Button onClick={() => setIsAddingNew(true)} className="w-full">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:block">Add Project</span>
                </Button>
              </>
            )}
            {isAddingNew && (
              <>
                <Button
                  onClick={handleResetToDefaults}
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  <RotateCcw className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:block">Reset to Defaults</span>
                </Button>
                <Button onClick={() => setIsAddingNew(true)} className="w-full" disabled>
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:block">Add Project</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Add/Edit Project Form */}
      {isAddingNew && (
      <div className="max-w-6xl mx-auto p-6 print:p-4">
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
                  <Label htmlFor="name">
                    Project Name <span className="text-red-700">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value
                      }))
                    }
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="client">
                    Client Name <span className="text-red-700">*</span>
                  </Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        client: e.target.value
                      }))
                    }
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
                    step="01.00"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hourlyRate: e.target.value
                      }))
                    }
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
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          color: e.target.value
                        }))
                      }
                      className="w-16 h-10"
                    />
                    <span className="text-sm text-gray-500">
                      {formData.color}
                    </span>
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
      </div>
      )}
      <div className="max-w-6xl mx-auto p-6 print:p-4">
        {/* Projects List */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">
            Current Projects ({projects.length})
          </h3>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
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
                              <h4 className="font-semibold text-gray-900">
                                {project.name}
                              </h4>
                              {project.id.startsWith('default-') && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
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
    </div>
  );
};

const ProjectList: React.FC = () => {
  return (
    <TimeTrackingProvider>
      <ProjectContent />
    </TimeTrackingProvider>
  );
};

export default ProjectList;
