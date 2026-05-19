import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import { projects } from '@data/projects';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { ArrowUpRight } from 'lucide-react';
import { BrandIcon } from '@components/ui/BrandIcon';

export function ProjectsGrid() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mb-12 text-center"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Projects
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-3 text-lg text-muted-foreground">
            Research and Development
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {projects.map((project) => (
            <motion.div key={project.title} variants={fadeInUp}>
              <Card variant="bubble" className="h-full group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <Badge variant="ghost" className="text-xs">R&D</Badge>
                  </div>
                  <CardDescription className="line-clamp-3">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-all hover:brightness-110"
                    >
                      Try
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                    <a
                      href={project.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      aria-label={`${project.title} source code`}
                    >
                      <BrandIcon name="github" size={16} />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
