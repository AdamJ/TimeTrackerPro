import * as React from "react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Brain,
  CogIcon,
  Printer,
  CalendarClock,
  Kanban,
  FolderOpen,
  Tag,
  Users,
  Archive,
  Cog,
  LayoutDashboardIcon,
  Scale,
  Send,
  Bug,
} from "lucide-react"
import { AuthDialog } from "@/components/AuthDialog"
import { ExportDialog } from "@/components/ExportDialog"
import { UserMenu } from "@/components/UserMenu"
import { SyncStatus } from "@/components/SyncStatus"
import { formatDuration } from "@/utils/timeUtil"
import { getTotalDayDuration } from "@/utils/calculationUtils"
import { useAuth } from "@/hooks/useAuth"
import { useTimeTracking } from "@/hooks/useTimeTracking"
import { useCurrentTime } from "@/hooks/useCurrentTime"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navItems = {
  navMain: [
    {
      title: "Planning",
      to: "",
      items: [
        {
          title: "Tasks",
          to: "/tasks",
          icon: Kanban
        }
      ]
    },
    {
      title: "Configuration",
      to: "#",
      icon: Cog,
      items: [
        {
          title: "Projects",
          to: "/projectlist",
          icon: FolderOpen
        },
        {
          title: "Categories",
          to: "/categories",
          icon: Tag
        },
        {
          title: "Clients",
          to: "/clients",
          icon: Users
        },
        {
          title: "Archive",
          to: "/archive",
          icon: Archive
        },
        {
          title: "Settings",
          to: "/settings",
          icon: CogIcon
        }
      ]
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const { pathname } = useLocation()

  const { isAuthenticated } = useAuth()
  const {
    isDayStarted,
    tasks,
    currentTask,
    isSyncing,
    lastSyncTime,
    hasUnsavedChanges,
    forceSyncToDatabase,
  } = useTimeTracking()
  const now = useCurrentTime()

  const runningTime = isDayStarted ? getTotalDayDuration(tasks, currentTask, now) : 0

  return (
    <>
      <Sidebar variant="floating" collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex aspect-square size-4 items-center rounded-lg text-sidebar-primary-foreground">
                    <img src="icon.png" alt="" aria-hidden="true" className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Timetraked</span>
                    {isDayStarted && tasks.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="size-3" />
                        {formatDuration(runningTime)}
                      </span>
                    )}
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/"}>
                    <Link to="/">
                      <LayoutDashboardIcon />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {navItems.navMain.map((item) => (
            <SidebarGroup key={item.title}>
              <SidebarGroupLabel>
                {item.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {item.items?.map((subItem) => (
                    <SidebarMenuItem key={subItem.to}>
                      <SidebarMenuButton asChild isActive={pathname === subItem.to}>
                        <Link to={subItem.to}>
                          <subItem.icon />
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
          {isAuthenticated && (
            <SidebarGroup>
              <SidebarGroupLabel>Reporting</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/report"}>
                      <Link to="/report">
                        <Brain />
                        <span>Weekly Report</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {!isAuthenticated && (
            <SidebarGroup>
              <SidebarGroupLabel>Support</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="https://github.com/AdamJ/TimeTrackerPro/issues/new?template=bug_report.md" target="_blank" rel="noopener noreferrer">
                        <Bug />
                        <span>Report a Bug</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="https://github.com/AdamJ/TimeTrackerPro/issues/new?template=feature_request.md" target="_blank" rel="noopener noreferrer">
                        <Send />
                        <span>Request a Feature</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="https://github.com/AdamJ/TimeTrackerPro/security/policy" target="_blank" rel="noopener noreferrer">
                        <Scale />
                        <span>Security Policy</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          </SidebarContent>

        <SidebarFooter>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => window.print()} className="hover:cursor-pointer">
                <Printer />
                <span>Print</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SyncStatus
              isAuthenticated={isAuthenticated}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
              hasUnsavedChanges={hasUnsavedChanges}
              onRefresh={forceSyncToDatabase}
            />
            <UserMenu onSignInClick={() => setShowAuthDialog(true)} />
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
      />
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </>
  )
}
