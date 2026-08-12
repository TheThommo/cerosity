import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Simple, stable root rendering without debug overhead
const renderApp = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element #root not found');
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
};

// Installability only. Registered after load and deliberately never awaited:
// if the worker fails to register, the app must still render normally.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}

// Execute with minimal error handling
try {
  renderApp();
} catch (error: any) {
  console.error('Failed to render application:', error);
  
  // Simple fallback error display
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h2>Application Failed to Load</h2>
        <p><strong>Error:</strong> ${error.message}</p>
        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px;">
          Reload Application
        </button>
      </div>
    `;
  }
}
