import { useEffect, useSyncExternalStore } from "react";
import {
  SPICY_MODE_EVENT,
  SPICY_MODE_STORAGE_KEY,
  applySpicyRuntimeTheme,
  readStoredSpicyMode,
} from "@/lib/spicyRuntimeTheme";

function readActive(): boolean {
  return readStoredSpicyMode();
}

/** Set Spicy Mode globally; persists across navigation + reloads. */
export function setSpicyModeActive(active: boolean) {
  try {
    if (active) localStorage.setItem(SPICY_MODE_STORAGE_KEY, "1");
    else localStorage.removeItem(SPICY_MODE_STORAGE_KEY);
  } catch { /* ignore */ }
  applySpicyRuntimeTheme(active);
  window.dispatchEvent(new Event(SPICY_MODE_EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(SPICY_MODE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SPICY_MODE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Reactive read of the persisted spicy mode flag. */
export function useIsSpicyModeActive(): boolean {
  return useSyncExternalStore(subscribe, readActive, () => false);
}

/**
 * Activates `.spicy-mode` on <html> while the component is mounted AND
 * `active` is true. Also persists the flag so the theme survives navigation
 * and reloads — critical on mobile where users tab away from /app/spicy.
 */
export function useSpicyTheme(active: boolean) {
  useEffect(() => {
    if (!active) return;
    setSpicyModeActive(true);
  }, [active]);
}

/** Mount once at the app root to re-apply the persisted class on every load. */
export function useSpicyModeBootstrap() {
  useEffect(() => { applySpicyRuntimeTheme(readActive()); }, []);
}
