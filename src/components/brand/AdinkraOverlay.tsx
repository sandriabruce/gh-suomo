import dwennimmen from "@/assets/adinkra/dwennimmen.png";
import sankofa from "@/assets/adinkra/sankofa.png";
import hinmeisee from "@/assets/adinkra/hinmeisee.png";
import atswa from "@/assets/adinkra/atswa.png";
import atoobi from "@/assets/adinkra/atoobi.png";
import abii from "@/assets/adinkra/abii.png";

const symbols = [
  { src: dwennimmen, size: 64 },
  { src: sankofa, size: 56 },
  { src: hinmeisee, size: 72 },
  { src: atswa, size: 52 },
  { src: atoobi, size: 60 },
  { src: abii, size: 68 },
];

// Hand-tuned scattered positions — each of the 6 symbols appears 4 times (24 total per tile).
const spots: { top: string; left: string; i: number; rot: number }[] = [
  // dwennimmen (0)
  { top: "3%",  left: "8%",  i: 0, rot: -8 },
  { top: "28%", left: "46%", i: 0, rot: 14 },
  { top: "62%", left: "14%", i: 0, rot: -22 },
  { top: "88%", left: "76%", i: 0, rot: 4 },
  // sankofa (1)
  { top: "14%", left: "70%", i: 1, rot: 10 },
  { top: "38%", left: "18%", i: 1, rot: -12 },
  { top: "66%", left: "56%", i: 1, rot: 20 },
  { top: "92%", left: "32%", i: 1, rot: -6 },
  // hinmeisee (2)
  { top: "6%",  left: "36%", i: 2, rot: 12 },
  { top: "30%", left: "82%", i: 2, rot: -16 },
  { top: "54%", left: "40%", i: 2, rot: 6 },
  { top: "78%", left: "6%",  i: 2, rot: -20 },
  // atswa (3)
  { top: "20%", left: "24%", i: 3, rot: 18 },
  { top: "44%", left: "62%", i: 3, rot: -10 },
  { top: "70%", left: "88%", i: 3, rot: 22 },
  { top: "96%", left: "50%", i: 3, rot: -14 },
  // atoobi (4)
  { top: "2%",  left: "58%", i: 4, rot: -14 },
  { top: "24%", left: "4%",  i: 4, rot: 8 },
  { top: "50%", left: "76%", i: 4, rot: -18 },
  { top: "82%", left: "42%", i: 4, rot: 12 },
  // abii (5)
  { top: "10%", left: "90%", i: 5, rot: -6 },
  { top: "36%", left: "34%", i: 5, rot: 16 },
  { top: "58%", left: "2%",  i: 5, rot: -4 },
  { top: "84%", left: "60%", i: 5, rot: 18 },
];

/**
 * Fixed, pointer-inert, gold-tinted Adinkra + Ga Samai watermark overlay.
 * Sits above backgrounds but below interactive content via z-index + pointer-events: none.
 */
export function AdinkraOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      style={{ opacity: 0.14 }}
    >
      <div className="relative h-[200vh] w-full">
        {spots.map((s, idx) => {
          const sym = symbols[s.i % symbols.length];
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                top: s.top,
                left: s.left,
                width: sym.size,
                height: sym.size,
                transform: `rotate(${s.rot}deg)`,
                backgroundColor: "hsl(var(--ghana-gold))",
                WebkitMaskImage: `url(${sym.src})`,
                maskImage: `url(${sym.src})`,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
