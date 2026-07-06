import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { BrandIcon } from "@components/ui/BrandIcon";
import { Badge } from "@components/ui/Badge";
import { GitHubStatsOverlay } from "@components/shared/GitHubStatsOverlay";
import { ThemedImage } from "@modules/projects/components/shared/ThemedImage";

export interface Project {
  title: string;
  description: string;
  href: string;
  url: string;
  source: string;
  githubRepo?: string;
  newpage?: boolean;
  image?: string;
  imageDark?: string;
  tags?: string[];
}

interface ProjectCardProps {
  project: Project;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -14;
    const rotateY = (x - 0.5) * 14;
    setTilt({ rotateX, rotateY });
    setGlarePos({ x: x * 100, y: y * 100 });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlarePos({ x: 50, y: 50 });
    setIsHovered(false);
  };

  const navigateToProject = () => {
    if (project.href.startsWith("http")) {
      window.open(project.href, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = project.href;
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;
    navigateToProject();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigateToProject();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.12,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="group relative"
      style={{ perspective: "1000px" }}
    >
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        role="link"
        tabIndex={0}
        aria-label={`Open ${project.title}`}
        className="project-card relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-md transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none dark:border-border/60 dark:bg-card/70"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${isHovered ? 1.02 : 1})`,
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 24px 48px -12px rgba(0,0,0,0.25), 0 0 0 1px color-mix(in oklch, var(--primary) 20%, transparent)"
            : "0 4px 12px -4px rgba(0,0,0,0.1)",
        }}
      >
        {/* Glare overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.12) 0%, transparent 60%)`,
          }}
        />

        {/* Image area */}
        <div className="relative h-44 overflow-hidden sm:h-48">
          {project.image ? (
            <ThemedImage
              lightSrc={project.image}
              darkSrc={project.imageDark}
              alt={project.title}
              width="100%"
              height="100%"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <span className="text-4xl font-bold text-muted-foreground/30">
                {project.title[0]}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />

          <GitHubStatsOverlay githubRepo={project.githubRepo} />
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-1 flex-col p-5 pt-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {project.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="text-[10px] font-medium"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <h3 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
            {project.title}
          </h3>

          <p className="mb-5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>

          <div className="flex items-center gap-2">
            <a
              href={project.url}
              target={project.newpage ? "_blank" : undefined}
              rel={project.newpage ? "noopener noreferrer" : undefined}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              Try
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={project.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={`${project.title} source code`}
            >
              <BrandIcon name="github" size={16} />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
