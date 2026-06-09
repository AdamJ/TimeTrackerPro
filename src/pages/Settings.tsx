import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { ExportDialog } from '@/components/ExportDialog';
import {
  Briefcase,
  Tag,
  Users,
  Download,
  Database,
  Trash2,
  CogIcon,
  ChevronRight,
  Cog,
  Shredder,
  DatabaseBackup
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { PageLayout } from '@/components/PageLayout';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';

const SettingsContent: React.FC = () => {
  const { archivedDays, projects, categories, clients } = useTimeTracking();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);

  const handleClearAllData = () => {
    localStorage.clear();
    // Navigate to root instead of reload() so Capacitor's JS bridge is not interrupted
    window.location.replace(window.location.pathname);
  };

  return (
    <PageLayout title="Settings" icon={<CogIcon className="w-6 h-6" />}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid gap-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {clients.length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {projects.length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted border-border">
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {categories.length}
                </div>
              </CardContent>
            </Card>
            {archivedDays.length > 0 && (
              <Card className="bg-muted border-border">
                <CardHeader>
                  <CardTitle>Archived Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {archivedDays.length}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          {/* Management Sections */}
          <h2 className="border-b font-semibold flex gap-3 pb-2">
            <Cog className="w-5 h-5" /> Management
          </h2>
          <div className="flex w-full flex-col gap-4">
            <Item asChild
              variant="outline"
              className="shadow-none duration-100 hover:shadow-md transition-shadow"
            >
              <a href="/projectlist">
                <ItemContent>
                  <ItemTitle>Projects</ItemTitle>
                  <ItemDescription>
                    Manage your projects, clients, and hourly rates. Projects help
                  organize your tasks and calculate revenue automatically.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="w-4 h-4" />
                </ItemActions>
              </a>
            </Item>
            <Item asChild
              variant="outline"
              className="shadow-none duration-100 hover:shadow-md transition-shadow"
            >
              <a href="/clients">
                <ItemContent>
                  <ItemTitle>Clients</ItemTitle>
                  <ItemDescription>
                    Manage the clients you assign to projects. Archive clients you no longer work with — archiving is blocked while a client still has active projects.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="w-4 h-4" />
                </ItemActions>
              </a>
            </Item>
            <Item asChild
              variant="outline"
              className="shadow-none duration-100 hover:shadow-md transition-shadow"
            >
              <a href="/categories">
                <ItemContent>
                  <ItemTitle>Categories</ItemTitle>
                  <ItemDescription>
                    Create and manage task categories like Development, Design, Meetings, etc. Categories help classify your work.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="w-4 h-4" />
                </ItemActions>
              </a>
            </Item>
          </div>
          {/* Data Management */}
          <h2 className="border-b font-semibold flex gap-3 pb-2">
            <Database className="w-5 h-5" /> Data Management
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="flex h-full flex-col justify-between pb-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  Exports/Imports
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <p>
                  Export your time tracking data as CSV or JSON files. Generate invoice data for specific clients and date ranges. You can also import data from CSV files.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => setShowExportDialog(true)}
                  variant="outline"
                >
                  <DatabaseBackup className="w-4 h-4 mr-1" />
                  Manage Data
                </Button>
              </CardFooter>
            </Card>
            <Card className="flex h-full flex-col justify-between pb-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <p>
                  Manage your stored data. All data is stored locally in your
                  browser. Use export before clearing data.
                </p>
              </CardContent>
              <CardFooter>
                <div className="flex flex-row gap-4">
                  <Link to="/archive" className="w-full">
                    <Button variant="outline" className="w-full">
                      <Database className="w-4 h-4 mr-2" />
                      View Archive
                    </Button>
                  </Link>
                  <Button
                    onClick={() => setShowClearDataDialog(true)}
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
                  >
                    <Shredder className="w-4 h-4 mr-1" />
                    Clear All Data
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
          {/* Quick Tips
          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    Getting Started
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
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
                  <h4 className="font-medium text-foreground mb-2">
                    Best Practices
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
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
           */}
        </div>
      </div>

      {/* Dialogs */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
      <AlertDialog
        open={showClearDataDialog}
        onOpenChange={setShowClearDataDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all archived days, projects, and
              categories. This action cannot be undone. Export your data first
              if you want a backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

const Settings: React.FC = () => {
  return <SettingsContent />;
};

export default Settings;
