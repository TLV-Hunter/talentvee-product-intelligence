import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "../app/connector-controls.css";
import "../app/backup-controls.css";
import "./static.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <aside className="github-pages-notice">
      <strong>GitHub Pages · Free</strong>
      <span>ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้</span>
      <small>ก่อนย้ายเครื่อง ให้กด “ดาวน์โหลด Full Backup”</small>
    </aside>
    <Home />
  </React.StrictMode>,
);
