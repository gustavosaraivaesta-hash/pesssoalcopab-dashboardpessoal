import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, Apple, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";
import brasaoRepublica from "@/assets/brasao-republica.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detectar dispositivo
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="text-center">
            <img src={brasaoRepublica} alt="Brasão" className="w-20 h-20 mx-auto mb-4" />
            <CardTitle className="text-2xl text-white">App Instalado!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-white/80">
              O Dashboard COpAb já está instalado no seu dispositivo.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Acessar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center">
          <img src={brasaoRepublica} alt="Brasão" className="w-20 h-20 mx-auto mb-4" />
          <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
            <Download className="h-6 w-6" />
            Instalar Dashboard COpAb
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instruções para iOS */}
          {isIOS && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <Apple className="h-8 w-8 text-white" />
                <span className="text-lg font-semibold">iPhone / iPad</span>
              </div>
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <p className="text-white/90 font-medium">Siga os passos abaixo:</p>
                <ol className="text-white/80 space-y-2 list-decimal list-inside">
                  <li>Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra do Safari</li>
                  <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                  <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
                </ol>
                <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
                  <p className="text-blue-200 text-sm">
                    💡 O app aparecerá como um ícone na sua tela inicial e funcionará como um aplicativo nativo!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instruções para Android */}
          {isAndroid && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <Smartphone className="h-8 w-8 text-green-400" />
                <span className="text-lg font-semibold">Android</span>
              </div>
              {deferredPrompt ? (
                <Button onClick={handleInstallClick} className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Instalar Agora
                </Button>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 space-y-3">
                  <p className="text-white/90 font-medium">Siga os passos abaixo:</p>
                  <ol className="text-white/80 space-y-2 list-decimal list-inside">
                    <li>Toque no menu <strong>⋮</strong> (três pontos) no canto superior do Chrome</li>
                    <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></li>
                    <li>Confirme tocando em <strong>"Instalar"</strong></li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Instruções para Desktop */}
          {!isIOS && !isAndroid && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <Monitor className="h-8 w-8 text-blue-400" />
                <span className="text-lg font-semibold">Computador</span>
              </div>
              {deferredPrompt ? (
                <Button onClick={handleInstallClick} className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Instalar Agora
                </Button>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 space-y-3">
                  <p className="text-white/90 font-medium">No Chrome:</p>
                  <ol className="text-white/80 space-y-2 list-decimal list-inside">
                    <li>Clique no ícone de <strong>instalação</strong> na barra de endereço (ícone de computador com seta)</li>
                    <li>Ou clique no menu <strong>⋮</strong> e selecione <strong>"Instalar Dashboard COpAb"</strong></li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-white/10">
            <Button 
              variant="outline" 
              onClick={() => navigate("/login")} 
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Continuar no navegador
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
