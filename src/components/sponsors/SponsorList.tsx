import * as React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import { Globe, ArrowUpRight, Heart } from 'lucide-react';

export interface Sponsor {
  id: string;
  name: string;
  image: string;
  url: string;
  acknowledgment: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
}

interface SponsorListProps {
  sponsors: Sponsor[];
}

const tierConfig = {
  platinum: { label: 'Platinum', badgeClass: 'bg-primary text-primary-foreground', cardClass: 'lg:col-span-2' },
  gold: { label: 'Gold', badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', cardClass: '' },
  silver: { label: 'Silver', badgeClass: 'bg-slate-400/15 text-slate-600 dark:text-slate-400', cardClass: '' },
  bronze: { label: 'Bronze', badgeClass: 'bg-orange-700/15 text-orange-700 dark:text-orange-400', cardClass: '' },
};

const tierOrder: Array<'platinum' | 'gold' | 'silver' | 'bronze'> = ['platinum', 'gold', 'silver', 'bronze'];

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

export function SponsorList({ sponsors }: SponsorListProps) {
  if (!sponsors.length) return null;

  const groups = groupByTier(sponsors);

  return (
    <section className="py-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Our Sponsors
          </h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            We extend our sincere gratitude to the organizations that make NukeHub possible.
          </p>
        </motion.div>

        {tierOrder.map((tier) => {
          const list = groups.get(tier) || [];
          if (!list.length) return null;
          const config = tierConfig[tier];

          return (
            <div key={tier} className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.badgeClass}`}>
                  {config.label}
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((sponsor) => (
                  <motion.a
                    key={sponsor.id}
                    href={sponsor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={fadeInUp}
                    className={`group block bubble p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${config.cardClass}`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className="relative flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-background/50">
                          <img
                            src={sponsor.image}
                            alt={sponsor.name}
                            className="max-h-full max-w-[80%] object-contain transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      </div>

                      <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
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
        })}
      </motion.div>

      {/* Become a sponsor CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        className="mt-6"
      >
        <a
          href="/support"
          className="group flex items-center justify-between gap-4 bubble p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Heart size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Become a Sponsor</p>
              <p className="text-xs text-muted-foreground">Support our mission and gain visibility in the nuclear community.</p>
            </div>
          </div>
          <ArrowUpRight size={18} className="text-muted-foreground transition-colors group-hover:text-primary" />
        </a>
      </motion.div>
    </section>
  );
}
