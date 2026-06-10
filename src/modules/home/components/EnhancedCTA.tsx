"use client";

import { motion } from "framer-motion";
import { MagneticButton } from "@components/shared/MagneticButton";
import { getIcon } from "@lib/icons";
import { CTACanvas } from "@modules/home/components/three/CTACanvas";
import type { CTAData } from "@modules/home/types";

interface EnhancedCTAProps {
  data: CTAData;
}

export function EnhancedCTA({ data }: EnhancedCTAProps) {
  const { badge, headline, subtitle, ctas } = data;

  return (
    <section className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden px-4 py-16 snap-section">
      {/* Three.js energy field background */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <CTACanvas />
      </div>

      {/* Radial glow overlay */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 70%)`,
        }}
      />

      {/* Bottom fade to prevent canvas bleeding into footer */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
        className="relative mx-auto max-w-4xl text-center"
      >
        {/* Badge */}
        {badge && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md"
          >
            {badge}
          </motion.span>
        )}

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl xl:text-6xl"
        >
          {headline}
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
        >
          {subtitle}
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          {ctas.map((cta, i) => {
            const CtaIcon = cta.icon ? getIcon(cta.icon) : null;
            const isPrimary = cta.variant === "primary";
            return (
              <MagneticButton
                key={i}
                href={cta.href}
                target={cta.external ? "_blank" : undefined}
                rel={cta.external ? "noopener noreferrer" : undefined}
                className={`inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-semibold transition-all duration-300 active:scale-[0.98] ${
                  isPrimary
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                    : "border border-input bg-background/60 text-foreground backdrop-blur-md hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5"
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
