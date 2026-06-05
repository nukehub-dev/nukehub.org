import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SupportMethod {
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
}

interface Props {
  methods: SupportMethod[];
}

function resolveIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] || Icons.Circle;
}

export function SupportMethods({ methods }: Props) {
  return (
    <section className="py-16 border-t border-border/50">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="text-center mb-12">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            How to Support Us
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Choose the way that works best for you — every form of support makes a difference.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {methods.map((method) => {
            const Icon = resolveIcon(method.icon);
            return (
              <motion.div
                key={method.title}
                variants={fadeInUp}
                className="bubble p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-foreground">{method.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
                    {method.description}
                  </p>
                  <a
                    href={method.href}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {method.cta}
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
