'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import { Target, Zap, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MissionPoint {
  title: string;
  description: string;
}

interface Props {
  title: string;
  subtitle: string;
  description: string;
  points: MissionPoint[];
}

const icons: LucideIcon[] = [Target, Zap, Users];

const accentColors = [
  { border: 'border-l-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', glow: 'group-hover:shadow-amber-500/10' },
  { border: 'border-l-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', glow: 'group-hover:shadow-emerald-500/10' },
  { border: 'border-l-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', glow: 'group-hover:shadow-sky-500/10' },
];

export function MissionSection({ title, subtitle, description, points }: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">{subtitle}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-muted-foreground max-w-3xl mx-auto text-lg leading-relaxed">
              {description}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {points.map((point, i) => {
              const Icon = icons[i] || Target;
              const colors = accentColors[i % accentColors.length];

              return (
                <motion.div
                  key={point.title}
                  variants={fadeInUp}
                  whileHover={shouldReduceMotion ? {} : { y: -6 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-8 transition-all duration-300 hover:shadow-xl ${colors.glow} border-l-[3px] ${colors.border}`}
                >
                  {/* Number watermark */}
                  <div className="absolute right-3 top-2 text-6xl font-bold text-foreground/[0.035] select-none leading-none">
                    0{i + 1}
                  </div>

                  {/* Top gradient line */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                  <div className="relative z-10">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colors.bg} ${colors.text}`}>
                      <Icon size={28} />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-foreground">{point.title}</h3>
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
