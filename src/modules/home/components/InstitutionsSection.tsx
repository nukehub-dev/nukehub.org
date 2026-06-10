"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { viewportOnce } from "@lib/animations";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Image } from "@components/ui/Image";
import type { Sponsor } from "@modules/home/types/sponsor";
import { InstitutionsCanvas } from "@modules/home/components/three/InstitutionsCanvas";

interface InstitutionsSectionProps {
  badge: {
    text: string;
    showLiveDot?: boolean;
  };
  title: string;
  subtitle: string;
  sponsors: Sponsor[];
}

const TIER_ORDER = ["platinum", "gold", "silver", "bronze"];
const TIER_LABELS: Record<string, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

// ------------------------------------------------------------------
// Static row for few items
// ------------------------------------------------------------------
function StaticRow({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {sponsors.map((sponsor) => (
        <a
          key={sponsor.name}
          href={sponsor.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm px-4 py-2.5 sm:px-5 sm:py-3 transition-all duration-300 hover:border-primary/30 hover:bg-card hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
        >
          <div className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-md sm:rounded-lg flex-shrink-0">
            <Image
              src={sponsor.image}
              alt={sponsor.name}
              fallback={sponsor.name.charAt(0)}
              wrapperClassName="h-full w-full"
              rounded="lg"
              className="object-contain"
            />
          </div>
          <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {sponsor.name}
          </span>
          <ExternalLink
            size={10}
            className="sm:hidden text-muted-foreground/30 flex-shrink-0"
          />
          <ExternalLink
            size={12}
            className="hidden sm:block text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          />
        </a>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Marquee row for many items
// ------------------------------------------------------------------
function MarqueeRow({
  sponsors,
  speed = 35,
}: {
  sponsors: Sponsor[];
  speed?: number;
}) {
  const [isPaused, setIsPaused] = React.useState(false);
  const items = [...sponsors, ...sponsors, ...sponsors];

  return (
    <div
      className="relative overflow-hidden py-3 sm:py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-background to-transparent" />

      <div
        className="flex gap-4 sm:gap-8 items-center"
        style={{
          animation: `marquee-scroll ${speed}s linear infinite`,
          animationPlayState: isPaused ? "paused" : "running",
          width: "max-content",
        }}
      >
        {items.map((sponsor, i) => (
          <a
            key={`${sponsor.name}-${i}`}
            href={sponsor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-shrink-0 flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm px-3 py-2 sm:px-5 sm:py-3 transition-all duration-300 hover:border-primary/30 hover:bg-card hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
          >
            <div className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-md sm:rounded-lg flex-shrink-0">
              <Image
                src={sponsor.image}
                alt={sponsor.name}
                fallback={sponsor.name.charAt(0)}
                wrapperClassName="h-full w-full"
                rounded="lg"
                className="object-contain"
              />
            </div>
            <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
              {sponsor.name}
            </span>
            <ExternalLink
              size={10}
              className="sm:hidden text-muted-foreground/30 flex-shrink-0"
            />
            <ExternalLink
              size={12}
              className="hidden sm:block text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Section
// ------------------------------------------------------------------
export function InstitutionsSection({
  badge,
  title,
  subtitle,
  sponsors,
}: InstitutionsSectionProps) {
  const byTier = React.useMemo(() => {
    const grouped: Record<string, Sponsor[]> = {};
    TIER_ORDER.forEach((t) => (grouped[t] = []));
    sponsors.forEach((s) => {
      const tier = s.tier || "bronze";
      if (!grouped[tier]) grouped[tier] = [];
      grouped[tier].push(s);
    });
    return grouped;
  }, [sponsors]);

  // Count total unique sponsors
  const totalSponsors = sponsors.length;

  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col justify-center overflow-hidden px-4 py-20 snap-section">
      <div
        className="absolute inset-0 -z-20 opacity-30 dark:opacity-100 pointer-events-none transition-opacity duration-700"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <InstitutionsCanvas />
      </div>

      <div className="absolute inset-0 -z-[15] overflow-hidden pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08] dark:opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-transparent to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-transparent to-transparent" />

      <div className="relative mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{
            duration: 0.6,
            ease: [0.215, 0.61, 0.355, 1],
          }}
          className="mb-8 sm:mb-10 text-center"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md"
          >
            {badge.showLiveDot && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
            {badge.text}
          </motion.span>

          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </motion.div>

        {/* Partners display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {totalSponsors <= 3 ? (
            // Static centered layout for few sponsors
            <div className="py-8 sm:py-12">
              <StaticRow sponsors={sponsors} />
            </div>
          ) : (
            // Marquee for many sponsors
            <div className="space-y-1 sm:space-y-2">
              {TIER_ORDER.map((tier) => {
                const tierSponsors = byTier[tier] || [];
                if (tierSponsors.length === 0) return null;

                return (
                  <div key={tier} className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4">
                      <div className="h-px flex-1 bg-border/30" />
                      <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                        {TIER_LABELS[tier]} Partners
                      </span>
                      <div className="h-px flex-1 bg-border/30" />
                    </div>
                    <MarqueeRow sponsors={tierSponsors} speed={35} />
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 sm:mt-10 text-center"
        >
          <a
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
          >
            Interested in partnering with us?
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold group-hover:bg-primary/20 transition-colors">
              Get in touch
              <ArrowRight size={12} className="ml-1" />
            </span>
          </a>
        </motion.div>
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </section>
  );
}
