import { motion } from 'framer-motion';
import { viewportOnce } from '@lib/animations';
import { Atom } from 'lucide-react';

interface ProjectsHeroProps {
  projectCount: number;
  integrationCount: number;
}

export function ProjectsHero({ projectCount, integrationCount }: ProjectsHeroProps) {
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-20">
      {/* Background glow */}
      <div
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06] blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 60%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Atom size={14} />
            Open Source Ecosystem
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Research & Development
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Open-source tools powering the next generation of nuclear engineering — from data
            visualization to cloud-based simulation.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
          className="mt-12 flex flex-wrap justify-center gap-8 sm:gap-16"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{projectCount}</div>
            <div className="text-sm text-muted-foreground">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{integrationCount}</div>
            <div className="text-sm text-muted-foreground">Integrations</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">Open</div>
            <div className="text-sm text-muted-foreground">Source</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
