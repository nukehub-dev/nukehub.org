"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Radar,
  Globe,
  TrendingUp,
  Scale,
  Table2,
  ArrowRight,
  ExternalLink,
  Database,
  BookOpen,
  Check,
} from "lucide-react";
import { fadeInUp, staggerContainer, viewportOnce } from "@lib/animations";
import { BrandIcon } from "@components/ui/BrandIcon";
import { TiltCard } from "@modules/projects/components/shared/TiltCard";
import { ThemedImage } from "@modules/projects/components/shared/ThemedImage";
import { FloatingParticles } from "@components/shared/decorations/FloatingParticles";
import type { NrmsData } from "../types";

// ── Color configs ──
const colorConfig: Record<
  string,
  {
    gradient: string;
    iconBg: string;
    iconColor: string;
    accent: string;
    border: string;
  }
> = {
  amber: {
    gradient: "from-amber-500/10 via-transparent to-transparent",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    accent: "#f59e0b",
    border: "group-hover:border-amber-500/30",
  },
  emerald: {
    gradient: "from-emerald-500/10 via-transparent to-transparent",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accent: "#10b981",
    border: "group-hover:border-emerald-500/30",
  },
  sky: {
    gradient: "from-sky-500/10 via-transparent to-transparent",
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
    accent: "#0ea5e9",
    border: "group-hover:border-sky-500/30",
  },
  violet: {
    gradient: "from-violet-500/10 via-transparent to-transparent",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    accent: "#8b5cf6",
    border: "group-hover:border-violet-500/30",
  },
};

// ── Icon resolver ──
const iconComponents: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  Radar,
  Globe,
  TrendingUp,
  Scale,
  Table2,
  ArrowRight,
  ExternalLink,
  Database,
  BookOpen,
};

function resolveIcon(name: string) {
  return iconComponents[name] || Globe;
}

// ── Main Component ──
export function NrmsPage({
  data,
  title,
  titleHighlight,
  description,
}: {
  data: NrmsData;
  title: string;
  titleHighlight: string;
  description: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const HeroIcon = resolveIcon(data.hero.badge.icon);

  return (
    <div className="relative">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in oklch, var(--primary) 6%, transparent), transparent),
            radial-gradient(ellipse 50% 40% at 20% 60%, color-mix(in oklch, var(--primary) 4%, transparent), transparent),
            radial-gradient(ellipse 60% 50% at 80% 80%, color-mix(in oklch, var(--primary) 4%, transparent), transparent)
          `,
        }}
      />

      <div className="relative z-10">
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden">
          <div className="relative z-10 mx-auto max-w-7xl px-4 pt-32 pb-20">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center"
            >
              <motion.div variants={fadeInUp} className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md">
                  <HeroIcon className="h-4 w-4" />
                  {data.hero.badge.text}
                </div>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
              >
                {title}
                <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_60%,var(--foreground))] bg-clip-text text-transparent">
                  {titleHighlight}
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground leading-relaxed"
              >
                {description}
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="mt-10 flex flex-wrap items-center justify-center gap-4"
              >
                {data.hero.ctas.map((cta, i) => {
                  const isPrimary = cta.variant === "primary";
                  const CtaIcon =
                    cta.icon === "github"
                      ? undefined
                      : cta.icon === "external"
                        ? ExternalLink
                        : ArrowRight;
                  return (
                    <a
                      key={i}
                      href={cta.href}
                      target={cta.external ? "_blank" : undefined}
                      rel={cta.external ? "noopener noreferrer" : undefined}
                      className={`group inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition-all duration-300 active:scale-[0.98] ${
                        isPrimary
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                          : "border border-input bg-background/60 text-foreground backdrop-blur-md hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5"
                      }`}
                    >
                      {cta.icon === "github" ? (
                        <BrandIcon name="github" size={16} />
                      ) : CtaIcon ? (
                        <CtaIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      ) : null}
                      {cta.text}
                    </a>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-16"
            >
              <TiltCard className="mx-auto max-w-5xl" tiltAmount={4}>
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-2xl opacity-40" />
                  <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background shadow-2xl shadow-black/10 dark:shadow-black/20">
                    <ThemedImage
                      lightSrc={data.hero.heroImage}
                      darkSrc={data.hero.heroImageDark}
                      alt={data.hero.heroImageAlt}
                      className="w-full"
                      loading="eager"
                    />
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="relative py-24">
          <FloatingParticles count={12} />
          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.h2
                variants={fadeInUp}
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                {data.features.title}
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
              >
                {data.features.description}
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {data.features.items.map((feature) => {
                const Icon = resolveIcon(feature.icon);
                const style = colorConfig[feature.color] || colorConfig.amber;

                return (
                  <motion.div
                    key={feature.title}
                    variants={fadeInUp}
                    whileHover={
                      shouldReduceMotion ? {} : { y: -6, scale: 1.02 }
                    }
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 ${style.border}`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-3/4 transition-all duration-500 rounded-full"
                      style={{ backgroundColor: style.accent }}
                    />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor} transition-transform duration-300 group-hover:scale-110`}
                      >
                        <Icon size={22} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ===== SHOWCASE ===== */}
        <section className="relative py-24 border-t border-border/50">
          <FloatingParticles count={10} />
          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.h2
                variants={fadeInUp}
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                {data.showcase.title}
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
              >
                {data.showcase.description}
              </motion.p>
            </motion.div>

            <div className="space-y-24">
              {data.showcase.items.map((item) => {
                const BadgeIcon = item.badgeIcon
                  ? resolveIcon(item.badgeIcon)
                  : Globe;

                return (
                  <motion.div
                    key={item.name}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                    variants={fadeInUp}
                    className="grid gap-10 items-center lg:grid-cols-2"
                  >
                    <div
                      className={
                        item.reversed ? "order-2" : "order-2 lg:order-1"
                      }
                    >
                      {item.badge && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
                          <BadgeIcon className="h-4 w-4" />
                          {item.badge}
                        </div>
                      )}
                      <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                        {item.name}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed mb-6 text-lg">
                        {item.description}
                      </p>
                      <ul className="space-y-3">
                        {item.features.map((feat) => (
                          <li
                            key={feat}
                            className="flex items-start gap-3 text-muted-foreground"
                          >
                            <Check className="mt-1 h-4 w-4 text-primary shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <motion.div
                      variants={fadeInUp}
                      className={
                        item.reversed ? "order-1" : "order-1 lg:order-2"
                      }
                    >
                      <TiltCard tiltAmount={3}>
                        <div className="relative group">
                          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background shadow-2xl shadow-black/10 dark:shadow-black/20">
                            <div className="flex items-center gap-2 border-b border-border/40 bg-muted/50 px-3 py-2.5">
                              <div className="flex gap-1.5">
                                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                                <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                              </div>
                              <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background/80 border border-border/30 px-3 py-1 text-[11px] text-muted-foreground font-mono">
                                <Globe className="h-3 w-3" />
                                nrms.nukehub.org
                              </div>
                              <div className="w-16" />
                            </div>
                            <div className="relative bg-background">
                              <ThemedImage
                                lightSrc={item.image}
                                darkSrc={item.imageDark}
                                alt={item.imageAlt || item.name}
                                className="w-full"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        </div>
                      </TiltCard>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== DATA SOURCES ===== */}
        <section className="relative py-24 border-t border-border/50">
          <FloatingParticles count={10} />
          <div className="relative z-10 mx-auto max-w-7xl px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.div variants={fadeInUp} className="mb-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Database className="h-7 w-7 text-primary" />
                </div>
              </motion.div>
              <motion.h2
                variants={fadeInUp}
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                {data.dataSources.title}
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
              >
                {data.dataSources.description}
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {data.dataSources.items.map((source) => (
                <motion.a
                  key={source.name}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variants={fadeInUp}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Database className="h-5 w-5" />
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {source.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {source.description}
                  </p>
                </motion.a>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="relative py-24 border-t border-border/50">
          <div className="mx-auto max-w-4xl px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer}
              className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-12 text-center"
            >
              <FloatingParticles count={8} />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative z-10">
                <motion.div variants={fadeInUp} className="mb-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                </motion.div>

                <motion.h2
                  variants={fadeInUp}
                  className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                >
                  {data.cta.title}
                </motion.h2>

                <motion.p
                  variants={fadeInUp}
                  className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground"
                >
                  {data.cta.description}
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="mt-10 flex flex-wrap items-center justify-center gap-4"
                >
                  <a
                    href={data.cta.primary.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                  >
                    {data.cta.primary.icon === "github" ? (
                      <BrandIcon name="github" size={16} />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    {data.cta.primary.text}
                  </a>
                  <a
                    href={data.cta.secondary.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-11 items-center gap-2 rounded-xl border border-input bg-background/60 px-6 text-sm font-semibold text-foreground backdrop-blur-md transition-all hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5"
                  >
                    {data.cta.secondary.icon === "github" ? (
                      <BrandIcon name="github" size={16} />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    {data.cta.secondary.text}
                  </a>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
