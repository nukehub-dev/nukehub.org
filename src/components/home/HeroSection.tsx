import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, viewportOnce } from '@lib/animations';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="space-y-6"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            Open Source{' '}
            <span className="text-primary">Nuclear</span>{' '}
            Engineering
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            A pioneering platform dedicated to the exploration and advancement
            of nuclear technology through open collaboration.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <a
              href="/projects"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-all duration-100 hover:-translate-y-[1px] active:translate-y-[1px] hover:brightness-110"
            >
              Explore Projects
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/about"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium text-foreground transition-all duration-100 hover:-translate-y-[1px] active:translate-y-[1px] hover:bg-accent hover:text-accent-foreground"
            >
              Learn More
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
