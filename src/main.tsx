// Global styles first, so component styles can build on them.
import "./styles/tokens.css";
import "./styles/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { createSettingsStorage } from "./settings/storage";
import { openSettingsStore } from "./settings/tauriStore";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

const storage = createSettingsStorage(openSettingsStore);

createRoot(root).render(
  <StrictMode>
    <App storage={storage} />
  </StrictMode>,
);
