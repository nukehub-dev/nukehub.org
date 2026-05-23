import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import { ArrowRight, GitBranch, Users, Atom } from 'lucide-react';
import { HeroCanvas } from '@components/three/HeroCanvas';
import { HeroStatCard } from './HeroStatCard';

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 -z-10">
        <HeroCanvas />
      </div>

      {/* Gradient overlays for readability */}
      {/* Left-to-right: darker on left for text, transparent on right for scene */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/70 to-background/30" />
      {/* Top-to-bottom: subtle fade for header area */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-transparent to-background/80" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: Text Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Open Source Nuclear Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
            >
              Engineering the{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary)_65%,var(--foreground))] bg-clip-text text-transparent">
                  Future
                </span>
              </span>{' '}
              of Nuclear Technology
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
            >
              A pioneering open-source platform dedicated to the exploration,
              simulation, and advancement of nuclear engineering through global
              collaboration.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <a
                href="/projects"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-7 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-xl hover:shadow-primary/25 active:translate-y-[1px]"
              >
                Explore Projects
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="/about"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-background/60 px-7 text-sm font-medium text-foreground backdrop-blur-md transition-all duration-200 hover:-translate-y-[2px] hover:bg-accent hover:text-accent-foreground active:translate-y-[1px]"
              >
                Learn More
              </a>
            </motion.div>
          </motion.div>

          {/* Right: Spacer for desktop (scene shows through on right side) */}
          <div className="hidden lg:block" aria-hidden="true" />
        </div>

        {/* Bottom: Glassmorphism Stat Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <HeroStatCard
            icon={Atom}
            value="12+"
            label="Active Projects"
          />
          <HeroStatCard
            icon={GitBranch}
            value="850+"
            label="Contributions"
          />
          <HeroStatCard
            icon={Users}
            value="Global"
            label="Community"
          />
        </motion.div>
      </div>
    </section>
  );
}
