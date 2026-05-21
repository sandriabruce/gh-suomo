export const SPICY_MODE_STORAGE_KEY = "spicy-mode:active:v1";
export const SPICY_MODE_EVENT = "spicy-mode-change";
export const SPICY_MODE_CSS_ID = "spicy-mode-runtime-theme";
export const SPICY_MODE_CSS_VERSION = "spicy-crimson-20260521";

const SPICY_MODE_CSS = `
html.spicy-mode,
html.spicy-mode body {
  transition: background 0.8s ease, color 0.8s ease !important;
}

html.spicy-mode {
  --background: #1A0000 !important;
  --card: #2D0A0A !important;
  --primary: #C9A84C !important;
  --foreground: #F5E6D3 !important;
  --border: #8B0000 !important;
}

html.spicy-mode body {
  background: linear-gradient(135deg, #1A0000 0%, #2D0000 100%) !important;
  min-height: 100vh !important;
  color: #F5E6D3 !important;
}

html.spicy-mode #root {
  min-height: 100vh !important;
  background: transparent !important;
}

html.spicy-mode .bg-background,
html.spicy-mode [class*="bg-background"] {
  background-color: #1A0000 !important;
}

html.spicy-mode .bg-card,
html.spicy-mode [class*="bg-card"] {
  background-color: #2D0A0A !important;
}

html.spicy-mode .bg-primary,
html.spicy-mode [class*="bg-primary"] {
  background-color: #C9A84C !important;
}

html.spicy-mode .text-foreground,
html.spicy-mode [class*="text-foreground"] {
  color: #F5E6D3 !important;
}

html.spicy-mode .text-primary,
html.spicy-mode [class*="text-primary"] {
  color: #C9A84C !important;
}

html.spicy-mode .border-border,
html.spicy-mode [class*="border-border"] {
  border-color: #8B0000 !important;
}
`;

export function readStoredSpicyMode(): boolean {
  try {
    return window.localStorage.getItem(SPICY_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function ensureSpicyStyleTag() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(SPICY_MODE_CSS_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = SPICY_MODE_CSS_ID;
    style.setAttribute("data-version", SPICY_MODE_CSS_VERSION);
    document.head.appendChild(style);
  }
  if (style.textContent !== SPICY_MODE_CSS) style.textContent = SPICY_MODE_CSS;
}

function paintSpicyBody() {
  if (typeof document === "undefined" || !document.body) return;
  document.body.style.background = "linear-gradient(135deg, #1A0000 0%, #2D0000 100%)";
  document.body.style.minHeight = "100vh";
}

export function applySpicyRuntimeTheme(active: boolean) {
  if (typeof document === "undefined") return;
  ensureSpicyStyleTag();
  document.documentElement.classList.toggle("spicy-mode", active);

  if (!active) {
    document.documentElement.style.removeProperty("--background");
    document.documentElement.style.removeProperty("--card");
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--foreground");
    document.documentElement.style.removeProperty("--border");
    if (document.body) {
      document.body.style.removeProperty("background");
      document.body.style.removeProperty("min-height");
    }
    return;
  }

  document.documentElement.style.setProperty("--background", "#1A0000");
  document.documentElement.style.setProperty("--card", "#2D0A0A");
  document.documentElement.style.setProperty("--primary", "#C9A84C");
  document.documentElement.style.setProperty("--foreground", "#F5E6D3");
  document.documentElement.style.setProperty("--border", "#8B0000");
  paintSpicyBody();
}

export function bootstrapStoredSpicyMode() {
  if (readStoredSpicyMode()) applySpicyRuntimeTheme(true);
}