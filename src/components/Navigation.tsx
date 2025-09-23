import React, { useState } from 'react';
import {
  NavigationMenu,
  List,
  Item,
  Viewport
} from '@radix-ui/react-navigation-menu';
import { Button } from '@/components/ui/button';
import { ExportDialog } from '@/components/ExportDialog';
import { ProjectManagement } from '@/components/ProjectManagement';
import { ArchiveEditDialog } from '@/components/ArchiveEditDialog';
import { Link } from 'react-router-dom';
import { CogIcon, ArchiveIcon, Briefcase, ProjectorIcon } from 'lucide-react';
import { DayRecord } from '@/contexts/TimeTrackingContext';
import { NavLink } from 'react-router-dom';

const SiteNavigationMenu = () => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
    <NavigationMenu className="relative bg-gradient-to-br from-gray-50 to-blue-50">
      <List className="flex items-center justify-between px-8 py-4 m-0 list-none rounded-md bg-white p-1 shadow-sm">
        <Item className="sm:flex items-center justify-between space-x-2 hidden">
          <h1 className="text-2xl font-bold text-gray-900">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-900 hover:text-blue-700 print:hidden"
            >
              TimeTracker
            </Link>
          </h1>
        </Item>
        <Item className="sm:hidden items-center justify-between space-x-2">
          <img src="favicon.ico" alt="Logo" className="w-8 h-8" />
        </Item>
        <div className="flex space-x-4">
          <Item>
            <NavLink
                to="/projectlist"
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input ... ${isActive ? 'bg-blue-200 hover:bg-accent hover:text-accent-foreground' : 'bg-white'}`
                }
              >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:block">Projects</span>
            </NavLink>
          </Item>
          <Item>
            <NavLink
              to="/archive"
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input ... ${isActive ? 'bg-blue-200 hover:bg-accent hover:text-accent-foreground' : 'bg-white'}`
                }
            >
              <ArchiveIcon className="w-4 h-4" />
              <span className="hidden sm:block">Archive</span>
            </NavLink>
          </Item>
          <Item>
            <NavLink
              to="/settings"
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 rounded-md h-10 bg-white border border-gray-200 hover:bg-accent hover:accent-foreground hover:border-input ... ${isActive ? 'bg-blue-200 hover:bg-accent hover:text-accent-foreground' : 'bg-white'}`
                }
            >
              <CogIcon className="w-4 h-4" />
              <span className="hidden sm:block">Settings</span>
            </NavLink>
          </Item>
        </div>
      </List>

      <div className="perspective-[2000px] absolute left-0 top-full flex w-full justify-center">
        <Viewport className="relative mt-2.5 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-[top_center] overflow-hidden rounded-md bg-white transition-[width,_height] duration-300 data-[state=closed]:animate-scaleOut data-[state=open]:animate-scaleIn sm:w-[var(--radix-navigation-menu-viewport-width)]" />
      </div>
    </NavigationMenu>

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
