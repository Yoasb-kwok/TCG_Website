"use client";

import {
  resolveThemeClassClient,
  THEME_STORAGE_KEY,
  themeCookieValue,
  type ThemePreference,
} from "@/lib/theme-preference";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  initialResolved = "dark",
  enableSystem = true,
}: {
  children: ReactNode;
  defaultTheme?: ThemePreference;
  initialResolved?: "light" | "dark";
  enableSystem?: boolean;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    initialResolved,
  );
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    let stored: ThemePreference = defaultTheme;
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
      if (
        raw === "light" ||
        raw === "dark" ||
        (raw === "system" && enableSystem)
      ) {
        stored = raw;
        document.cookie = themeCookieValue(raw);
      }
    } catch {
      /* ignore */
    }
    const resolved = resolveThemeClassClient(
      stored === "system" && !enableSystem ? "dark" : stored,
    );
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    setMounted(true);
  }, [defaultTheme, enableSystem]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const resolved = resolveThemeClassClient(
      theme === "system" && !enableSystem ? "dark" : theme,
    );
    setResolvedTheme(resolved);
    applyTheme(resolved);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      document.cookie = themeCookieValue(theme);
    } catch {
      /* ignore */
    }
  }, [theme, mounted, enableSystem]);

  useLayoutEffect(() => {
    if (!mounted || !enableSystem || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const resolved = resolveThemeClassClient("system");
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, mounted, enableSystem]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
