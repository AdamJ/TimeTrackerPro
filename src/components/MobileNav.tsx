import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import {
  Home,
  Archive,
  Settings,
  PaperclipIcon,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const MobileNav = memo(function MobileNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

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
    ...(isAuthenticated
      ? [
          {
            path: "/report",
            icon: PaperclipIcon,
            label: "Report"
          }
        ]
      : []),
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
      className="fixed bottom-0 left-0 right-0 mb-2 mx-2 rounded-full border border-border bg-card/80 shadow-lg md:hidden z-40 print:hidden"
      style={{
        padding: "max(env(safe-area-inset-bottom, 8px), 8px)"
      }}
    >
      <div className={`grid ${gridClass} h-12`}>
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className="relative flex flex-col items-center justify-center space-y-1 transition-colors touch-manipulation text-muted-foreground hover:text-foreground"
            aria-label={label}
            aria-current={isActive(path) ? "page" : undefined}
          >
            {isActive(path) && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
            <span className={`relative z-10 ${isActive(path) ? "text-primary" : ""}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className={`relative z-10 text-xs font-medium ${isActive(path) ? "text-primary" : ""}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
});
