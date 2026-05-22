export const THEME_COOKIE = "theme";
export const THEME_STORAGE_KEY = "theme";

export type ThemePreference = "light" | "dark" | "system";

export function resolveThemeClass(
  preference: string | undefined,
  fallback: ThemePreference = "dark",
): "light" | "dark" {
  const pref =
    preference === "light" || preference === "dark" || preference === "system"
      ? preference
      : fallback;
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return "dark";
}

/** Client：依偏好與系統設定解析實際主題 */
export function resolveThemeClassClient(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference === "light" ? "light" : "dark";
}

export function themeCookieValue(preference: ThemePreference): string {
  return `${THEME_COOKIE}=${preference};path=/;max-age=31536000;SameSite=Lax`;
}
