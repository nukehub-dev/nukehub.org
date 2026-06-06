'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Value {
  icon: string;
  title: string;
  description: string;
}

interface Props {
  title: string;
  subtitle?: string;
  items: Value[];
}

function resolveIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] || Icons.Circle;
}

const cardStyles = [
  {
    gradient: 'from-amber-500/8 via-transparent to-transparent',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accentColor: '#f59e0b',
  },
  {
    gradient: 'from-emerald-500/8 via-transparent to-transparent',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    accentColor: '#10b981',
  },
  {
    gradient: 'from-sky-500/8 via-transparent to-transparent',
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-600 dark:text-sky-400',
    accentColor: '#0ea5e9',
  },
  {
    gradient: 'from-violet-500/8 via-transparent to-transparent',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    accentColor: '#8b5cf6',
  },
];

export function ValuesGrid({ title, subtitle, items }: Props) {
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
            {subtitle && (
              <p className="text-sm font-medium text-primary uppercase tracking-wider">{subtitle}</p>
            )}
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
          </motion.div>

          {/* Bento grid layout */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => {
              const Icon = resolveIcon(item.icon);
              const style = cardStyles[i % cardStyles.length];
              const isLarge = i === 0; // First item slightly larger

              return (
                <motion.div
                  key={item.title}
                  variants={fadeInUp}
                  whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 ${
                    isLarge ? 'sm:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  {/* Bottom accent line */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-3/4 transition-all duration-500 rounded-full"
                    style={{ backgroundColor: style.accentColor }}
                  />

                  {/* Top shimmer */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon size={22} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {item.description}
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
