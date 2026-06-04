'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import { Zap, Factory, GraduationCap, Handshake, type LucideIcon } from 'lucide-react';

interface SDG {
  number: string;
  title: string;
  description: string;
  color: string;
}

interface Props {
  title: string;
  subtitle: string;
  description: string;
  goals: SDG[];
  closingText: string;
}

const sdgIcons: LucideIcon[] = [Zap, Factory, GraduationCap, Handshake];

export function SDGsSection({ title, subtitle, description, goals, closingText }: Props) {
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
            <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
              {description}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {goals.map((goal, i) => {
              const Icon = sdgIcons[i] || Zap;

              return (
                <motion.div
                  key={goal.number}
                  variants={fadeInUp}
                  whileHover={shouldReduceMotion ? {} : { y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                >
                  {/* Color-coded left border strip */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300 group-hover:w-1.5"
                    style={{ backgroundColor: goal.color }}
                  />

                  {/* Subtle color tint on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500"
                    style={{ backgroundColor: goal.color }}
                  />

                  <div className="flex gap-5 p-6 sm:p-7">
                    {/* SDG Number Badge */}
                    <div className="flex-shrink-0">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-xl text-white font-bold text-lg shadow-lg transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: goal.color }}
                      >
                        {goal.number}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{goal.title}</h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {goal.description}
                      </p>
                    </div>

                    {/* Icon */}
                    <div className="hidden sm:flex flex-shrink-0 h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-primary/40 transition-colors duration-300 group-hover:text-primary/70 group-hover:bg-primary/10">
                      <Icon size={18} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Closing quote */}
          <motion.div
            variants={fadeInUp}
            className="mt-16 max-w-3xl mx-auto text-center"
          >
            <div className="relative inline-block py-6">
              {/* Opening quote mark — floating */}
              <motion.span
                className="absolute top-1 left-0 sm:-left-4 text-4xl sm:text-5xl text-primary/20 leading-none select-none"
                animate={shouldReduceMotion ? {} : {
                  y: [0, -8, 0],
                }}
                transition={shouldReduceMotion ? undefined : {
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                &ldquo;
              </motion.span>

              <motion.p
                className="text-xl sm:text-2xl text-foreground/85 leading-relaxed italic px-4"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {closingText}
              </motion.p>

              {/* Closing quote mark — floating */}
              <motion.span
                className="absolute bottom-1 right-0 sm:-right-4 text-4xl sm:text-5xl text-primary/20 leading-none select-none"
                animate={shouldReduceMotion ? {} : {
                  y: [0, -8, 0],
                }}
                transition={shouldReduceMotion ? undefined : {
                  duration: 4,
                  delay: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                &rdquo;
              </motion.span>
            </div>

            {/* Simple divider */}
            <motion.div
              className="mt-10 mx-auto w-12 h-px bg-primary/30"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
