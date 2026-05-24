'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MagneticButton } from '@components/shared/MagneticButton';
import { getIcon } from '@lib/icons';
import type { CTAData } from '../../types/homepage';

interface EnhancedCTAProps {
  data: CTAData;
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isInView || started) return;
    setStarted(true);

    const startTimeout = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 2000);
        }
      }, 50);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [isInView, text, delay, started]);

  return (
    <h2
      ref={ref}
      className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl xl:text-6xl min-h-[1.2em]"
    >
      {displayText}
      {showCursor && started && (
        <span className="animate-blink text-primary">|</span>
      )}
    </h2>
  );
}

export function EnhancedCTA({ data }: EnhancedCTAProps) {
  const { headline, subtitle, ctas } = data;

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:py-32">
      {/* Radial glow background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, color-mix(in oklch, var(--primary) 10%, transparent) 0%, transparent 70%)`,
        }}
      />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/15"
            style={{
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `cta-float ${10 + Math.random() * 15}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.2 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-4xl text-center"
      >
        <TypewriterText text={headline} delay={300} />

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          {ctas.map((cta, i) => {
            const CtaIcon = cta.icon ? getIcon(cta.icon) : null;
            const isPrimary = cta.variant === 'primary';
            return (
              <MagneticButton
                key={i}
                href={cta.href}
                target={cta.external ? '_blank' : undefined}
                rel={cta.external ? 'noopener noreferrer' : undefined}
                className={`inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-semibold transition-shadow duration-300 active:scale-[0.98] ${
                  isPrimary
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                    : 'border border-input bg-background/60 text-foreground backdrop-blur-md hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {CtaIcon && <CtaIcon className="h-4 w-4" />}
                {cta.text}
              </MagneticButton>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
