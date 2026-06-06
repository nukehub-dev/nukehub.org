'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce, slideInLeft, slideInRight } from '@lib/animations';
import { Rocket, Users, Globe, type LucideIcon } from 'lucide-react';

interface Milestone {
  year: string;
  title: string;
  description: string;
}

interface Props {
  title: string;
  subtitle?: string;
  milestones: Milestone[];
}

const milestoneIcons: LucideIcon[] = [Rocket, Users, Globe];

const milestoneColors = [
  'from-amber-500/20 to-transparent',
  'from-emerald-500/20 to-transparent',
  'from-sky-500/20 to-transparent',
];

const dotBgColors = ['bg-amber-500', 'bg-emerald-500', 'bg-sky-500'];
const dotBorderColors = ['border-amber-600', 'border-emerald-600', 'border-sky-600'];
const dotShadowColors = [
  'rgba(245,158,11,0.35)',
  'rgba(16,185,129,0.35)',
  'rgba(14,165,233,0.35)',
];

const lineColors = [
  'bg-gradient-to-b from-amber-500/60 via-emerald-500/60 to-sky-500/60',
  'bg-gradient-to-b from-emerald-500/60 via-sky-500/60 to-amber-500/60',
  'bg-gradient-to-b from-sky-500/60 via-amber-500/60 to-emerald-500/60',
];

export function StoryTimeline({ title, subtitle, milestones }: Props) {
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
          <motion.div variants={fadeInUp} className="text-center mb-16">
            {subtitle && (
              <p className="text-sm font-medium text-primary uppercase tracking-wider">{subtitle}</p>
            )}
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
          </motion.div>

          <div className="relative">
            {/* Animated vertical line */}
            <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px sm:-translate-x-px overflow-hidden">
              <motion.div
                className={`w-full h-full ${lineColors[0]}`}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ transformOrigin: 'top' }}
              />
            </div>

            <div className="space-y-16">
              {milestones.map((milestone, i) => {
                const Icon = milestoneIcons[i] || Globe;
                const isLeft = i % 2 === 0;
                const colorClass = milestoneColors[i % milestoneColors.length];

                return (
                  <motion.div
                    key={milestone.year}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    variants={isLeft ? slideInLeft : slideInRight}
                    className={`relative flex items-start gap-6 sm:gap-0 ${
                      isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 z-10">
                      <motion.div
                        className={`w-12 h-12 rounded-full ${dotBgColors[i % dotBgColors.length]} shadow-lg flex items-center justify-center border-[3px] ${dotBorderColors[i % dotBorderColors.length]}`}
                        style={{ boxShadow: `0 4px 20px ${dotShadowColors[i % dotShadowColors.length]}` }}
                        initial={shouldReduceMotion ? {} : { scale: 0 }}
                        whileInView={shouldReduceMotion ? {} : { scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <Icon size={18} className="text-white" />
                      </motion.div>
                    </div>

                    {/* Card */}
                    <div className={`ml-16 sm:ml-0 sm:w-1/2 ${
                      isLeft ? 'sm:pr-16 sm:text-right' : 'sm:pl-16'
                    }`}>
                      <motion.div
                        className="group relative"
                        whileHover={shouldReduceMotion ? {} : { y: -4 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
                          {/* Gradient accent */}
                          <div className={`absolute top-0 ${isLeft ? 'right-0' : 'left-0'} w-32 h-32 bg-gradient-to-br ${colorClass} rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity`} />
                          <div className={`absolute top-0 ${isLeft ? 'right-0' : 'left-0'} w-20 h-px bg-gradient-to-r ${isLeft ? 'from-transparent to-primary/40' : 'from-primary/40 to-transparent'}`} />

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
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
