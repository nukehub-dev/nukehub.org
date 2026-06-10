'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Rocket, Users, Globe, type LucideIcon } from 'lucide-react';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';

interface Milestone {
  year: string;
  title: string;
  description: string;
}

interface Props {
  title: string;
  description?: string;
  milestones: Milestone[];
}

const milestoneIcons: LucideIcon[] = [Rocket, Users, Globe];

const dotBgColors = ['bg-amber-500', 'bg-emerald-500', 'bg-sky-500'];
const dotBorderColors = ['border-amber-600', 'border-emerald-600', 'border-sky-600'];
const dotShadowColors = [
  'rgba(245,158,11,0.35)',
  'rgba(16,185,129,0.35)',
  'rgba(14,165,233,0.35)',
];

const milestoneColors = [
  'from-amber-500/20 to-transparent',
  'from-emerald-500/20 to-transparent',
  'from-sky-500/20 to-transparent',
];

export function StoryTimeline({ title, description, milestones }: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 overflow-hidden">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            {description && (
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                {description}
              </p>
            )}
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Static center line - sits behind everything */}
            <div className="absolute left-6 sm:left-1/2 top-3 bottom-3 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/30 via-emerald-500/30 to-sky-500/30 -z-0" />

            <div className="space-y-16">
              {milestones.map((milestone, i) => {
                const Icon = milestoneIcons[i] || Globe;
                const isLeft = i % 2 === 0;
                const dotBg = dotBgColors[i % dotBgColors.length];
                const dotBorder = dotBorderColors[i % dotBorderColors.length];
                const dotShadow = dotShadowColors[i % dotShadowColors.length];
                const colorClass = milestoneColors[i % milestoneColors.length];

                return (
                  <div
                    key={milestone.year}
                    className={`relative flex items-start gap-6 sm:gap-0 ${
                      isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'
                    }`}
                  >
                    {/* Timeline dot - sits on top of line */}
                    <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 z-10">
                      <motion.div
                        className="relative flex items-center justify-center"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        {/* Soft pulse ring - fires once when dot enters view */}
                        {!shouldReduceMotion && (
                          <motion.div
                            className={`absolute rounded-full ${dotBg}`}
                            initial={{ scale: 1, opacity: 0 }}
                            whileInView={{ scale: [1, 1.3, 1.5], opacity: [0.15, 0.06, 0] }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{ width: 48, height: 48 }}
                          />
                        )}

                        <div
                          className={`relative w-12 h-12 rounded-full ${dotBg} flex items-center justify-center border-[3px] ${dotBorder}`}
                          style={{ boxShadow: `0 4px 20px ${dotShadow}` }}
                        >
                          <Icon size={18} className="text-white" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Card */}
                    <div className={`ml-16 sm:ml-0 sm:w-1/2 ${
                      isLeft ? 'sm:pr-16 sm:text-right' : 'sm:pl-16'
                    }`}>
                      <motion.div
                        initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
                        whileHover={shouldReduceMotion ? {} : { y: -4 }}
                      >
                        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
                          {/* Gradient accent */}
                          <div className={`absolute top-0 ${isLeft ? 'right-0' : 'left-0'} w-32 h-32 bg-gradient-to-br ${colorClass} rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity`} />

                          <div className="relative z-10">
                            <span className={`inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary ${isLeft ? 'sm:ml-auto' : ''}`}>
                              {milestone.year}
                            </span>
                            <h3 className="mt-4 text-xl font-semibold text-foreground">
                              {milestone.title}
                            </h3>
                            <p className="mt-2 text-muted-foreground leading-relaxed">
                              {milestone.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
