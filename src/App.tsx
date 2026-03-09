import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DashboardOM from "./pages/DashboardOM";
import DashboardPracas from "./pages/DashboardPracas";
import DashboardTTC from "./pages/DashboardTTC";
import AdminUsers from "./pages/AdminUsers";
import Solicitacoes from "./pages/Solicitacoes";
import AdminSolicitacoes from "./pages/AdminSolicitacoes";
import AdminHistorico from "./pages/AdminHistorico";
import Install from "./pages/Install";
import Manual from "./pages/Manual";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2min, no refetch on navigation
      gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache for 10min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
          <Route path="/dashboard-om" element={<AuthGuard><DashboardOM /></AuthGuard>} />
          <Route path="/dashboard-pracas" element={<AuthGuard><DashboardPracas /></AuthGuard>} />
          <Route path="/dashboard-ttc" element={<AuthGuard><DashboardTTC /></AuthGuard>} />
          <Route path="/admin/users" element={<AuthGuard><AdminUsers /></AuthGuard>} />
          <Route path="/solicitacoes" element={<AuthGuard><Solicitacoes /></AuthGuard>} />
          <Route path="/admin/solicitacoes" element={<AuthGuard><AdminSolicitacoes /></AuthGuard>} />
          <Route path="/admin/historico" element={<AuthGuard><AdminHistorico /></AuthGuard>} />
          <Route path="/install" element={<Install />} />
          <Route path="/manual" element={<Manual />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
