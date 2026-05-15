import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Archive, Settings, PaperclipIcon, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHaptics } from "@/hooks/useHaptics";

export const MobileNav = memo(function MobileNav() {
	const location = useLocation();
	const { isAuthenticated } = useAuth();
	const { lightImpact } = useHaptics();

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
			path: "/tasks",
			icon: ClipboardList,
			label: "Tasks"
		},
		...(isAuthenticated ? [{
			path: "/report",
			icon: PaperclipIcon,
			label: "Report"
		}] : []),
		{
			path: "/archive",
			icon: Archive,
			label: "Archive"
		},
		{
			path: "/settings",
			icon: Settings,
			label: "Settings"
		}
	];

	const gridClass =
		navItems.length <= 3
			? "grid-cols-3"
			: navItems.length === 4
				? "grid-cols-4"
				: "grid-cols-5";

	return (
		<nav
			className="fixed bottom-0 left-0 right-0 bg-background border-t border-border md:hidden z-40 mobile-nav-ios print:hidden"
			style={{
				paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)"
			}}
		>
			<div className={`grid ${gridClass} h-12`}>
				{navItems.map(({ path, icon: Icon, label }) => (
					<Link
						key={path}
						to={path}
						onClick={lightImpact}
						className={`flex flex-col items-center justify-center space-y-1 transition-colors touch-manipulation ${isActive(path)
								? "text-primary"
								: "text-muted-foreground hover:text-foreground"
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
