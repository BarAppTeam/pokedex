import { Moon, Sun } from "lucide-react";
import type { ThemeMode } from "../types";

interface AppHeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function AppHeader({ theme, onToggleTheme }: AppHeaderProps) {
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Trainer field guide</p>
        <h1>Pokédex</h1>
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label={`Switch to ${nextTheme} mode`}
        title={`Switch to ${nextTheme} mode`}
        onClick={onToggleTheme}
      >
        {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>
    </header>
  );
}
