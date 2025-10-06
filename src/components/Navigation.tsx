import React, { useState } from 'react';
import {
  NavigationMenu,
  List,
  Item,
  Viewport
} from '@radix-ui/react-navigation-menu';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { ExportDialog } from '@/components/ExportDialog';
import { ProjectManagement } from '@/components/ProjectManagement';
import { UserMenu } from '@/components/UserMenu';
import { AuthDialog } from '@/components/AuthDialog';
import { Link } from 'react-router-dom';
import { CogIcon, Printer, Database, CalendarClock } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { formatDuration } from '@/utils/timeUtil';
import { SyncStatus } from '@/components/SyncStatus';
import { useAuth } from '@/hooks/useAuth';

const SiteNavigationMenu = () => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const { isAuthenticated } = useAuth();

  const {
    isDayStarted,
    tasks,
    getTotalDayDuration,
    isSyncing,
    lastSyncTime,
    refreshFromDatabase,
  } = useTimeTracking();

  const runningTime = isDayStarted ? getTotalDayDuration() : 0;

  return (
    <>
    <NavigationMenu className="relative bg-gradient-to-br from-gray-50 to-blue-50">
      <List className="flex items-center justify-between px-8 py-4 m-0 list-none rounded-md bg-white p-1 shadow-sm">
        <Item className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex">
            <Link
              to="/"
              className="flex items-center text-gray-900 hover:text-blue-700 print:hidden"
            >
              <img src="favicon.png" alt="Logo" className="w-8 h-8 sm:mr-2" />
              <span className="hidden sm:block">TimeTracker</span>
            </Link>
          </h1>
        </Item>
          {isDayStarted && tasks.length > 0 && (
            <Item>
              <span className="text-lg text-gray-900 font-bold inline-flex">
                <CalendarClock className="mr-1 text-gray-900" />
                {formatDuration(runningTime)}
              </span>
            </Item>
          )}
        <div className="flex space-x-4">
          <Item>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:block">Print</span>
            </Button>
          </Item>
          <Item>
            <NavLink
              to="/archive"
                className={({ isActive }) =>
                  `transition-all duration-200 flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input ... ${isActive ? 'bg-blue-200 hover:bg-accent hover:text-accent-foreground' : 'bg-white'}`
                }
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:block">Archives</span>
            </NavLink>
          </Item>
          <Item>
            <NavLink
              to="/settings"
                className={({ isActive }) =>
                  `transition-all duration-200 flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input ... ${isActive ? 'bg-blue-200 hover:bg-accent hover:text-accent-foreground' : 'bg-white'}`
                }
            >
              <CogIcon className="w-4 h-4" />
              <span className="hidden sm:block">Settings</span>
            </NavLink>
          </Item>
          <Item>
            <div className="flex space-x-4">
              <SyncStatus
                isAuthenticated={isAuthenticated}
                lastSyncTime={lastSyncTime}
                isSyncing={isSyncing}
                onRefresh={refreshFromDatabase}
              />
              <UserMenu onSignInClick={() => setShowAuthDialog(true)} />
            </div>
          </Item>
        </div>
      </List>

      <div className="perspective-[2000px] absolute left-0 top-full flex w-full justify-center">
        <Viewport className="relative mt-2.5 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-[top_center] overflow-hidden rounded-md bg-white transition-[width,_height] duration-300 data-[state=closed]:animate-scaleOut data-[state=open]:animate-scaleIn sm:w-[var(--radix-navigation-menu-viewport-width)]" />
      </div>
    </NavigationMenu>

    <AuthDialog
      isOpen={showAuthDialog}
      onClose={() => setShowAuthDialog(false)}
    />

    <ExportDialog
      isOpen={showExportDialog}
      onClose={() => setShowExportDialog(false)}
    />

    <ProjectManagement
      isOpen={showProjectManagement}
      onClose={() => setShowProjectManagement(false)}
    />
    </>
  );
};

export default SiteNavigationMenu;
