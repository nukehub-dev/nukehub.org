import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { viewportOnce } from "@lib/animations";
import { ProjectCard } from "./ProjectCard";
import { ProjectsCanvas } from "@modules/home/components/three/ProjectsCanvas";

export interface Project {
  title: string;
  description: string;
  url: string;
  source: string;
  githubRepo?: string;
  newpage?: boolean;
  image?: string;
  tags?: string[];
}

interface ProjectsGridProps {
  projects: Project[];
  totalCount?: number;
  viewAllHref?: string;
}

export function ProjectsGrid({
  projects,
  totalCount,
  viewAllHref,
}: ProjectsGridProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[100dvh] flex-col justify-center overflow-hidden py-16 snap-section"
    >
      {/* 3D Background Canvas with parallax */}
      <motion.div
        className="absolute inset-0 -z-20"
        style={{
          y: backgroundY,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <ProjectsCanvas />
      </motion.div>

      {/* Semi-transparent overlay so canvas shows through */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background/75" />

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{
            duration: 0.7,
            ease: [0.215, 0.61, 0.355, 1],
          }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md">
            Our Ecosystem
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Research & Development
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Open-source tools powering the next generation of nuclear
            engineering — from data visualization to cloud-based simulation.
          </p>
        </motion.div>

        {/* Projects Grid */}
        <div className="flex flex-wrap justify-center gap-6">
          {projects.map((project, i) => (
            <div
              key={project.title}
              className="flex w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
            >
              <ProjectCard project={project} index={i} />
            </div>
          ))}
        </div>

        {/* View All Link */}
        {viewAllHref && totalCount && totalCount > projects.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <a
              href={viewAllHref}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-6 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30"
            >
              View All {totalCount} Projects
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
