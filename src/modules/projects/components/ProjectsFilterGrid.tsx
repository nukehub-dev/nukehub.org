import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Tag, ArrowUpRight } from "lucide-react";
import { Badge } from "@components/ui/Badge";
import { SearchInput } from "@components/ui/SearchInput";
import { GitHubStatsOverlay } from "@components/shared/GitHubStatsOverlay";
import { viewportOnce } from "@lib/animations";

export interface Project {
  title: string;
  description: string;
  url: string;
  source: string;
  slug: string;
  githubRepo?: string;
  newpage?: boolean;
  image?: string;
  tags?: string[];
}

interface ProjectsFilterGridProps {
  projects: Project[];
}

export function ProjectsFilterGrid({ projects }: ProjectsFilterGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    projects.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        !searchQuery ||
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags?.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesTag = !activeTag || project.tags?.includes(activeTag);

      return matchesSearch && matchesTag;
    });
  }, [projects, searchQuery, activeTag]);

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-7xl px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                NukeHub Projects
              </h2>
              <p className="mt-2 text-muted-foreground">
                {filteredProjects.length} of {projects.length} projects
                {activeTag ? ` tagged "${activeTag}"` : ""}
              </p>
            </div>

            <div className="w-full lg:w-80">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
                placeholder="Search projects..."
              />
            </div>
          </div>

          {/* Tag Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Tag size={14} className="mr-1 text-muted-foreground" />
            <button
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                !activeTag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  tag === activeTag
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, i) => (
              <motion.a
                key={project.title}
                href={project.slug}
                {...(project.slug.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.08] dark:border-border/30 dark:bg-card/50"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-card">
                  {project.image ? (
                    <img
                      src={project.image}
                      alt={project.title}
                      width="100%"
                      height="100%"
                      className="h-full w-full origin-bottom object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <span className="text-5xl font-bold text-muted-foreground/30">
                        {project.title[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />

                  <GitHubStatsOverlay githubRepo={project.githubRepo} />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {project.tags?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="default"
                        className="text-[10px]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="text-xl font-semibold tracking-tight text-foreground">
                    {project.title}
                  </h3>

                  <p className="mt-2 mb-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>

                  <div className="mt-auto flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                      View Details
                      <ArrowUpRight size={12} />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
                      {project.tags?.[0] || "Project"}
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <Search
              size={48}
              className="mx-auto mb-4 text-muted-foreground/50"
            />
            <h3 className="text-lg font-semibold text-foreground">
              No projects found
            </h3>
            <p className="mt-2 text-muted-foreground">
              Try adjusting your search or filters.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
