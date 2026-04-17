import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Cesium from "cesium";
import "./index.css";
import "./i18n";
import App from "./App";

const cesiumToken = import.meta.env.VITE_CESIUM_TOKEN ?? "";
if (!cesiumToken && import.meta.env.DEV) {
  console.warn(
    "[loko-map] VITE_CESIUM_TOKEN is not set. Cesium Ion assets (terrain, imagery) will not load. Set the token in your .env file.",
  );
}
Cesium.Ion.defaultAccessToken = cesiumToken;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
