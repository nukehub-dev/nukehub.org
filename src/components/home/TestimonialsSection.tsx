'use client';

import { motion } from 'framer-motion';
import { viewportOnce } from '@lib/animations';

import { TestimonialsCanvas } from '@components/three/TestimonialsCanvas';
import { TestimonialCarousel } from './TestimonialCarousel';
import type { TestimonialsData, TrustData } from '../../types/homepage';

interface TestimonialsSectionProps {
  data: TestimonialsData;
  trustData?: TrustData;
}

/* ------------------------------------------------------------------ */
// Section
/* ------------------------------------------------------------------ */
export function TestimonialsSection({ data, trustData }: TestimonialsSectionProps) {
  const { sectionTitle, sectionSubtitle, badge, testimonials } = data;

  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col justify-center overflow-hidden px-4 py-16 snap-section">
      {/* Three.js ambient background with edge fade */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)',
        }}
      >
        <TestimonialsCanvas />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
          className="mb-16 text-center sm:mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
          >
            {badge}
          </motion.span>

          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {sectionTitle}
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            {sectionSubtitle}
          </motion.p>
        </motion.div>

        {/* 3D Carousel */}
        <TestimonialCarousel testimonials={testimonials} />

        {/* Trust logos */}
        {trustData && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-20 pt-12"
          >
            <p className="mb-8 text-center text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 dark:text-muted-foreground/90">
              {trustData.sectionTitle}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-16">
              {trustData.institutions.map((inst, i) => (
                <motion.div
                  key={inst}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportOnce}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.215, 0.61, 0.355, 1] }}
                  className="text-lg font-bold tracking-tight text-muted-foreground/40 transition-all duration-500 hover:scale-105 hover:text-foreground dark:text-muted-foreground/60 dark:hover:text-foreground sm:text-xl"
                >
                  {inst}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
