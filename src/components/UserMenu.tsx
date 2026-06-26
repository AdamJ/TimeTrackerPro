import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserLock, LogOut, EllipsisVertical, UserCircle, LockOpenIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SidebarMenuButton, useSidebar } from './ui/sidebar';

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
      <Button
        variant="outline"
        onClick={onSignInClick}
        className="rounded-xl h-10 hover:cursor-pointer"
      >
        <UserLock className="h-4 w-4" />
        <span>Sign In</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:cursor-pointer"
        >
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user?.email}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
          <EllipsisVertical className="ml-auto size-4" />
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
          <DropdownMenuItem>
            <LockOpenIcon className="size-4" />
            <span className="truncate text-xs text-muted-foreground">{user?.id}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
  );
};
