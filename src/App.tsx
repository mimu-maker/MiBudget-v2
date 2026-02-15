
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { LocalAuthProvider } from "./contexts/LocalAuthContext";
import { UnifiedAuthProvider } from "./contexts/UnifiedAuthContext";
import { PeriodProvider } from "./contexts/PeriodContext";
import { TransactionUndoProvider } from "./contexts/TransactionUndoContext";
import { TransactionUndoOverlay } from "./components/Transactions/TransactionUndoOverlay";
import { ThemeProvider } from "./components/ThemeProvider";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import { AuthSwitcher } from "./components/Auth/AuthSwitcher";
import { LocalLogin } from "./components/Auth/LocalLogin";
import { useState, useEffect } from "react";
import { useUnifiedAuth } from "./contexts/UnifiedAuthContext";

import { Sidebar } from "./components/Sidebar";
import { OverviewTabs } from "./components/Overview/OverviewTabs";
import Budget from "./pages/Budget";
import Transactions from "./pages/Transactions";
import Reconciliation from "./pages/Reconciliation";
import { ValidationDashboard } from "./components/Transactions/ValidationDashboard";
import Projection from "./pages/Projection";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { ConnectionStatus } from "./components/ConnectionStatus";

const queryClient = new QueryClient();

const AppLayout = () => {
  const { user } = useUnifiedAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {user && <Sidebar />}
      <div className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <OverviewTabs />
            </ProtectedRoute>
          } />
          <Route path="/flow" element={
            <ProtectedRoute>
              <OverviewTabs defaultTab="flow" />
            </ProtectedRoute>
          } />
          <Route path="/special" element={
            <ProtectedRoute>
              <OverviewTabs defaultTab="special" />
            </ProtectedRoute>
          } />
          <Route path="/klintemarken" element={
            <ProtectedRoute>
              <OverviewTabs defaultTab="klintemarken" />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <OverviewTabs defaultTab="history" />
            </ProtectedRoute>
          } />
          <Route path="/budget" element={
            <ProtectedRoute>
              <Budget />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          } />
          <Route path="/transactions/validation" element={
            <ProtectedRoute>
              <ValidationDashboard />
            </ProtectedRoute>
          } />
          <Route path="/reconciliation" element={
            <ProtectedRoute>
              <Reconciliation />
            </ProtectedRoute>
          } />
          <Route path="/projection" element={
            <ProtectedRoute>
              <Projection />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
};

const AuthWrapper = () => {
  const [authMode, setAuthMode] = useState<'switcher' | 'local' | 'supabase'>('supabase');
  const [useLocal, setUseLocal] = useState(false);

  useEffect(() => {
    // Default to Supabase auth (Google) for production
    // Local auth is disabled for now
    setAuthMode('supabase');
    setUseLocal(false);
  }, []);

  const handleLocalAuth = () => {
    setAuthMode('local');
    setUseLocal(true);
    localStorage.setItem('authMode', 'local');
  };

  const handleSupabaseAuth = () => {
    setAuthMode('supabase');
    setUseLocal(false);
    localStorage.setItem('authMode', 'supabase');
  };

  // Always use Supabase auth (local auth disabled)
  return (
    <AuthProvider>
      <ProfileProvider>
        <UnifiedAuthProvider>
          <PeriodProvider>
            <TransactionUndoProvider>
              <ThemeProvider>
                <BrowserRouter>
                  <AppLayout />
                  <TransactionUndoOverlay />
                </BrowserRouter>
              </ThemeProvider>
            </TransactionUndoProvider>
          </PeriodProvider>
        </UnifiedAuthProvider>
      </ProfileProvider>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthWrapper />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
