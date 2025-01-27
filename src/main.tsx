import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { Toaster } from "sonner";

// Configure Toaster for better performance
const toasterProps = {
  richColors: true,
  closeButton: true,
  position: "top-left",
  // Reduce animation duration for better performance
  duration: 2000,
  // Use CSS transforms for better performance
  style: {
    transform: "translateZ(0)",
    willChange: "transform",
  },
} as const;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster {...toasterProps} />
  </React.StrictMode>
);
