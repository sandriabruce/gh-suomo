import { useState } from "react";
import { Check, Crown } from "lucide-react";
import { SafetyBanner } from "@/components/safety/SafetyBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaystackMomoFlow } from "@/components/paystack/PaystackMomoFlow";
import { useEntitlements } from "@/hooks/useEntitlements";
import { TrialBadge } from "@/components/plan/TrialBadge";
import type { Plan } from "@/features/trial/entitlements";
import { IdentityVerificationCard } from "@/components/verify/IdentityVerificationCard";

type Tier = {
  id: Plan;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  payable: boolean;
  recommended?: boolean;
  diamond?: boolean;
  cta: string;
};

const PLANS: Tier[] = [
  {
    id: "explorer",
    name: "Explorer",
    price: "Free",
    tagline: "Get a feel for the community",
    features: ["Browse profiles", "2 matches per week", "No chat"],
    payable: false,
    cta: "Get Started Free",
  },
  {
    id: "verified",
    name: "Verified",
    price: "GH₵100/mo",
    tagline: "Show you're the real deal",
    features: ["Verification badge", "2 matches per week", "Basic chat"],
    payable: true,
    cta: "Subscribe",
  },
  {
    id: "premium",
    name: "Premium",
    price: "GH₵180/mo",
    tagline: "Connect without limits",
    features: ["Unlimited matches", "Full chat", "Priority in Discover feed"],
    payable: true,
    recommended: true,
    cta: "Subscribe",
  },
  {
    id: "diamond",
    name: "Diamond",
    price: "GH₵350/mo",
    tagline: "White-glove matchmaking",
    features: [
      "Everything in Premium",
      "Personal matchmaker",
      "Top placement at the top of Discover",
    ],
    payable: true,
    diamond: true,
    cta: "Subscribe",
  },
];

export default function Verify() {
  const [selected, setSelected] = useState<{ id: Plan; name: string; price: string } | null>(null);
  const { plan: currentPlan, trial } = useEntitlements();

  return (
    <div className="space-y-4">
      <SafetyBanner
        variant="warn"
        className="text-ghana-red [&_p]:text-ghana-red"
        message="GH SUƆMƆ never asks for payment outside this app. Pay only via Paystack MoMo or card."
      />
      <h1 className="heading-gold font-display text-2xl font-bold">Plans & verification</h1>
      <TrialBadge />
      <IdentityVerificationCard />
      <div className="grid gap-4">
        {PLANS.map((p) => {
          const isCurrent = p.id === currentPlan;
          const isDiamond = !!p.diamond;
          return (
            <Card
              key={p.id}
              className={`relative overflow-hidden rounded-2xl border-2 p-5 transition ${
                isDiamond
                  ? "border-ghana-gold bg-gradient-to-br from-ghana-brown via-ghana-brown/90 to-black text-ghana-gold shadow-[0_8px_30px_-10px_rgba(201,168,76,0.6)]"
                  : isCurrent
                  ? "border-ghana-green bg-ghana-green/5"
                  : p.recommended
                  ? "border-ghana-gold bg-ghana-gold/5"
                  : "border-ghana-gold/40"
              }`}
            >
              {p.recommended && !isDiamond && (
                <span className="absolute right-3 top-3 rounded-full bg-ghana-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ghana-brown">
                  Recommended
                </span>
              )}
              {isDiamond && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-ghana-gold/60 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ghana-gold">
                  <Crown className="h-3 w-3" /> Diamond
                </span>
              )}

              <div className="flex flex-col gap-3">
                <div>
                  <h3
                    className={`flex items-center gap-2 font-display text-xl font-bold ${
                      isDiamond ? "text-ghana-gold" : "text-ghana-brown"
                    }`}
                  >
                    {p.name}
                    {isCurrent && (
                      <span className="rounded-full bg-ghana-green px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                        Current
                      </span>
                    )}
                  </h3>
                  <p
                    className={`text-xs ${
                      isDiamond ? "text-ghana-gold/80" : "text-muted-foreground"
                    }`}
                  >
                    {p.tagline}
                  </p>
                </div>

                <div
                  className={`font-display text-2xl font-extrabold ${
                    isDiamond ? "text-ghana-gold" : "text-ghana-green"
                  }`}
                >
                  {p.price}
                </div>

                <ul className="space-y-1.5 text-sm">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2 ${
                        isDiamond ? "text-ghana-gold/90" : "text-ghana-brown"
                      }`}
                    >
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isDiamond ? "text-ghana-gold" : "text-ghana-green"
                        }`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent && trial.active && (p.id === "explorer" || p.id === "verified") && (
                  <p className="text-xs font-medium text-ghana-gold">
                    Premium features unlocked for {trial.daysRemaining} more day
                    {trial.daysRemaining === 1 ? "" : "s"}.
                  </p>
                )}

                <Button
                  disabled={isCurrent}
                  className={`mt-1 w-full font-semibold ${
                    isDiamond
                      ? "bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
                      : p.recommended
                      ? "bg-ghana-green text-white hover:bg-ghana-green/90"
                      : "bg-ghana-gold text-ghana-brown hover:bg-ghana-gold/90"
                  } disabled:opacity-60`}
                  onClick={() =>
                    p.payable && !isCurrent && setSelected({ id: p.id, name: p.name, price: p.price })
                  }
                >
                  {isCurrent ? "Current plan" : p.cta}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <PaystackMomoFlow
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        planName={selected?.name ?? ""}
        priceLabel={selected?.price ?? ""}
        planId={selected && selected.id !== "explorer" ? (selected.id as "verified" | "premium" | "diamond") : undefined}
      />
    </div>
  );
}