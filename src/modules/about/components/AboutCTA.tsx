"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@lib/animations";
import { ArrowRight } from "lucide-react";
import { SoftGlow } from "./decorations/SoftGlow";

interface CtaButton {
  text: string;
  href: string;
}

interface Props {
  title: string;
  description: string;
  primaryCta: CtaButton;
  secondaryCta: CtaButton;
}

export function AboutCTA({
  title,
  description,
  primaryCta,
  secondaryCta,
}: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="pt-16 pb-24 relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="relative">
            {/* Card */}
            <div className="bubble relative overflow-hidden rounded-3xl p-10 sm:p-14 text-center">
              {/* Soft ambient glow */}
              <SoftGlow />

              {/* Warm inner glow */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, color-mix(in oklch, var(--primary) 20%, transparent) 0%, transparent 70%)",
                }}
                animate={
                  shouldReduceMotion
                    ? {}
                    : {
                        scale: [1, 1.2, 1],
                        opacity: [0.15, 0.25, 0.15],
                      }
                }
                transition={
                  shouldReduceMotion
                    ? undefined
                    : {
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                }
              />

              {/* Subtle top accent line */}
              <div className="absolute top-0 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

              <div className="relative z-10">
                <motion.h2
                  variants={fadeInUp}
                  className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                >
                  {title}
                </motion.h2>

                <motion.p
                  variants={fadeInUp}
                  className="mt-4 text-muted-foreground max-w-xl mx-auto text-base leading-relaxed"
                >
                  {description}
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                  <a
                    href={primaryCta.href}
                    className="group inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                  >
                    {primaryCta.text}
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </a>
                  <a
                    href={secondaryCta.href}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-7 py-3.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:border-primary/20 active:scale-[0.98]"
                  >
                    {secondaryCta.text}
                  </a>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
