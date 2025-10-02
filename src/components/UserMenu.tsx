import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
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
			<Button variant="outline" onClick={onSignInClick} className="flex items-center gap-2">
				<User className="h-4 w-4" />
				Sign In
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="flex items-center gap-2">
					<User className="h-4 w-4" />
					{user?.email}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
					<LogOut className="h-4 w-4" />
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
