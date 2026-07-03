import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import { PageTitleProvider } from "@/contexts/PageTitleContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useElectronMenuActions } from "@/hooks/useElectronMenuActions";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Suspense, lazy, useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { BackgroundTimerNotifier } from "@/components/BackgroundTimerNotifier";
import { TimerLiveRegion } from "@/components/TimerLiveRegion";
import { MobileNav } from "@/components/MobileNav";
import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "./components/ui/separator";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Archive = lazy(() => import("./pages/Archive"));
const ProjectList = lazy(() => import("./pages/ProjectList"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Categories = lazy(() => import("./pages/Categories"));
const Clients = lazy(() => import("./pages/Clients"));
const Report = lazy(() => import("./pages/Report"));
const TaskList = lazy(() => import("./pages/TaskList"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
)

// Redirects unauthenticated users to home
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppShell = () => {
  const { title, actions, badge } = usePageTitle();
  const { forceSyncToDatabase } = useTimeTracking();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const openCommandPalette = () => setShowCommandPalette(true);
  const openShortcutsHelp = () => setShowShortcutsHelp(true);

  useElectronMenuActions({
    onSave: forceSyncToDatabase,
    onOpenCommandPalette: openCommandPalette,
    onOpenShortcutsHelp: openShortcutsHelp,
  });
  useKeyboardShortcuts({
    onSave: forceSyncToDatabase,
    onOpenCommandPalette: openCommandPalette,
    onOpenShortcutsHelp: openShortcutsHelp,
  });

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "19rem" } as React.CSSProperties}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{title}</h1>
          {badge}
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={openShortcutsHelp}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="size-4" />
            </Button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/projectlist" element={<ProjectList />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <Report />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </SidebarInset>
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        onSave={forceSyncToDatabase}
      />
      <KeyboardShortcutsDialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp} />
    </SidebarProvider>
  );
};

const App = () => (
  <OfflineProvider>
    <AuthProvider>
      <TimeTrackingProvider>
        <PageTitleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <AppShell />
                <MobileNav />
              </Suspense>
            </BrowserRouter>
            <InstallPrompt />
            <PwaUpdatePrompt />
            <BackgroundTimerNotifier />
            <TimerLiveRegion />
          </TooltipProvider>
        </PageTitleProvider>
      </TimeTrackingProvider>
    </AuthProvider>
  </OfflineProvider>
);

export default App;
