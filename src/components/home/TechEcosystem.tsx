import { motion } from 'framer-motion';
import { viewportOnce } from '@lib/animations';
import type { ToolsData } from '../../types/homepage';

interface TechEcosystemProps {
  data: ToolsData;
}

// Each tool gets a unique float animation delay and duration
function getFloatConfig(index: number) {
  return {
    delay: index * 0.7,
    duration: 3 + (index % 3) * 0.8,
    xOffset: (index % 2 === 0 ? 1 : -1) * (3 + (index % 4)),
  };
}

export function TechEcosystem({ data }: TechEcosystemProps) {
  const { sectionTitle, sectionSubtitle, badge, tools } = data;

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-28">
      {/* Gradient separators */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

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

        {/* Floating constellation */}
        <div className="relative mx-auto max-w-3xl">
          {/* Decorative grid pattern */}
          <svg
            className="absolute inset-0 -z-10 h-full w-full opacity-[0.06]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="tech-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tech-grid)" />
          </svg>

          <div className="flex flex-wrap justify-center gap-3">
            {tools.map((tool, i) => {
              const config = getFloatConfig(i);
              return (
                <motion.div
                  key={tool}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={viewportOnce}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.08,
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                  }}
                  animate={{
                    y: [0, -4, 0],
                    x: [0, config.xOffset, 0],
                  }}
                  className="group relative"
                  style={{
                    animation: `float-gentle ${config.duration}s ease-in-out infinite`,
                    animationDelay: `${config.delay}s`,
                  }}
                >
                  <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-lg hover:shadow-primary/5">
                    <span className="relative z-10">{tool}</span>
                    {/* Hover glow */}
                    <div className="absolute inset-0 -z-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    {/* Subtle ring on hover */}
                    <div className="absolute inset-0 rounded-xl ring-1 ring-primary/0 transition-all group-hover:ring-primary/20" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
