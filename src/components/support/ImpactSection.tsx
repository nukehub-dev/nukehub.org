import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ImpactItem {
  icon: string;
  title: string;
  description: string;
}

interface Props {
  items: ImpactItem[];
}

function resolveIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] || Icons.Circle;
}

export function ImpactSection({ items }: Props) {
  return (
    <section className="py-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="text-center mb-12">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            The Impact of Your Support
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Every contribution directly fuels the growth and success of NukeHub.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = resolveIcon(item.icon);
            return (
              <motion.div
                key={item.title}
                variants={fadeInUp}
                className="bubble-solid p-6 text-center transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-medium text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
