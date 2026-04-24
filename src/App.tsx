import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import { useAuth } from "@/hooks/useAuth";
import { Suspense, lazy } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdateNotification } from "@/components/UpdateNotification";

const isIosBuild = import.meta.env.VITE_IOS_BUILD === "true";
import { MobileNav } from "@/components/MobileNav";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Archive = lazy(() => import("./pages/Archive"));
const ProjectList = lazy(() => import("./pages/ProjectList"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Categories = lazy(() => import("./pages/Categories"));
const Report = lazy(() => import("./pages/Report"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

// Redirects unauthenticated users to home
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <OfflineProvider>
    <AuthProvider>
      <TimeTrackingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/projectlist" element={<ProjectList />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <MobileNav />
            </Suspense>
          </HashRouter>
          {!isIosBuild && <InstallPrompt />}
          {!isIosBuild && <UpdateNotification />}
        </TooltipProvider>
      </TimeTrackingProvider>
    </AuthProvider>
  </OfflineProvider>
);

export default App;
