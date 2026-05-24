'use client';

import { motion } from 'framer-motion';
import { viewportOnce } from '@lib/animations';
import { Quote } from 'lucide-react';
import type { TestimonialsData } from '../../types/homepage';

interface TestimonialsSectionProps {
  data: TestimonialsData;
}

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: TestimonialsData['testimonials'][0];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, x: index === 1 ? 0 : index === 0 ? -20 : 20 }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={viewportOnce}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      className="group relative"
    >
      <div className="relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-card/80 hover:border-primary/20 sm:p-8">
        {/* Quote icon */}
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Quote className="h-5 w-5" />
        </div>

        {/* Quote text */}
        <p className="mb-6 text-sm leading-relaxed text-foreground/90 sm:text-base">
          &ldquo;{testimonial.quote}&rdquo;
        </p>

        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {testimonial.avatar}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{testimonial.author}</div>
            <div className="text-xs text-muted-foreground">{testimonial.role}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection({ data }: TestimonialsSectionProps) {
  const { sectionTitle, sectionSubtitle, badge, testimonials } = data;

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            {badge}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {sectionTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {sectionSubtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.author} testimonial={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
