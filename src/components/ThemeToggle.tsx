import React, { useEffect, useState } from "react";
import { getStoredTheme, setTheme, type Theme } from "../utils/theme";

const ThemeToggle: React.FC = () => {
  const [theme, setState] = useState<Theme>("light");

  useEffect(() => {
    const attr = typeof document !== 'undefined' 
      ? document.documentElement.getAttribute('data-theme') 
      : null;
    if (attr === 'light' || attr === 'dark') {
      setState(attr as Theme);
    } else {
      const stored = getStoredTheme();
      setState(stored ?? 'light');
    }
  }, []);

  const onToggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    setState(next);
  };

  return (
    <button
      type="button"
      className="button"
      aria-label="Toggle color theme"
      aria-pressed={theme === "dark"}
      onClick={onToggle}
      style={{ minWidth: 44 }}
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
};

export default ThemeToggle;
