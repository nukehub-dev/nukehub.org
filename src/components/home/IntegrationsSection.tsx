import { motion } from 'framer-motion';
import { viewportOnce } from '@lib/animations';
import { TokamakCanvas } from '@components/three/TokamakCanvas';
import type { IntegrationsData } from '../../types/homepage';

interface IntegrationsSectionProps {
  data: IntegrationsData;
}

export function IntegrationsSection({ data }: IntegrationsSectionProps) {
  const { sectionTitle, sectionSubtitle, badge, tools } = data;

  return (
    <section
      className="relative isolate overflow-hidden px-4 py-40 sm:py-52 lg:py-64"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
    >
      {/* Three.js background — visible in both modes, text protected by gradients */}
      <div className="absolute inset-0 -z-20 opacity-100 pointer-events-none">
        <TokamakCanvas />
      </div>

      {/* Top fade — light to let canvas show through */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/40 to-transparent" />

      {/* Bottom fade for text readability */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/40 to-transparent" />

      {/* Subtle center tint to keep text readable without washing out canvas */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-background/30 to-transparent" />

      <div className="relative mx-auto max-w-5xl">
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

        {/* Tool pills */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {tools.map((tool, i) => (
            <motion.div
              key={tool}
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
              <div className="relative overflow-hidden rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-md shadow-black/[0.04] transition-all duration-500 hover:-translate-y-1 hover:border-primary/30 hover:bg-card hover:shadow-lg hover:shadow-primary/[0.08] dark:border-border/30 dark:bg-card/50 dark:shadow-sm dark:backdrop-blur-xl dark:hover:border-primary/25 dark:hover:bg-card/70 dark:hover:shadow-xl dark:hover:shadow-primary/[0.06] sm:text-base sm:px-8 sm:py-3.5">
                {/* Top edge glow */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:via-primary/20" />

                {/* Radial glow */}
                <div className="pointer-events-none absolute -bottom-10 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full bg-primary/[0.1] opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100 dark:bg-primary/5" />

                <span className="relative z-10">{tool}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
