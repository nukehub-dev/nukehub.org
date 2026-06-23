"use client";

import { motion } from "framer-motion";
import { viewportOnce } from "@lib/animations";
import { MessageSquare } from "lucide-react";

import { TestimonialsCanvas } from "@modules/home/components/three/TestimonialsCanvas";
import { TestimonialCarousel } from "./TestimonialCarousel";
import type { TestimonialsSectionData } from "@modules/home/types";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

interface TestimonialsSectionProps {
  data: TestimonialsSectionData;
  testimonials: Testimonial[];
}

/* ------------------------------------------------------------------ */
// Empty state
/* ------------------------------------------------------------------ */
function TestimonialsEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-border/40 bg-background/40 p-8 text-center shadow-lg backdrop-blur-xl sm:p-12"
    >
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <MessageSquare className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-foreground">
        Be the first to share your story
      </h3>
      <p className="mt-2 text-muted-foreground">
        We&apos;re collecting experiences from researchers and engineers using
        NukeHub. Want to be featured?
      </p>
      <a
        href="/contact"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Share your experience
      </a>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
// Section
/* ------------------------------------------------------------------ */
export function TestimonialsSection({
  data,
  testimonials,
}: TestimonialsSectionProps) {
  const { sectionTitle, sectionSubtitle, badge } = data;

  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col justify-center overflow-hidden px-4 py-16 snap-section">
      {/* Three.js ambient background with edge fade */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
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
          transition={{
            duration: 0.6,
            ease: [0.215, 0.61, 0.355, 1],
          }}
          className="mb-16 text-center sm:mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md"
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

        {/* 3D Carousel or empty-state CTA */}
        {testimonials.length > 0 ? (
          <TestimonialCarousel testimonials={testimonials} />
        ) : (
          <TestimonialsEmptyState />
        )}
      </div>
    </section>
  );
}
