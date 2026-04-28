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

const spots: { top: string; left: string; i: number; rot: number }[] = [
// Hand-tuned scattered positions — each of the 6 symbols appears 8 times (48 total per tile).
  // dwennimmen (0)
  { top: "3%",  left: "8%",  i: 0, rot: -8 },
  { top: "11%", left: "52%", i: 0, rot: 14 },
  { top: "22%", left: "28%", i: 0, rot: -22 },
  { top: "34%", left: "74%", i: 0, rot: 4 },
  { top: "48%", left: "12%", i: 0, rot: 18 },
  { top: "61%", left: "48%", i: 0, rot: -10 },
  { top: "75%", left: "82%", i: 0, rot: 20 },
  { top: "90%", left: "30%", i: 0, rot: -4 },
  // sankofa (1)
  { top: "6%",  left: "72%", i: 1, rot: 10 },
  { top: "17%", left: "18%", i: 1, rot: -12 },
  { top: "27%", left: "64%", i: 1, rot: 20 },
  { top: "40%", left: "40%", i: 1, rot: -6 },
  { top: "52%", left: "86%", i: 1, rot: 14 },
  { top: "66%", left: "22%", i: 1, rot: -18 },
  { top: "80%", left: "58%", i: 1, rot: 8 },
  { top: "94%", left: "4%",  i: 1, rot: -14 },
  // hinmeisee (2)
  { top: "2%",  left: "36%", i: 2, rot: 12 },
  { top: "14%", left: "86%", i: 2, rot: -16 },
  { top: "25%", left: "4%",  i: 2, rot: 6 },
  { top: "38%", left: "58%", i: 2, rot: -20 },
  { top: "50%", left: "32%", i: 2, rot: 16 },
  { top: "63%", left: "70%", i: 2, rot: -8 },
  { top: "77%", left: "12%", i: 2, rot: 22 },
  { top: "92%", left: "66%", i: 2, rot: -10 },
  // atswa (3)
  { top: "8%",  left: "24%", i: 3, rot: 18 },
  { top: "19%", left: "78%", i: 3, rot: -10 },
  { top: "30%", left: "42%", i: 3, rot: 22 },
  { top: "43%", left: "88%", i: 3, rot: -14 },
  { top: "55%", left: "20%", i: 3, rot: 12 },
  { top: "69%", left: "54%", i: 3, rot: -22 },
  { top: "83%", left: "92%", i: 3, rot: 6 },
  { top: "96%", left: "44%", i: 3, rot: -16 },
  // atoobi (4)
  { top: "4%",  left: "60%", i: 4, rot: -14 },
  { top: "16%", left: "2%",  i: 4, rot: 8 },
  { top: "28%", left: "90%", i: 4, rot: -18 },
  { top: "40%", left: "70%", i: 4, rot: 12 },
  { top: "53%", left: "4%",  i: 4, rot: -6 },
  { top: "67%", left: "36%", i: 4, rot: 18 },
  { top: "81%", left: "70%", i: 4, rot: -12 },
  { top: "95%", left: "18%", i: 4, rot: 10 },
  // abii (5)
  { top: "9%",  left: "92%", i: 5, rot: -6 },
  { top: "21%", left: "40%", i: 5, rot: 16 },
  { top: "33%", left: "16%", i: 5, rot: -4 },
  { top: "46%", left: "56%", i: 5, rot: 18 },
  { top: "58%", left: "2%",  i: 5, rot: -16 },
  { top: "71%", left: "62%", i: 5, rot: 10 },
  { top: "85%", left: "48%", i: 5, rot: -20 },
  { top: "98%", left: "82%", i: 5, rot: 14 },
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
