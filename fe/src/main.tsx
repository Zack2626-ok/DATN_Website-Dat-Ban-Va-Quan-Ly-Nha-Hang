import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "react-hot-toast";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster 
      position="top-right" 
      toastOptions={{
        duration: 3500,
        style: {
          background: "#1C1815",
          color: "#FFFFFF",
          border: "1px solid rgba(223, 176, 91, 0.35)",
          boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.5)",
          borderRadius: "16px",
          padding: "12px 18px",
          fontSize: "13px",
          fontWeight: 600,
        },
        success: {
          iconTheme: {
            primary: "#dfb05b",
            secondary: "#1C1815",
          },
        },
        error: {
          iconTheme: {
            primary: "#f43f5e",
            secondary: "#1C1815",
          },
        },
      }}
    />
  </React.StrictMode>,
);
