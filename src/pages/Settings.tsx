import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { DataRecoveryDialog } from '@/components/DataRecoveryDialog';
import {
  CogIcon,
  ChevronRight,
  Shredder,
  DatabaseBackup,
  History
} from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/PageLayout';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useBackgroundNotificationSetting } from '@/hooks/useBackgroundNotificationSetting';
import { toast } from '@/hooks/use-toast';
import { consumePendingMenuAction } from '@/lib/electronMenuActions';

const SettingsContent: React.FC = () => {
  const { archivedDays, projects, categories, clients } = useTimeTracking();
  const { isAuthenticated } = useAuth();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [backgroundNotificationsEnabled, setBackgroundNotificationsEnabled] = useBackgroundNotificationSetting();
  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (consumePendingMenuAction('export')) {
      setShowExportDialog(true);
    }
  }, []);

  const handleClearAllData = () => {
    localStorage.clear();
    window.location.replace(window.location.pathname);
  };

  const handleBackgroundNotificationsToggle = async (checked: boolean) => {
    if (!checked) {
      setBackgroundNotificationsEnabled(false);
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBackgroundNotificationsEnabled(true);
    } else {
      toast({
        title: 'Notifications blocked',
        description: 'Allow notifications for this site in your browser settings to enable this feature.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageLayout title="Settings" icon={<CogIcon className="w-6 h-6" />}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid gap-6">
          {/* Management Sections */}
          <h2 className="border-b font-semibold flex gap-3 pb-2">
            General
          </h2>
          <div className="flex w-full flex-col gap-4">
            <Item asChild
              variant="outline"
              className="shadow-none duration-100 hover:shadow-md transition-shadow"
            >
              <a href="/projectlist">
                <ItemMedia>
                  <Badge variant="outline">{projects.length}</Badge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Projects</ItemTitle>
                  <ItemDescription>
                    Manage your projects, clients, and hourly rates. Projects help organize your tasks and calculate revenue automatically.
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
                <ItemMedia>
                  <Badge variant="outline">{clients.length}</Badge>
                </ItemMedia>
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
                <ItemMedia>
                  <Badge variant="outline">{categories.length}</Badge>
                </ItemMedia>
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
            <Item asChild
              variant="outline"
              className="shadow-none duration-100 hover:shadow-md transition-shadow"
            >
              <a href="/archive">
                <ItemMedia>
                  <Badge variant="outline">{archivedDays.length}</Badge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Archived Days</ItemTitle>
                  <ItemDescription>
                    View and manage your archived time tracking data.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="w-4 h-4" />
                </ItemActions>
              </a>
            </Item>
          </div>
          {/* Notifications */}
          <h2 className="border-b font-semibold flex gap-3 pb-2">
            Notifications
          </h2>
          <div className="flex w-full flex-col gap-4">
            <Item
              variant="outline"
              className="shadow-none duration-100 hover:shadow-md transition-shadow"
            >
              <ItemContent>
                <ItemTitle>Background timer reminders</ItemTitle>
                <ItemDescription>
                  {notificationsSupported
                    ? 'Get an OS notification if you leave a timer running while the app is backgrounded.'
                    : 'Your browser does not support notifications.'}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch
                  checked={backgroundNotificationsEnabled}
                  disabled={!notificationsSupported}
                  onCheckedChange={handleBackgroundNotificationsToggle}
                  aria-label="Toggle background timer reminders"
                />
              </ItemActions>
            </Item>
          </div>
          {/* Data Management */}
          <h2 className="border-b font-semibold flex gap-3 pb-2">
            Data
          </h2>
          <div className="flex w-full flex-col gap-4">
            <Item
              variant="outline"
              className="shadow-none duration-100 hover:shadow-md transition-shadow"
            >
              <ItemContent>
                <ItemTitle>Manage</ItemTitle>
                <ItemDescription>
                  Manage your data by exporting your time tracking data as CSV or JSON files. Generate invoice data for specific clients and date ranges. You can also import data from CSV files.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  onClick={() => setShowExportDialog(true)}
                  variant="outline"
                >
                  <DatabaseBackup className="w-4 h-4 mr-1" />
                  Manage
                </Button>
              </ItemActions>
            </Item>
          </div>
          <h2 className="border-b font-semibold flex gap-3 pb-2">
            Storage
          </h2>
          <div className="flex w-full flex-col gap-4">
            {!isAuthenticated && (
              <Item
                variant="outline"
                className="shadow-none duration-100 hover:shadow-md transition-shadow"
              >
                <ItemContent>
                  <ItemTitle>Data Recovery</ItemTitle>
                  <ItemDescription>
                    Restore a backup that was saved automatically before a schema upgrade or app quit.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    onClick={() => setShowRecoveryDialog(true)}
                    variant="outline"
                  >
                    <History className="w-4 h-4 mr-1" />
                    Restore Backup
                  </Button>
                </ItemActions>
              </Item>
            )}
            <Item
              variant="outline"
              className="shadow-none duration-100 hover:shadow-md transition-shadow"
            >
              <ItemContent>
                <ItemTitle>Storage</ItemTitle>
                <ItemDescription>
                  Manage your stored data. All data is stored locally in your browser. Use export before clearing data.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  onClick={() => setShowClearDataDialog(true)}
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
                >
                  <Shredder className="w-4 h-4 mr-1" />
                  Clear All Data
                </Button>
              </ItemActions>
            </Item>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
      <DataRecoveryDialog
        isOpen={showRecoveryDialog}
        onClose={() => setShowRecoveryDialog(false)}
      />
      <AlertDialog
        open={showClearDataDialog}
        onOpenChange={(open) => {
          setShowClearDataDialog(open);
          if (!open) setClearConfirmText("");
        }}
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
          <div className="px-1 py-2">
            <Input
              placeholder='Type "confirm" to continue'
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:opacity-90 hover:border-destructive"
              disabled={clearConfirmText !== "confirm"}
              onClick={handleClearAllData}
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
