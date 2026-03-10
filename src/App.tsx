import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const DashboardOM = lazy(() => import("./pages/DashboardOM"));
const DashboardPracas = lazy(() => import("./pages/DashboardPracas"));
const DashboardTTC = lazy(() => import("./pages/DashboardTTC"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const Solicitacoes = lazy(() => import("./pages/Solicitacoes"));
const AdminSolicitacoes = lazy(() => import("./pages/AdminSolicitacoes"));
const AdminHistorico = lazy(() => import("./pages/AdminHistorico"));
const Install = lazy(() => import("./pages/Install"));
const Manual = lazy(() => import("./pages/Manual"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

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
