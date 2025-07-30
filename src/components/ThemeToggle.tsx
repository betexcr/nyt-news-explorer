import React, { useEffect, useState } from "react";
import { initTheme, setTheme, type Theme } from "../utils/theme";

const ThemeToggle: React.FC = () => {
  const [theme, setState] = useState<Theme>("light");

  useEffect(() => {
    const t = initTheme();
    setState(t);
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
