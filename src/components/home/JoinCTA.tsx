import { motion } from 'framer-motion';
import { fadeInUp, viewportOnce } from '@lib/animations';
import { ArrowRight } from 'lucide-react';

export function JoinCTA() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeInUp}
        className="mx-auto max-w-4xl"
      >
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 sm:p-12">
          {/* Subtle gradient tint */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(600px circle at 100% 0%, color-mix(in oklch, var(--primary) 20%, transparent), transparent)',
            }}
          />

          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex-1 space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Join the Nuclear Revolution
              </h2>
              <p className="text-muted-foreground">
                Ignite your passion for nuclear science & engineering. Join the conversation,
                share knowledge, and explore the atomic world with experts.
              </p>
            </div>

            <a
              href="https://talk.nukehub.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-all duration-100 hover:-translate-y-[1px] active:translate-y-[1px] hover:brightness-110"
            >
              Join NukeTalk
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
