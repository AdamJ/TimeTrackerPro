import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserLock, LogOut, UserCircle, LockOpenIcon, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from './ui/sidebar';

interface UserMenuProps {
  onSignInClick: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onSignInClick }) => {
  const { user, signOut, isAuthenticated } = useAuth();
  const { isMobile } = useSidebar()
  const handleSignOut = async () => {
    await signOut();
  };

  if (!isAuthenticated) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={onSignInClick}
          className="hover:cursor-pointer"
        >
          <UserLock className="h-4 w-4" />
          <span className="d-none">Sign In</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:cursor-pointer"
          >
            <UserCircle className="size-4" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.email}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side={isMobile ? "bottom" : "right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <UserCircle className="size-4" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                {/*<span className="truncate font-medium">{user?.id}</span>*/}
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {/*<DropdownMenuLabel>
              <LockOpenIcon className="size-4" />
              <span className="truncate text-xs text-muted-foreground">{user?.id}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />*/}
            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center gap-2 hover:cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};
