import { useEffect } from "react";

/**
 * Toggles the global `.spicy-mode` class on <html>, which triggers the
 * 800ms cross-fade into the luxury crimson + gold palette.
 */
export function useSpicyTheme(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add("spicy-mode");
    return () => { root.classList.remove("spicy-mode"); };
  }, [active]);
}
