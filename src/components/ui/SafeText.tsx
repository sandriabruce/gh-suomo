import { useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders text and verifies, after mount, that the computed color is actually
 * visible. If the resolved color is transparent, fully unset, or matches the
 * element's own background (e.g. a missing CSS custom property), it swaps to
 * a safe fallback class so the text is never invisible.
 */
type SafeTextProps = {
  as?: ElementType;
  className?: string;
  /** Tailwind class used when the primary color resolves to something invisible. */
  fallbackClassName?: string;
  /** CSS color used as a final runtime fallback when class order or tokens fail. */
  fallbackColor?: string;
  children: ReactNode;
};

function parseRgb(color: string) {
  const normalized = color.replace(/\s+/g, "").toLowerCase();
  const match = normalized.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1].split(",").map(Number);
  if (parts.length < 3) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fg: ReturnType<typeof parseRgb>, bg: ReturnType<typeof parseRgb>) {
  if (!fg || !bg) return null;
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function isInvisible(color: string, bg: string) {
  if (!color) return true;
  const c = color.replace(/\s+/g, "").toLowerCase();
  if (c === "transparent" || c === "rgba(0,0,0,0)") return true;
  // Same color as background = invisible
  if (bg && color === bg) return true;
  // Detect rgba with alpha 0
  const fg = parseRgb(color);
  const background = parseRgb(bg);
  if (fg?.a === 0) return true;
  const ratio = contrastRatio(fg, background);
  if (ratio !== null && ratio < 4.5) return true;
  return false;
}

export function SafeText({
  as,
  className,
  fallbackClassName = "text-ghana-brown",
  fallbackColor = "hsl(var(--card-foreground))",
  children,
}: SafeTextProps) {
  const Tag = (as ?? "span") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [needsFallback, setNeedsFallback] = useState(false);
  const fallbackStyle = useMemo<CSSProperties | undefined>(
    () => (needsFallback ? { color: fallbackColor } : undefined),
    [fallbackColor, needsFallback]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    let bg = cs.backgroundColor;
    // Walk up to find a non-transparent ancestor background
    let parent: HTMLElement | null = el.parentElement;
    while (parent && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) {
      bg = window.getComputedStyle(parent).backgroundColor;
      parent = parent.parentElement;
    }
    if (isInvisible(cs.color, bg)) {
      console.warn(
        "[SafeText] Text color resolved to invisible — applying fallback.",
        { color: cs.color, background: bg, className }
      );
      setNeedsFallback(true);
    }
  }, [className, children]);

  return (
    <Tag
      ref={ref as never}
      className={cn(className, needsFallback && fallbackClassName)}
      style={fallbackStyle}
    >
      {children}
    </Tag>
  );
}

export default SafeText;