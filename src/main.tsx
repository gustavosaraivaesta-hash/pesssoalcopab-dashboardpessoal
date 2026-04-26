import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aplicar tema (visão noturna) o quanto antes para evitar "flash"
(() => {
  try {
    const stored = localStorage.getItem("dashboard-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : !!prefersDark;
    if (isDark) document.documentElement.classList.add("dark");
  } catch {}
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });

    if ("caches" in window) {
      void caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          void caches.delete(cacheName);
        });
      });
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
