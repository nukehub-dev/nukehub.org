import { motion } from 'framer-motion';
import { viewportOnce } from '@lib/animations';
import { getIcon } from '@lib/icons';
import { SpotlightCard } from '@components/shared/SpotlightCard';
import type { MissionData } from '../../types/homepage';

interface MissionStripProps {
  data: MissionData;
}

function PillarCard({ pillar, index }: { pillar: MissionData['pillars'][0]; index: number }) {
  const Icon = getIcon(pillar.icon);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: 8 }}
      whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.215, 0.61, 0.355, 1] }}
      className="h-full"
    >
      <SpotlightCard className="group relative h-full overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-7 backdrop-blur-sm transition-all duration-500 hover:bg-card/70 hover:border-primary/20 sm:p-8">
        {/* Top accent line */}
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Bottom gradient glow on hover */}
        <div
          className="absolute -bottom-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/5 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100"
        />

        <div className="relative flex h-full flex-col">
          {/* Icon with glow */}
          <div className="relative mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-primary/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/12 group-hover:ring-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10">
            {Icon && <Icon className="h-5.5 w-5.5" strokeWidth={1.5} />}
          </div>

          <h3 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
            {pillar.title}
          </h3>

          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
            {pillar.description}
          </p>

          {/* Subtle bottom accent line */}
          <div className="mt-6 h-[2px] w-8 rounded-full bg-primary/20 transition-all duration-500 group-hover:w-12 group-hover:bg-primary/40" />
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function MissionStrip({ data }: MissionStripProps) {
  const { sectionTitle, sectionSubtitle, badge, pillars } = data;

  return (
    <section className="relative px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary">
            {badge}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {sectionTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {sectionSubtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {pillars.map((pillar, i) => (
            <PillarCard key={pillar.title} pillar={pillar} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
