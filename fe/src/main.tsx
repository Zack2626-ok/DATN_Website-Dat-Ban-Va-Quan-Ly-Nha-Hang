import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppToaster } from "./components/common/toast/AppToaster";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <AppToaster />
  </React.StrictMode>,
);
