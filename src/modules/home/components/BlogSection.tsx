import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { viewportOnce } from "@lib/animations";
import { BLOG_URL } from "@lib/blog";
import { useBlogPosts } from "@lib/useBlogPosts";
import { Badge } from "@components/ui/Badge";
import { BlogCanvas } from "@modules/home/components/three/BlogCanvas";
import type { BlogData } from "@modules/home/types";

const CARD_WIDTH = "w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]";

interface BlogSectionProps {
  data: BlogData;
}

export function BlogSection({ data }: BlogSectionProps) {
  const { posts, loading } = useBlogPosts(3);

  // Feed unreachable (offline, CORS, blog down) — hide the section entirely
  // rather than leaving a header with no content.
  if (!loading && posts.length === 0) return null;

  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col justify-center overflow-hidden py-16 snap-section">
      {/* Three.js ambient background with edge fade */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
        }}
      >
        <BlogCanvas />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4">
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
            {data.badge}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {data.sectionTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {data.sectionSubtitle}
          </p>
        </motion.div>

        {/* Posts */}
        <div className="flex flex-wrap justify-center gap-6">
          {loading
            ? [0, 1, 2].map((i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`flex ${CARD_WIDTH}`}
                >
                  <div className="h-64 w-full animate-pulse rounded-2xl border border-border bg-card/50 dark:border-border/60 dark:bg-card/70" />
                </div>
              ))
            : posts.map((post, i) => (
                <motion.a
                  key={post.href}
                  href={post.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.12,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className={`group flex ${CARD_WIDTH}`}
                >
                  <div className="flex w-full flex-col rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] dark:border-border/60 dark:bg-card/70">
                    {post.category && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        <Badge
                          variant="default"
                          className="text-[10px] font-medium"
                        >
                          {post.category}
                        </Badge>
                      </div>
                    )}

                    <h3 className="mb-2 text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>

                    <p className="mb-5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {post.date}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </div>
                </motion.a>
              ))}
        </div>

        {/* View All Link */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 text-center"
          >
            <a
              href={BLOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-6 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30"
            >
              View All Posts on NukeBlog
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
