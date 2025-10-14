import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ClockPlus, Plus } from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';

interface NewTaskFormProps {
  onSubmit: (
    title: string,
    description?: string,
    project?: string,
    client?: string,
    category?: string
  ) => void;
}

export const NewTaskForm: React.FC<NewTaskFormProps> = ({ onSubmit }) => {
  const { projects, categories } = useTimeTracking();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedProjectData = projects.find((p) => p.id === selectedProject);
  const selectedCategoryData = categories.find(
    (c) => c.id === selectedCategory
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(
        title.trim(),
        description.trim() || undefined,
        selectedProjectData?.name,
        selectedProjectData?.client,
        selectedCategoryData?.id
      );
      setTitle('');
      setDescription('');
      setSelectedProject('');
      setSelectedCategory('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full font-bold border-green-700 text-green-700 hover:bg-green-50 hover:text-green-700 flex items-center justify-center space-x-2 py-3"
      >
        <ClockPlus className="w-4 h-4" />
        New Task
      </Button>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Start New Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            autoFocus
          />

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description (optional)"
            className="w-full min-h-[80px] resize-none"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.length > 0 && (
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {projects.length > 0 && (
              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span>{project.name}</span>
                        <span className="text-sm text-gray-500">
                          {project.client}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setTitle('');
                setDescription('');
                setSelectedProject('');
                setSelectedCategory('');
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={!title.trim()}>
              Start Task
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
