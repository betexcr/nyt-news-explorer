export type Theme = "light" | "dark";
const KEY = "theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getStoredTheme(): Theme | null {
  const t = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  return t === "light" || t === "dark" ? t : null;
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, theme);
}

export function initTheme() {
  const stored = getStoredTheme();
  const initial: Theme = stored ?? (systemPrefersDark() ? "dark" : "light");
  applyTheme(initial);
  return initial;
}
