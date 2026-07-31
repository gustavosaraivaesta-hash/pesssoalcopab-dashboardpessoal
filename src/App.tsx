import { lazy, Suspense, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";
import PdfPreviewHost from "./components/PdfPreviewHost";

// Retry dynamic imports once and force a hard reload if a stale chunk (post-deploy) fails.
function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const reloadedKey = `lazy-retry-${factory.toString()}`;
    try {
      const mod = await factory();
      window.sessionStorage.removeItem(reloadedKey);
      return mod;
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isChunkErr =
        msg.includes("Importing a module script failed") ||
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Loading chunk") ||
        msg.includes("error loading dynamically imported module");
      if (isChunkErr && !window.sessionStorage.getItem(reloadedKey)) {
        window.sessionStorage.setItem(reloadedKey, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

// Lazy load all pages for code splitting
const Index = lazyWithRetry(() => import("./pages/Index"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const DashboardOM = lazyWithRetry(() => import("./pages/DashboardOM"));
const DashboardPracas = lazyWithRetry(() => import("./pages/DashboardPracas"));
const DashboardTTC = lazyWithRetry(() => import("./pages/DashboardTTC"));
const CursosRealizados = lazyWithRetry(() => import("./pages/CursosRealizados"));
const AdminUsers = lazyWithRetry(() => import("./pages/AdminUsers"));
const Solicitacoes = lazyWithRetry(() => import("./pages/Solicitacoes"));
const AdminSolicitacoes = lazyWithRetry(() => import("./pages/AdminSolicitacoes"));
const AdminHistorico = lazyWithRetry(() => import("./pages/AdminHistorico"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const Manual = lazyWithRetry(() => import("./pages/Manual"));
const InspecaoSaude = lazyWithRetry(() => import("./pages/InspecaoSaude"));
const Aniversariantes = lazyWithRetry(() => import("./pages/Aniversariantes"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

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
      <PdfPreviewHost />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
            <Route path="/dashboard-om" element={<AuthGuard><DashboardOM /></AuthGuard>} />
            <Route path="/dashboard-pracas" element={<AuthGuard><DashboardPracas /></AuthGuard>} />
            <Route path="/dashboard-ttc" element={<AuthGuard><DashboardTTC /></AuthGuard>} />
            <Route path="/cursos-realizados" element={<AuthGuard><CursosRealizados /></AuthGuard>} />
            <Route path="/admin/users" element={<AuthGuard><AdminUsers /></AuthGuard>} />
            <Route path="/solicitacoes" element={<AuthGuard><Solicitacoes /></AuthGuard>} />
            <Route path="/admin/solicitacoes" element={<AuthGuard><AdminSolicitacoes /></AuthGuard>} />
            <Route path="/admin/historico" element={<AuthGuard><AdminHistorico /></AuthGuard>} />
            <Route path="/install" element={<Install />} />
            <Route path="/manual" element={<Manual />} />
            <Route path="/inspecao-saude" element={<AuthGuard><InspecaoSaude /></AuthGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
