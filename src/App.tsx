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
import { Suspense, lazy } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { MobileNav } from "@/components/MobileNav";
import { AppSidebar } from "@/components/AppSidebar";
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
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "19rem" } as React.CSSProperties}
    >
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
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
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
      </SidebarInset>
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
          </TooltipProvider>
        </PageTitleProvider>
      </TimeTrackingProvider>
    </AuthProvider>
  </OfflineProvider>
);

export default App;
