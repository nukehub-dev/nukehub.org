import { motion } from "framer-motion";
import { fadeInUp, viewportOnce } from "@lib/animations";
import { Check, SlidersHorizontal } from "lucide-react";
import type { SupportTier } from "@modules/support/types";

interface Props {
  tier: SupportTier;
  onContactClick: (
    inquiryType: string,
    additionalValues?: Record<string, string>,
  ) => void;
}

export function CustomTier({ tier, onContactClick }: Props) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeInUp}
      className="mt-6"
    >
      <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card to-card backdrop-blur-sm transition-all duration-500 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10">
        {/* Subtle glow */}
        <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-violet-500/10 blur-[80px] opacity-60" />

        <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
          {/* Left: heading + CTA */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-violet-500 dark:text-violet-400">
              <SlidersHorizontal size={12} />
              Tailored Partnership
            </div>

            <div>
              <h3 className="text-2xl font-bold text-violet-500 dark:text-violet-400">
                {tier.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {tier.period}
                  </span>
                )}
              </div>
            </div>

            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              {tier.description}
            </p>

            <button
              onClick={() =>
                onContactClick(tier.inquiryType, {
                  preferredTier: tier.name,
                })
              }
              className="inline-flex items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10 px-6 py-3 text-sm font-semibold text-violet-500 transition-all hover:bg-violet-500 hover:text-white hover:border-violet-500 dark:text-violet-400 dark:hover:bg-violet-400 dark:hover:text-slate-950 dark:hover:border-violet-400 active:scale-[0.98]"
            >
              {tier.cta}
            </button>
          </div>

          {/* Right: features */}
          <div className="rounded-xl border border-border/40 bg-background/40 p-5 sm:p-6">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 dark:bg-violet-400/15">
                    <Check
                      size={12}
                      className="text-violet-500 dark:text-violet-400"
                      strokeWidth={3}
                    />
                  </span>
                  <span className="text-sm text-foreground/90 leading-snug">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
