import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Cesium from "cesium";
import "./index.css";
import i18n from "./i18n";
import App from "./App";

const cesiumToken = import.meta.env.VITE_CESIUM_TOKEN ?? "";

// Warn if no token for cesium
if (!cesiumToken && import.meta.env.DEV) {
  console.warn(
    "[loko-map] VITE_CESIUM_TOKEN is not set. Cesium Ion assets (terrain, imagery) will not load. Set the token in your .env file.",
  );
}

// Set cesium key
Cesium.Ion.defaultAccessToken = cesiumToken;

// Set default language
document.documentElement.lang = i18n.language.split("-")[0] ?? "fr";

// Change language if asked by user
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng.split("-")[0] ?? "fr";
});

// Render
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
