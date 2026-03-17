"use client";

import { useEffect } from "react";

const THEME_KEY = "theme";

export default function ThemeInitializer() {
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const theme = stored === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  return null;
}
