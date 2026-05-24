import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { viewportOnce } from '@lib/animations';
import { ProjectCard } from './ProjectCard';
import { ProjectsCanvas } from '@components/three/ProjectsCanvas';

export interface Project {
  title: string;
  description: string;
  url: string;
  source: string;
  newpage?: boolean;
  image?: string;
  tags?: string[];
}

interface ProjectsGridProps {
  projects: Project[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden py-24 sm:py-32">
      {/* 3D Background Canvas with parallax */}
      <motion.div className="absolute inset-0 -z-10" style={{ y: backgroundY }}>
        <ProjectsCanvas />
      </motion.div>

      {/* Darkening overlay for readability */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/90 via-background/70 to-background/90" />

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Our Ecosystem
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Research & Development
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Open-source tools powering the next generation of nuclear engineering — from data
            visualization to cloud-based simulation.
          </p>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project, i) => (
            <ProjectCard key={project.title} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
