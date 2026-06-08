import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserCheck, UserLock, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  onSignInClick: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onSignInClick }) => {
  const { user, signOut, isAuthenticated } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!isAuthenticated) {
    return (
      <a
        onClick={onSignInClick}
        className="transition-all duration-200 flex items-center space-x-2 px-4 rounded-full h-10 border border-gray-200 hover:border-input bg-white hover:bg-accent hover:text-accent-foreground"
      >
        <UserLock className="h-4 w-4" />
      </a>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <DropdownMenuItem>
          <UserCheck className="w-4 h-4 mr-2" />
          <span className="hidden lg:block">{user?.email}</span>
        </DropdownMenuItem>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuItem>
          Signed in as <br />
          <span className="font-medium">{user?.id}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
