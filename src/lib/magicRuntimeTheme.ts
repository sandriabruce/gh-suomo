// ── Mannye's Magic Elite Theme ────────────────────────────────────
// Royal blue + deep gold — "Elite Cupid" look and feel.
// Applies html.magic-mode class, mirrors the spicy-mode architecture.

export const MAGIC_MODE_CSS_ID = "magic-mode-runtime-theme";
export const MAGIC_MODE_STORAGE_KEY = "magic-mode:active:v1";

const MAGIC_MODE_CSS = `
html.magic-mode,
html.magic-mode body,
html.magic-mode #root {
  transition: background 0.8s ease, color 0.8s ease, background-color 0.8s ease !important;
}

html.magic-mode {
  --background: 220 80% 6% !important;
  --foreground: 45 60% 92% !important;
  --card: 222 70% 10% !important;
  --card-foreground: 45 60% 92% !important;
  --popover: 222 65% 13% !important;
  --popover-foreground: 45 60% 92% !important;
  --primary: 45 80% 55% !important;
  --primary-foreground: 220 80% 6% !important;
  --secondary: 222 65% 13% !important;
  --secondary-foreground: 45 60% 92% !important;
  --muted: 222 60% 12% !important;
  --muted-foreground: 45 30% 72% !important;
  --accent: 51 100% 50% !important;
  --accent-foreground: 220 80% 6% !important;
  --border: 45 55% 32% !important;
  --input: 222 60% 14% !important;
  --ring: 45 80% 55% !important;
}

html.magic-mode body {
  background: linear-gradient(160deg,
    hsl(230 85% 16%) 0%,
    hsl(222 90% 10%) 40%,
    hsl(215 80% 6%) 100%) !important;
  background-color: hsl(220 80% 6%) !important;
  min-height: 100vh !important;
  color: hsl(45 60% 92%) !important;
}

html.magic-mode #root {
  min-height: 100vh !important;
  background: transparent !important;
}

html.magic-mode body::before {
  content: "MANNYE'S MAGIC";
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  font-weight: 800;
  font-size: clamp(2.5rem, 10vw, 7rem);
  letter-spacing: 0.1em;
  color: transparent;
  background: linear-gradient(180deg,
    hsl(48 95% 75%) 0%,
    hsl(45 80% 52%) 50%,
    hsl(36 70% 30%) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  opacity: 0.06;
  transform: rotate(-6deg);
  text-align: center;
  white-space: nowrap;
}

html.magic-mode body > * { position: relative; z-index: 1; }

html.magic-mode .bg-gradient-warm { background: transparent !important; }

html.magic-mode .bg-background,
html.magic-mode [class*="bg-background"] {
  background-color: hsl(220 80% 6%) !important;
  background-image: none !important;
}

html.magic-mode .bg-card,
html.magic-mode [class*="bg-card"] {
  background-color: hsl(222 70% 10%) !important;
}

html.magic-mode .bg-muted,
html.magic-mode [class*="bg-muted"] {
  background-color: hsl(222 60% 12%) !important;
}

html.magic-mode h1,
html.magic-mode h2,
html.magic-mode h3 {
  font-family: "Playfair Display", "Cormorant Garamond", ui-serif, Georgia, serif;
}

html.magic-mode .bg-ghana-gold {
  background: linear-gradient(180deg, hsl(48 95% 60%), hsl(42 80% 42%)) !important;
  color: hsl(220 80% 6%) !important;
  box-shadow:
    inset 0 1px 0 hsl(48 100% 85% / 0.6),
    0 8px 20px -8px hsl(45 90% 30% / 0.5) !important;
}

html.magic-mode .text-ghana-brown { color: hsl(220 80% 6%) !important; }

html.magic-mode nav.fixed {
  background: linear-gradient(180deg, hsl(222 80% 8% / 0.96), hsl(220 80% 5% / 0.98)) !important;
  border-top: 1px solid hsl(45 65% 38% / 0.4);
  backdrop-filter: blur(14px);
}

html.magic-mode nav.fixed a { color: hsl(220 20% 70%); }
html.magic-mode nav.fixed a.text-ghana-green {
  color: hsl(48 100% 60%);
  filter: drop-shadow(0 0 6px hsl(48 100% 50% / 0.5));
}

html.magic-mode header.sticky {
  background: linear-gradient(180deg, hsl(222 80% 10% / 0.92), hsl(220 80% 7% / 0.85)) !important;
  border-bottom-color: hsl(45 65% 38% / 0.35);
  backdrop-filter: blur(14px);
}

html.magic-mode [data-slot="card"],
html.magic-mode .card,
html.magic-mode .rounded-2xl.border,
html.magic-mode .rounded-3xl.border {
  border-color: hsl(45 65% 40% / 0.45) !important;
  box-shadow:
    0 0 0 1px hsl(45 80% 55% / 0.12) inset,
    0 12px 30px -12px hsl(220 100% 2% / 0.8);
}

/* amber-50 backgrounds become deep blue tint */
html.magic-mode .bg-amber-50\\/60,
html.magic-mode .bg-amber-50\\/40 {
  background-color: hsl(222 65% 14% / 0.7) !important;
}

/* Quiz option card selected state */
html.magic-mode .border-amber-500 {
  border-color: hsl(45 80% 55%) !important;
}
html.magic-mode .bg-amber-50 {
  background-color: hsl(222 65% 14%) !important;
}
html.magic-mode .text-amber-900 { color: hsl(45 90% 75%) !important; }
html.magic-mode .text-amber-700,
html.magic-mode .text-amber-800 { color: hsl(45 80% 65%) !important; }
html.magic-mode .border-amber-400\\/40 { border-color: hsl(45 70% 45% / 0.4) !important; }

/* Stars / sparkles in gold */
html.magic-mode .text-ghana-gold,
html.magic-mode .text-amber-500 { color: hsl(48 100% 62%) !important; }
`;

export function applyMagicRuntimeTheme(active: boolean) {
  if (typeof document === "undefined") return;

  let style = document.getElementById(MAGIC_MODE_CSS_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = MAGIC_MODE_CSS_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== MAGIC_MODE_CSS) style.textContent = MAGIC_MODE_CSS;

  document.documentElement.classList.toggle("magic-mode", active);

  if (!active) {
    document.documentElement.style.removeProperty("--background");
    document.documentElement.style.removeProperty("--card");
    if (document.body) {
      document.body.style.removeProperty("background");
      document.body.style.removeProperty("min-height");
    }
  }
}
