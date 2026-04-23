import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const shouldClearPreviewCache =
  import.meta.env.DEV || window.location.hostname.includes("id-preview--");

if (shouldClearPreviewCache && "serviceWorker" in navigator) {
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
