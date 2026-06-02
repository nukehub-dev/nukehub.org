import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import { HeroCanvas } from '@components/three/HeroCanvas';
import { ScrollIndicator } from '@components/shared/ScrollIndicator';
import { SplitText } from '@components/shared/SplitText';
import { MagneticButton } from '@components/shared/MagneticButton';
import { getIcon } from '@lib/icons';
import type { HeroData } from '../../types/homepage';

interface HeroSectionProps {
  data: HeroData;
}

export function HeroSection({ data }: HeroSectionProps) {
  const { badge, headline, subtitle, ctas } = data;

  return (
    <section className="relative isolate flex min-h-[85dvh] flex-col items-center justify-center overflow-hidden px-4 pt-32 sm:pt-36 lg:pt-40">
      {/* 3D Canvas Background — subtle in light mode, full in dark mode */}
      <div className="absolute inset-0 -z-20 opacity-[0.28] dark:opacity-100 transition-opacity duration-700">
        <HeroCanvas />
      </div>

      {/* Top fade */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-transparent to-transparent" />

      {/* Bottom fade for text readability */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/90 to-transparent" />

      {/* Content */}
      <div className="relative mx-auto w-full max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="flex flex-col items-center text-center"
        >
          {/* Badge */}
          <motion.div variants={fadeInUp}>
            <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm">
              {badge.showLiveDot && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
              )}
              {badge.text}
            </span>
          </motion.div>

          {/* Headline with kinetic typography */}
          <h1 className="perspective-text max-w-5xl text-5xl font-extrabold tracking-tighter text-foreground sm:text-6xl md:text-6xl lg:text-7xl xl:text-8xl">
            <span className="block">
              <SplitText text={headline.line1.prefix} delay={0.2} staggerDelay={0.05} />
              <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_60%,var(--foreground))] bg-clip-text text-transparent">
                <SplitText text={headline.line1.highlight} delay={0.45} staggerDelay={0.06} />
              </span>
            </span>
            <span className="block mt-1 sm:mt-2">
              <SplitText text={headline.line2} delay={0.7} staggerDelay={0.05} />
            </span>
          </h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeInUp}
            className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            {subtitle}
          </motion.p>

          {/* CTAs with magnetic effect */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            {ctas.map((cta, i) => {
              const CtaIcon = cta.icon ? getIcon(cta.icon) : null;
              const isPrimary = cta.variant === 'primary';
              return (
                <MagneticButton
                  key={i}
                  href={cta.href}
                  className={`group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-sm font-semibold transition-shadow duration-300 active:scale-[0.98] ${
                    isPrimary
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                      : 'border border-input bg-background/60 text-foreground backdrop-blur-md hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {cta.text}
                  {CtaIcon && <CtaIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
                </MagneticButton>
              );
            })}
          </motion.div>

          {/* Scroll indicator */}
          <div className="mt-6">
            <ScrollIndicator />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
