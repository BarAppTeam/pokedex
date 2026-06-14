import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "../constants";
import type { ThemeMode } from "../types";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme(): void {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}

function getInitialTheme(): ThemeMode {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
