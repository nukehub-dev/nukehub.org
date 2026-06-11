"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  Code2,
  Puzzle,
  Globe,
  Monitor,
  Box,
  Eye,
  FlaskConical,
  ArrowRight,
  BookOpen,
  Cpu,
  Layers,
  Check,
  Copy,
  Terminal,
  Sparkles,
  Download,
} from "lucide-react";
import { fadeInUp, staggerContainer, viewportOnce } from "@lib/animations";
import { BrandIcon } from "@components/ui/BrandIcon";
import { TiltCard } from "./TiltCard";
import { LaptopMockup } from "./LaptopMockup";
import { ImageGallery } from "./ImageGallery";
import { FloatingParticles } from "@components/shared/decorations/FloatingParticles";
import type { NukeideData } from "../types";

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
  Code2,
  Puzzle,
  Globe,
  Monitor,
  Box,
  Eye,
  FlaskConical,
  Cpu,
  Layers,
  BookOpen,
  Terminal,
  Sparkles,
  Check,
  Copy,
  Download,
};

function resolveIcon(name: string) {
  return iconComponents[name] || Code2;
}

// ── Animated counter ──
function AnimatedCounter({ value, label }: { value: string; label: string }) {
  const [displayValue, setDisplayValue] = useState("0");
  const numericPart = parseInt(value.replace(/\D/g, ""), 10);
  const suffix = value.replace(/[0-9]/g, "");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }
    let start = 0;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.floor(eased * numericPart);
      setDisplayValue(start + suffix);
      if (progress < 1) requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    const el = document.getElementById(`stat-${label}`);
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [numericPart, suffix, label, shouldReduceMotion]);

  return (
    <motion.div
      id={`stat-${label}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_60%,var(--foreground))] bg-clip-text text-transparent">
          {displayValue}
        </div>
        <div className="mt-2 text-sm text-muted-foreground font-medium">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

// ── Code block with copy ──
function CodeBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <div className="relative group">
      <div className="overflow-x-auto rounded-lg bg-[#0d1117] border border-border/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
          <div className="ml-auto">
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <code className="text-sm font-mono text-[#e6edf3]">
          <span className="text-[#7ee787]">$</span> {command}
        </code>
      </div>
    </div>
  );
}

// ── Browser mockup frame ──
function BrowserMockup({
  children,
  url = "localhost:3000",
}: {
  children: React.ReactNode;
  url?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background shadow-2xl shadow-black/10 dark:shadow-black/20">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/50 px-3 py-2.5 backdrop-blur-sm">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background/80 border border-border/30 px-3 py-1 text-[11px] text-muted-foreground font-mono">
          <Globe className="h-3 w-3" />
          {url}
        </div>
        <div className="w-16" />
      </div>
      <div className="relative bg-background">{children}</div>
    </div>
  );
}

// ── Tabbed Getting Started ──
function GettingStartedTabs({
  tabs,
}: {
  tabs: NukeideData["gettingStarted"]["tabs"];
}) {
  const [activeTab, setActiveTab] = useState(0);
  const activeTabData = tabs[activeTab];
  const Icon = resolveIcon(activeTabData.icon);

  return (
    <div className="space-y-6">
      {/* Tab buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((tab, idx) => {
          const TabIcon = resolveIcon(tab.icon);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(idx)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                idx === activeTab
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card/50 text-muted-foreground hover:text-foreground border border-border/60 hover:border-primary/30"
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTabData.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {activeTabData.label}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTabData.description}
            </p>
          </div>
        </div>

        {activeTabData.download && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-medium text-foreground">
                  {activeTabData.download.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {activeTabData.download.description}
                </p>
              </div>
              <a
                href={activeTabData.download.href}
                target={activeTabData.download.external ? "_blank" : undefined}
                rel={
                  activeTabData.download.external
                    ? "noopener noreferrer"
                    : undefined
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105"
              >
                <Download className="h-4 w-4" />
                {activeTabData.download.text}
              </a>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {activeTabData.steps.map((step) => (
            <div key={step.number}>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {step.number}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {step.title}
                </span>
              </div>
              <CodeBlock command={step.command} />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Prerequisites:</span>{" "}
            {activeTabData.prerequisites}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Component ──
export function NukeidePage({
  data,
  title,
  titleHighlight,
  description,
}: {
  data: NukeideData;
  title: string;
  titleHighlight: string;
  description: string;
}) {
  const shouldReduceMotion = useReducedMotion();

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
                  <Code2 className="h-4 w-4" />
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
                      ) : cta.icon === "download" ? (
                        <Download className="h-4 w-4" />
                      ) : (
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      )}
                      {cta.text}
                    </a>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* Hero Screenshot with laptop mockup */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-16"
            >
              <TiltCard className="mx-auto max-w-5xl" tiltAmount={4}>
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-2xl opacity-40" />
                  <LaptopMockup>
                    <img
                      src={data.hero.heroImage}
                      alt={data.hero.heroImageAlt}
                      className="w-full"
                      loading="eager"
                    />
                  </LaptopMockup>
                </div>
              </TiltCard>
            </motion.div>
          </div>
          {/* STATS */}

          <div className="mx-auto max-w-4xl px-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {data.stats.map((stat) => (
                <AnimatedCounter
                  key={stat.label}
                  value={stat.value}
                  label={stat.label}
                />
              ))}
            </div>
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
              {data.features.items.map((feature, i) => {
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

        {/* ===== EXTENSIONS ===== */}
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
                {data.extensions.title}
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
              >
                {data.extensions.description}
              </motion.p>
            </motion.div>

            <div className="space-y-32">
              {data.extensions.items.map((ext) => {
                const BadgeIcon = resolveIcon(ext.badgeIcon);
                const hasImage = !ext.noImage && (ext.image || ext.images);

                return (
                  <motion.div
                    key={ext.name}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                    variants={fadeInUp}
                    className={`grid gap-10 items-center ${
                      hasImage ? "lg:grid-cols-2" : ""
                    }`}
                  >
                    {/* Text content */}
                    <div
                      className={
                        ext.reversed
                          ? "order-2 lg:order-1"
                          : "order-2 lg:order-1"
                      }
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
                        <BadgeIcon className="h-4 w-4" />
                        {ext.badge}
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                        {ext.name}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed mb-6 text-lg">
                        {ext.description}
                      </p>
                      <ul className="space-y-3">
                        {ext.features.map((feat) => (
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

                    {/* Image content */}
                    {hasImage && (
                      <motion.div
                        variants={fadeInUp}
                        className={
                          ext.reversed
                            ? "order-1 lg:order-2"
                            : "order-1 lg:order-2"
                        }
                      >
                        {ext.gallery && ext.images ? (
                          <ImageGallery images={ext.images} />
                        ) : ext.image ? (
                          <TiltCard tiltAmount={3}>
                            <div className="relative group">
                              <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                              <BrowserMockup>
                                <img
                                  src={ext.image}
                                  alt={ext.imageAlt || ""}
                                  className="w-full"
                                  loading="lazy"
                                />
                              </BrowserMockup>
                            </div>
                          </TiltCard>
                        ) : null}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== ARCHITECTURE ===== */}
        <section className="relative py-24 border-t border-border/50">
          <div className="mx-auto max-w-7xl px-4">
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
                {data.deployment.title}
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
              >
                {data.deployment.description}
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer}
              className="grid gap-6 sm:grid-cols-3"
            >
              {data.deployment.items.map((item) => {
                const Icon = resolveIcon(item.icon);
                return (
                  <motion.div
                    key={item.title}
                    variants={fadeInUp}
                    className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-8 backdrop-blur-sm text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ===== GETTING STARTED ===== */}
        <section
          id="getting-started"
          className="relative py-24 border-t border-border/50"
        >
          <FloatingParticles count={16} />

          <div className="relative z-10 mx-auto max-w-4xl px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer}
              className="text-center mb-12"
            >
              <motion.div variants={fadeInUp} className="mb-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Terminal className="h-7 w-7 text-primary" />
                </div>
              </motion.div>
              <motion.h2
                variants={fadeInUp}
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                {data.gettingStarted.title}
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground"
              >
                {data.gettingStarted.description}
              </motion.p>
            </motion.div>

            <GettingStartedTabs tabs={data.gettingStarted.tabs} />
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
                    <Sparkles className="h-8 w-8 text-primary" />
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
                    <BrandIcon name="github" size={16} />
                    {data.cta.primary.text}
                  </a>
                  <a
                    href={data.cta.secondary.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-11 items-center gap-2 rounded-xl border border-input bg-background/60 px-6 text-sm font-semibold text-foreground backdrop-blur-md transition-all hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5"
                  >
                    <BookOpen className="h-4 w-4" />
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
