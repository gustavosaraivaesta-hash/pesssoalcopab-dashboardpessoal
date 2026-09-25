import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import brasaoCopab from "@/assets/brasao-copab.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import backgroundImage from "@/assets/military-background.png";

// Convert username to email format for Supabase Auth
const usernameToEmail = (username: string): string => {
  const normalizedUsername = username.trim().toLowerCase();
  return `${normalizedUsername}@copab.marinha.mil.br`;
};

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      // Evita travar indefinidamente em conexões lentas
      const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
        let t: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            promise,
            new Promise<T>((resolve) => {
              t = setTimeout(() => resolve(fallback), ms);
            }),
          ]);
        } finally {
          if (t) clearTimeout(t);
        }
      };

      try {
        type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;
        const result = await withTimeout<GetSessionResult>(
          supabase.auth.getSession(),
          6000,
          { data: { session: null }, error: null } as GetSessionResult,
        );

        const session = result.data?.session ?? null;
        if (session) navigate("/");
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const withTimeoutReject = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        let t: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
              t = setTimeout(() => reject(new Error("Timeout")), ms);
            }),
          ]);
        } finally {
          if (t) clearTimeout(t);
        }
      };

      // Convert username to email format (case-insensitive)
      const email = usernameToEmail(username);
      
      // Convert password to uppercase for case-insensitive comparison
      const normalizedPassword = password.toUpperCase();
      
      const { data, error } = await withTimeoutReject(
        supabase.auth.signInWithPassword({
          email,
          password: normalizedPassword,
        }),
        15000,
      );

      if (error) {
        console.error("Login error:", error);
        toast.error(error.message || "Erro ao fazer login");
        return;
      }

      if (data.user) {
        toast.success("Login realizado com sucesso!");
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login (verifique conexão/credenciais)");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="fixed inset-0 bg-gradient-military/90" />
      <div className="surface-grid fixed inset-0 opacity-10" />

      <main className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-lg border border-primary-foreground/15 bg-card shadow-elevated lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[610px] flex-col justify-between overflow-hidden bg-gradient-military p-10 text-primary-foreground lg:flex">
          <div className="surface-grid absolute inset-0 opacity-10" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-primary-foreground/20 bg-primary-foreground/10">
              <img src={brasaoCopab} alt="Brasão COpAb" className="h-12 w-auto" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-primary-foreground/70">Marinha do Brasil</p>
              <p className="font-display text-lg font-semibold">Centro de Operações do Abastecimento</p>
            </div>
          </div>

          <div className="relative max-w-md">
            <div className="mb-6 h-1 w-14 rounded-full bg-warning" />
            <h1 className="font-display text-4xl font-bold leading-tight">Gestão de pessoal com visão operacional.</h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-primary-foreground/75">
              Informações consolidadas para acompanhamento do efetivo, distribuição e prontidão das organizações militares.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-sm text-primary-foreground/65">
            <ShieldCheck className="h-4 w-4 text-warning" />
            Ambiente institucional de acesso restrito
          </div>
        </section>

        <Card className="flex min-h-[560px] flex-col justify-center rounded-none border-0 bg-card px-2 py-8 shadow-none sm:px-8 lg:min-h-[610px]">
          <CardHeader className="pb-7 text-left">
            <div className="mb-3 flex items-center gap-3 lg:hidden">
              <img src={brasaoCopab} alt="Brasão COpAb" className="h-14 w-auto" />
              <span className="text-xs font-bold uppercase text-primary">COpAb · Marinha do Brasil</span>
            </div>
            <p className="text-xs font-bold uppercase text-accent">Acesso institucional</p>
            <CardTitle className="text-3xl text-foreground">Dashboard COpAb</CardTitle>
            <CardDescription className="max-w-sm leading-relaxed">
              Entre com suas credenciais para acessar a análise do pessoal militar e civil.
            </CardDescription>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-semibold text-foreground">
                Login
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu login (ex: COPAB)"
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="pr-11"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              size="lg"
              className="mt-2 w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
