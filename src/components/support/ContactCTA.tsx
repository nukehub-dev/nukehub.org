import { motion } from 'framer-motion';
import { fadeInUp, viewportOnce } from '@lib/animations';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CtaButton {
  text: string;
  href: string;
}

interface Props {
  title: string;
  description: string;
  icon?: string;
  primaryCta: CtaButton;
  secondaryCta: CtaButton;
}

function resolveIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] || Icons.Circle;
}

export function ContactCTA({ title, description, icon = 'Mail', primaryCta, secondaryCta }: Props) {
  const Icon = resolveIcon(icon);
  const PrimaryIcon = resolveIcon('ArrowRight');

  return (
    <section className="py-16 border-t border-border/50">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeInUp}
        className="bubble p-8 sm:p-12 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={26} />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          {description}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={primaryCta.href}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {primaryCta.text}
            <PrimaryIcon size={16} />
          </a>
          <a
            href={secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {secondaryCta.text}
          </a>
        </div>
      </motion.div>
    </section>
  );
}
