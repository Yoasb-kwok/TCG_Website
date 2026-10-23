"use client";

import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/providers/theme-provider";

interface ThemeToggleProps {
  className?: string;
  /** Header glyph from the storefront frame. Stays the moon mark on the black bar. */
  appearance?: "default" | "ink";
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function InkThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a24a] ${className}`}
      aria-label={isDark ? "切換至淺色模式" : "切換至深色模式"}
    >
      <Image src="/brand/home/icon-moon.svg" alt="" width={22} height={22} unoptimized />
    </button>
  );
}

export function ThemeToggle({ className = "", appearance = "default" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  if (appearance === "ink") {
    return <InkThemeToggle className={className} />;
  }

  if (!hydrated) {
    return (
      <button
        type="button"
        className={`p-2 text-muted-foreground ${className}`}
        aria-label="切換主題"
      >
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground ${className}`}
      aria-label={isDark ? "切換至淺色模式" : "切換至深色模式"}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
