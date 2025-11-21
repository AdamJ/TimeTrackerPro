import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Archive, FolderKanban, Settings } from "lucide-react";

export const MobileNav = memo(function MobileNav() {
	const location = useLocation();

	const isActive = (path: string) => {
		return location.pathname === path;
	};

	const navItems = [
		{
			path: "/",
			icon: Home,
			label: "Home"
		},
		{
			path: "/archive",
			icon: Archive,
			label: "Archive"
		},
		{
			path: "/projects",
			icon: FolderKanban,
			label: "Projects"
		},
		{
			path: "/settings",
			icon: Settings,
			label: "Settings"
		}
	];

	return (
		<nav
			className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-40 safe-area-inset-bottom"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			<div className="grid grid-cols-4 h-16">
				{navItems.map(({ path, icon: Icon, label }) => (
					<Link
						key={path}
						to={path}
						className={`flex flex-col items-center justify-center space-y-1 transition-colors touch-manipulation ${
							isActive(path)
								? "text-primary"
								: "text-gray-500 hover:text-gray-700"
						}`}
						aria-label={label}
						aria-current={isActive(path) ? "page" : undefined}
					>
						<Icon className="h-5 w-5" />
						<span className="text-xs font-medium">{label}</span>
					</Link>
				))}
			</div>
		</nav>
	);
});
