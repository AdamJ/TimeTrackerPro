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
      <Button
        variant="outline"
        onClick={onSignInClick}
        className="flex items-center gap-2"
      >
        <UserLock className="h-4 w-4" />
        <span className="hidden sm:block">Sign In</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span className="hidden md:block">{user?.email}</span>
        </Button>
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
