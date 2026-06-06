import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import { Check, Sparkles } from 'lucide-react';

interface Tier {
  name: string;
  price: string;
  period: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  description: string;
  features: string[];
  cta: string;
  inquiryType: string;
  featured?: boolean;
}

interface Props {
  tiers: Tier[];
  onContactClick: (inquiryType: string) => void;
}

const tierConfig: Record<
  string,
  {
    labelColor: string;
    topBorder: string;
    fromColor: string;
    glowColor: string;
    checkBg: string;
    checkColor: string;
    btnBorder: string;
    btnHover: string;
  }
> = {
  platinum: {
    labelColor: 'text-primary',
    topBorder: 'border-t-primary',
    fromColor: 'from-primary/10',
    glowColor: 'shadow-primary/20',
    checkBg: 'bg-primary/15',
    checkColor: 'text-primary',
    btnBorder: 'border-primary/40',
    btnHover: 'hover:bg-primary hover:text-primary-foreground hover:border-primary',
  },
  gold: {
    labelColor: 'text-amber-600 dark:text-amber-400',
    topBorder: 'border-t-amber-500',
    fromColor: 'from-amber-500/10',
    glowColor: 'shadow-amber-500/20',
    checkBg: 'bg-amber-600/15 dark:bg-amber-500/15',
    checkColor: 'text-amber-600 dark:text-amber-400',
    btnBorder: 'border-amber-500/40',
    btnHover: 'hover:bg-amber-500 hover:text-white hover:border-amber-500',
  },
  silver: {
    labelColor: 'text-slate-500 dark:text-slate-300',
    topBorder: 'border-t-slate-400',
    fromColor: 'from-slate-400/10',
    glowColor: 'shadow-slate-400/20',
    checkBg: 'bg-slate-500/15 dark:bg-slate-400/15',
    checkColor: 'text-slate-500 dark:text-slate-300',
    btnBorder: 'border-slate-400/50',
    btnHover: 'hover:bg-slate-500 hover:text-white hover:border-slate-500 dark:hover:bg-slate-400 dark:hover:text-slate-950 dark:hover:border-slate-400',
  },
  bronze: {
    labelColor: 'text-orange-500 dark:text-orange-400',
    topBorder: 'border-t-orange-400',
    fromColor: 'from-orange-400/10',
    glowColor: 'shadow-orange-400/20',
    checkBg: 'bg-orange-500/15 dark:bg-orange-400/15',
    checkColor: 'text-orange-500 dark:text-orange-400',
    btnBorder: 'border-orange-400/40',
    btnHover: 'hover:bg-orange-500 hover:text-white hover:border-orange-500 dark:hover:bg-orange-400 dark:hover:text-slate-950 dark:hover:border-orange-400',
  },
};

export function SponsorshipTiers({ tiers, onContactClick }: Props) {
  return (
    <section id="sponsorship-tiers" className="py-20 border-t border-border/50">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="text-center mb-14">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Sponsorship Tiers
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
            Choose a tier that fits your budget and goals. Every contribution drives the community forward.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 items-stretch">
          {tiers.map((t) => {
            const cfg = tierConfig[t.tier];
            return (
              <motion.div
                key={t.name}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="group relative flex flex-col h-full"
              >
                {/* Glow backdrop for featured */}
                {t.featured && (
                  <div className="absolute -inset-1 rounded-2xl bg-primary/20 animate-pulse-slow" />
                )}

                {/* Card */}
                <div
                  className={`relative flex flex-col h-full overflow-hidden rounded-2xl border border-border backdrop-blur-sm ${cfg.topBorder} border-t-[3px] bg-gradient-to-b ${cfg.fromColor} to-card transition-all duration-500 ${
                    t.featured
                      ? 'shadow-2xl shadow-primary/20 hover:shadow-primary/60 hover:ring-1 hover:ring-primary/20'
                      : `hover:shadow-xl ${cfg.glowColor}`
                  }`}
                >
                  {/* Most Popular banner */}
                  {t.featured && (
                    <div className="flex items-center justify-center gap-1.5 bg-primary/10 py-2.5">
                      <Sparkles size={14} className="text-primary" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col flex-1 p-6">
                    {/* Tier name */}
                    <h3 className={`text-lg font-bold ${cfg.labelColor}`}>{t.name}</h3>

                    {/* Price */}
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-[2.75rem] font-extrabold tracking-tight text-foreground leading-none">
                        {t.price}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {t.period}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                      {t.description}
                    </p>

                    {/* Divider */}
                    <div className="my-5 h-px bg-border/70" />

                    {/* Features */}
                    <ul className="space-y-3 flex-1">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${cfg.checkBg}`}
                          >
                            <Check size={12} className={cfg.checkColor} strokeWidth={3} />
                          </span>
                          <span className="text-sm text-foreground/90 leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="mt-7">
                      <button
                        onClick={() => onContactClick(t.inquiryType)}
                        className={`flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-nowrap transition-all duration-200 ${
                          t.featured
                            ? 'border border-primary/30 bg-primary/10 text-primary shadow-sm hover:bg-primary/15 hover:shadow-md active:scale-[0.98] dark:border-primary/50 dark:bg-primary dark:text-primary-foreground dark:shadow-lg dark:shadow-primary/25 dark:hover:bg-primary/90 dark:hover:shadow-xl dark:hover:shadow-primary/40'
                            : `border ${cfg.btnBorder} bg-transparent text-foreground ${cfg.btnHover} active:scale-[0.98]`
                        }`}
                      >
                        {t.cta}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
