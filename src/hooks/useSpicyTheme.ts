import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "spicy-mode:active:v1";
const EVENT = "spicy-mode-change";

function applyClass(active: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("spicy-mode", active);
}

function readActive(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

/** Set Spicy Mode globally; persists across navigation + reloads. */
export function setSpicyModeActive(active: boolean) {
  try {
    if (active) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  applyClass(active);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
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
  useEffect(() => { applyClass(readActive()); }, []);
}
