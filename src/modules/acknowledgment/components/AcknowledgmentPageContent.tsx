"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@lib/animations";
import { Award, Heart, ArrowUpRight, Globe, ExternalLink } from "lucide-react";
import { AcknowledgmentFloatingDots } from "./decorations/AcknowledgmentFloatingDots";

export interface Sponsor {
  id: string;
  name: string;
  image: string;
  url: string;
  acknowledgment: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
}

interface AcknowledgmentPageContentProps {
  sponsors: Sponsor[];
}

const tierConfig = {
  platinum: {
    label: "Platinum",
    badgeClass: "bg-primary text-primary-foreground",
    description:
      "Foundational partners whose vision makes everything possible.",
  },
  gold: {
    label: "Gold",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    description: "Major supporters who power our infrastructure and growth.",
  },
  silver: {
    label: "Silver",
    badgeClass: "bg-slate-400/15 text-slate-600 dark:text-slate-400",
    description: "Valued contributors who help us expand our reach.",
  },
  bronze: {
    label: "Bronze",
    badgeClass: "bg-orange-700/15 text-orange-700 dark:text-orange-400",
    description: "Friends of the project who champion our mission.",
  },
};

const tierOrder: Array<keyof typeof tierConfig> = [
  "platinum",
  "gold",
  "silver",
  "bronze",
];

function groupByTier(sponsors: Sponsor[]) {
  const groups = new Map<string, Sponsor[]>();
  for (const tier of tierOrder) {
    groups.set(tier, []);
  }
  for (const s of sponsors) {
    const list = groups.get(s.tier) || [];
    list.push(s);
    groups.set(s.tier, list);
  }
  return groups;
}

export function AcknowledgmentPageContent({
  sponsors,
}: AcknowledgmentPageContentProps) {
  const groups = groupByTier(sponsors);
  const hasSponsors = sponsors.length > 0;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <AcknowledgmentFloatingDots />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] opacity-50" />

        <div className="relative z-10 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8">
              <Award size={16} />
              Acknowledgments
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Standing on the
              <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_60%,var(--foreground))] bg-clip-text text-transparent inline-block">
                {" "}
                Shoulders of Giants
              </span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              NukeHub exists because of the generosity, expertise, and passion
              of a global community. We are deeply grateful for every
              contribution.
            </p>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="bubble p-8 sm:p-10">
            <div className="flex items-start gap-5">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Open Source
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  NukeHub itself operates under the{" "}
                  <a
                    href="https://opensource.org/licenses/BSD-2-Clause"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    BSD-2-Clause license
                    <ExternalLink size={14} />
                  </a>
                  , and we stand on the shoulders of countless open-source
                  projects. We thank the developers and maintainers of the
                  libraries, frameworks, and tools that make our work possible.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Our Sponsors
              </h2>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                We extend our sincere gratitude to the organizations that make
                NukeHub possible.
              </p>
            </motion.div>

            {hasSponsors ? (
              tierOrder.map((tier) => {
                const list = groups.get(tier) || [];
                if (!list.length) return null;
                const config = tierConfig[tier];

                return (
                  <div key={tier} className="mb-12">
                    <motion.div
                      variants={fadeInUp}
                      className="flex flex-col items-center text-center mb-6"
                    >
                      <span
                        className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    </motion.div>

                    <div
                      className={
                        list.length === 1
                          ? "flex justify-center"
                          : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                      }
                    >
                      {list.map((sponsor) => (
                        <motion.a
                          key={sponsor.id}
                          href={sponsor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variants={fadeInUp}
                          className={`group block bubble p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 ${
                            list.length === 1 ? "w-full max-w-md" : ""
                          }`}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-center mb-5 h-20">
                              <img
                                src={sponsor.image}
                                alt={sponsor.name}
                                width="100%"
                                height="100%"
                                className="max-h-full max-w-[80%] object-contain transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            </div>

                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                              {sponsor.name}
                            </h3>

                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
                              {sponsor.acknowledgment}
                            </p>

                            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                              <Globe size={12} />
                              Visit website
                              <ArrowUpRight size={12} />
                            </span>
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <motion.div variants={fadeInUp} className="text-center py-16">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <Heart size={28} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  No sponsors yet
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Be the first to support our mission.
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Become a sponsor CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            className="mt-8"
          >
            <a
              href="/support"
              className="group flex items-center justify-between gap-4 bubble p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Heart size={20} />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Become a Sponsor
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Support our mission and gain visibility in the nuclear
                    community.
                  </p>
                </div>
              </div>
              <ArrowUpRight
                size={20}
                className="text-muted-foreground transition-colors group-hover:text-primary"
              />
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
