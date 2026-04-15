import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Cesium from "cesium";
import "./index.css";
import App from "./App";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN ?? "";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
