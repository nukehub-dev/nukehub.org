"use client";

import { motion } from "framer-motion";
import { viewportOnce } from "@lib/animations";

import { InstitutionsCanvas } from "@modules/home/components/three/InstitutionsCanvas";
import type { TrustData } from '@modules/home/types';

interface InstitutionsSectionProps {
  data: TrustData;
}

/* ------------------------------------------------------------------ */
// Section
/* ------------------------------------------------------------------ */
export function InstitutionsSection({ data }: InstitutionsSectionProps) {
  const { sectionTitle, institutions } = data;

  return (
    <section
      className="relative isolate flex min-h-[100dvh] flex-col justify-center overflow-hidden px-4 py-20 snap-section"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
      }}
    >
      {/* Milky Way galaxy background — subtle in light, full in dark */}
      <div className="absolute inset-0 -z-20 opacity-30 dark:opacity-100 pointer-events-none transition-opacity duration-700">
        <InstitutionsCanvas />
      </div>

      {/* Ambient primary glow underneath */}
      <div className="absolute inset-0 -z-[15] overflow-hidden pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] dark:opacity-[0.15]"
          style={{
            background:
              "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Top fade */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-transparent to-transparent" />

      {/* Bottom fade */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-transparent to-transparent" />

      {/* Center readability tint */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-background/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
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
            Our Network
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
            Trusted by world-class research institutions, national laboratories,
            and international organizations advancing nuclear science.
          </motion.p>
        </motion.div>

        {/* Institution pills */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {institutions.map((inst, i) => (
            <motion.div
              key={inst}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={viewportOnce}
              transition={{
                duration: 0.5,
                delay: i * 0.06,
                ease: [0.215, 0.61, 0.355, 1],
              }}
              className="group"
            >
              <div className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-md shadow-black/[0.04] transition-all duration-500 hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg hover:shadow-primary/[0.08] dark:border-border/60 dark:bg-card/85 dark:shadow-sm dark:hover:border-primary/30 dark:hover:bg-card dark:hover:shadow-xl dark:hover:shadow-primary/[0.08] sm:text-base sm:px-8 sm:py-3.5">
                {/* Top edge glow */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:via-primary/20" />

                {/* Radial glow */}
                <div className="pointer-events-none absolute -bottom-10 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full bg-primary/[0.1] opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100 dark:bg-primary/5" />

                <span className="relative z-10">{inst}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
