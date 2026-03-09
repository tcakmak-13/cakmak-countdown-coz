import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./hooks/useTheme.tsx";
import App from "./App.tsx";
import SafeModeBoundary from "./components/SafeModeBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <SafeModeBoundary>
      <App />
    </SafeModeBoundary>
  </ThemeProvider>,
);
