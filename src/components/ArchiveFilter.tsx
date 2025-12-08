import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Project } from '@/contexts/TimeTrackingContext';
import { TaskCategory } from '@/config/categories';

export interface ArchiveFilterState {
  startDate: string;
  endDate: string;
  project: string;
  category: string;
}

const ALL_PROJECTS = 'all-projects';
const ALL_CATEGORIES = 'all-categories';

interface ArchiveFilterProps {
  filters: ArchiveFilterState;
  onFilterChange: (filters: ArchiveFilterState) => void;
  projects: Project[];
  categories: TaskCategory[];
}

export const ArchiveFilter: React.FC<ArchiveFilterProps> = ({
  filters,
  onFilterChange,
  projects,
  categories
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleReset = () => {
    onFilterChange({
      startDate: '',
      endDate: '',
      project: '',
      category: ''
    });
  };

  const isFilterActive =
    filters.startDate || filters.endDate || filters.project || filters.category;

  return (
    <Card className="print:hidden">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 hover:opacity-70 transition-opacity"
            >
              <h3 className="font-semibold text-lg">Filter Archive</h3>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!isFilterActive}
              className="flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          </div>

          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    onFilterChange({ ...filters, startDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    onFilterChange({ ...filters, endDate: e.target.value })
                  }
                />
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={filters.project || ALL_PROJECTS}
                  onValueChange={(value) =>
                    onFilterChange({
                      ...filters,
                      project: value === ALL_PROJECTS ? '' : value
                    })
                  }
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PROJECTS}>All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.name}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={filters.category || ALL_CATEGORIES}
                  onValueChange={(value) =>
                    onFilterChange({
                      ...filters,
                      category: value === ALL_CATEGORIES ? '' : value
                    })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
