import React from "react";
import ReactDOM from "react-dom/client";

import { i18nReady } from "./i18n";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Wait for i18next to be fully initialized before mounting React.
// All resources are bundled so this resolves almost instantly,
// but it guarantees useTranslation always has the instance ready.
i18nReady.then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
