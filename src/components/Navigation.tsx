import { useState } from 'react';
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
import { Brain, CogIcon, Printer, CalendarClock, ClipboardList, Kanban } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { formatDuration } from '@/utils/timeUtil';
import { SyncStatus } from '@/components/SyncStatus';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const getNavLinkClasses = (isActive: boolean) =>
	`transition-all duration-200 flex items-center space-x-2 px-4 rounded-full h-10 border border-gray-200 hover:border-input ${isActive ? "bg-accent hover:bg-accent/80 hover:text-accent-foreground" : "bg-white hover:bg-accent hover:text-accent-foreground"}`;

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
    hasUnsavedChanges,
    forceSyncToDatabase
  } = useTimeTracking();

  const runningTime = isDayStarted ? getTotalDayDuration() : 0;

  return (
    <>
      <NavigationMenu className="sticky top-0 left-0 right-0 mt-2 mx-auto container rounded-full border border-gray-200 hidden md:block z-40 print:hidden"
      style={{
        boxShadow:
          '0 4px 16px -8px rgba(0,0,0,0.10), 0 3px 12px -4px rgba(0,0,0,0.10), 0 2px 3px -2px rgba(0, 78, 194, 0.08)',
        background: 'rgba(255,255,255,0.80)'
      }}>
        <List className="flex items-center justify-between px-4 py-2 md:px-8 md:py-4 m-0 list-none rounded-md p-1 shadow-sm">
          <Item className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground flex">
              <Link
                to="/"
                className="flex items-center text-foreground hover:text-blue-700"
              >
                <img
                  src="icon.png"
                  alt="Logo"
                  className="w-8 h-8 sm:mr-2"
                />
                <span className="hidden lg:block">Timetraked</span>
              </Link>
            </h1>
            {isDayStarted && tasks.length > 0 && (
              <span className="ml-4 text-lg text-foreground font-bold inline-flex">
                <CalendarClock className="mr-1 text-foreground" />
                {formatDuration(runningTime)}
              </span>
            )}
          </Item>
          <div className="flex space-x-4">
            <Item>
              <SyncStatus
                isAuthenticated={isAuthenticated}
                lastSyncTime={lastSyncTime}
                isSyncing={isSyncing}
                hasUnsavedChanges={hasUnsavedChanges}
                onRefresh={forceSyncToDatabase}
              />
            </Item>
            {isAuthenticated && (
              <Item className="hidden md:flex">
                        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <NavLink to="/report" className={({ isActive }) => getNavLinkClasses(isActive)}>
                <Brain className="w-4 h-4" /></NavLink>
                </TooltipTrigger>
                <TooltipContent>
              Generate a Report
            </TooltipContent>
              </Tooltip>
              </TooltipProvider>
              </Item>
            )}
            <Item className="hidden md:flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handlePrint}
                      variant="outline"
                      className="flex items-center space-x-2"
                      >
                      <Printer className="w-4 h-4" />
                      {/* <span className="hidden lg:block">Print</span> */}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Print
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Item>
            <Item className="hidden md:flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <NavLink
                      to="/tasks"
                      className={({ isActive }) => getNavLinkClasses(isActive)}
                    >
                      <Kanban className="w-4 h-4" />
                      {/* <span className="hidden lg:block">Tasks</span> */}
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent>
                    Kanban Board
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Item>
            <Item className="hidden md:flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <NavLink
                      to="/settings"
                      className={({ isActive }) => getNavLinkClasses(isActive)}
                    >
                      <CogIcon className="w-4 h-4" />
                      {/* <span className="hidden lg:block">Settings</span> */}
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent>
                    Settings
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Item>
            <Item>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <UserMenu onSignInClick={() => setShowAuthDialog(true)} />
                  </TooltipTrigger>
                  <TooltipContent>
                    User Information
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
