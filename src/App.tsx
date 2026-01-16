
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PeriodProvider } from "./contexts/PeriodContext";

import { Sidebar } from "./components/Sidebar";
import { OverviewTabs } from "./components/Overview/OverviewTabs";
import Budget from "./pages/Budget";
import Transactions from "./pages/Transactions";
import Projection from "./pages/Projection";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { ConnectionStatus } from "./components/ConnectionStatus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <PeriodProvider>
          <BrowserRouter>
            <div className="flex min-h-screen bg-gray-50">
              <Sidebar />
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<OverviewTabs />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/projection" element={<Projection />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </BrowserRouter>
        </PeriodProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
