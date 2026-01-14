import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportDialog } from '@/components/ExportDialog';
import {
  Briefcase,
  Tag,
  Download,
  Database,
  Trash2,
  CogIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TimeTrackingProvider } from '@/contexts/TimeTrackingContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import SiteNavigationMenu from '@/components/Navigation';

const SettingsContent: React.FC = () => {
  const { archivedDays, projects, categories } = useTimeTracking();
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleClearAllData = () => {
    if (
      confirm(
        'Are you sure you want to clear ALL data? This action cannot be undone and will remove all archived days, projects, and categories.'
      )
    ) {
      if (
        confirm(
          'This will permanently delete everything. Are you absolutely sure?'
        )
      ) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation Header */}
      <SiteNavigationMenu />
      {/* Main Content */}
      <div className="max-w-6xl mx-auto pt-4 pb-2 px-4 md:p-6 print:p-4">
        <div className="flex items-center justify-between">
          <h1 className="md:text-2xl font-bold text-gray-900 flex items-center space-x-1">
            <CogIcon className="w-6 h-6 mr-1" />
            <span>Settings</span>
          </h1>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid gap-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:hidden">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {archivedDays.length}
                </div>
                <div className="text-sm text-gray-600">Archived Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {projects.length}
                </div>
                <div className="text-sm text-gray-600">Projects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {categories.length}
                </div>
                <div className="text-sm text-gray-600">Categories</div>
              </CardContent>
            </Card>
          </div>
          {/* Management Sections */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Project Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span>Project Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Manage your projects, clients, and hourly rates. Projects help
                  organize your tasks and calculate revenue automatically.
                </p>
                <Link to="/projectlist">
                  <Button variant="outline" className="w-full">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Manage Projects
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {/* Category Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="w-5 h-5" />
                  <span>Category Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Create and manage task categories like Development, Design,
                  Meetings, etc. Categories help classify your work.
                </p>
                <Link to="/categories">
                  <Button variant="outline" className="w-full">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Manage Categories
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {/* Data Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Exports/Imports</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Export your time tracking data as CSV or JSON files. Generate invoice data for specific clients and date ranges. You can also import data from CSV files.
                </p>
                <Button
                  onClick={() => setShowExportDialog(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Data Export/Import
                </Button>
              </CardContent>
            </Card>
            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Data Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Manage your stored data. All data is stored locally in your
                  browser. Use export before clearing data.
                </p>
                <div className="space-y-2">
                  <Link to="/archive">
                    <Button variant="outline" className="w-full">
                      <Database className="w-4 h-4 mr-2" />
                      View Archive
                    </Button>
                  </Link>
                  <Button
                    onClick={handleClearAllData}
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Getting Started
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      • Set up projects with hourly rates for automatic revenue
                      calculation
                    </li>
                    <li>
                      • Create categories to classify different types of work
                    </li>
                    <li>• Use task descriptions for detailed work notes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Best Practices
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Export your data regularly as backup</li>
                    <li>
                      • Adjust task times in 15-minute intervals for accuracy
                    </li>
                    <li>• Use consistent project and category naming</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Dialogs */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  );
};

const Settings: React.FC = () => {
  return (
    <SettingsContent />
  );
};

export default Settings;
