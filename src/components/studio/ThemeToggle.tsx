"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* storage unavailable */ }
  };
  return (
    <button className="tb theme" onClick={toggle} aria-label="Toggle light and dark theme">
      <Sun className="ic sun" size={16} aria-hidden />
      <Moon className="ic moon" size={16} aria-hidden />
    </button>
  );
}
