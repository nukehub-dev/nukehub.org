'use client';

import { motion } from 'framer-motion';
import { viewportOnce } from '@lib/animations';
import type { TrustData } from '../../types/homepage';

interface TrustLogosProps {
  data: TrustData;
}

export function TrustLogos({ data }: TrustLogosProps) {
  const { sectionTitle, institutions } = data;

  return (
    <section className="relative overflow-hidden px-4 py-12 sm:py-16">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/60"
        >
          {sectionTitle}
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-16">
          {institutions.map((inst, i) => (
            <motion.div
              key={inst}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="text-lg font-bold tracking-tight text-muted-foreground/40 transition-colors duration-300 hover:text-muted-foreground/70 sm:text-xl"
            >
              {inst}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
