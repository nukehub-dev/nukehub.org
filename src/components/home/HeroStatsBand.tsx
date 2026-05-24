import { motion } from 'framer-motion';
import { staggerContainer, viewportOnce } from '@lib/animations';
import { HeroStatCard } from './HeroStatCard';
import type { HeroData } from '../../types/homepage';

interface HeroStatsBandProps {
  stats: HeroData['stats'];
}

export function HeroStatsBand({ stats }: HeroStatsBandProps) {
  return (
    <section className="relative px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
        >
          {stats.map((stat, i) => (
            <HeroStatCard
              key={stat.label}
              iconName={stat.icon}
              value={stat.value}
              numericValue={stat.numericValue}
              label={stat.label}
              index={i}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
