import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { viewportOnce } from '@lib/animations';

interface Integration {
  name: string;
  description: string;
  url: string;
  category: string;
}

interface IntegrationsShowcaseProps {
  integrations: Integration[];
}

const categoryColors: Record<string, string> = {
  Simulation: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Geometry: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Data Processing': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Plasma Physics': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  Fusion: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const INITIAL_DISPLAY_COUNT = 6;

export function IntegrationsShowcase({ integrations }: IntegrationsShowcaseProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group by category
  const byCategory = integrations.reduce<Record<string, Integration[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const categories = Object.keys(byCategory).sort();

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Layers size={14} />
              Powered By
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Industry Standard Integrations
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              NukeLab ships with the libraries you already use in your research. Seamlessly integrated
              and ready to run in the cloud.
            </p>
          </motion.div>
        </div>

        {/* Categories */}
        <div className="space-y-16">
          {categories.map((category, ci) => {
            const items = byCategory[category];
            const isExpanded = expandedCategories.has(category);
            const hasMore = items.length > INITIAL_DISPLAY_COUNT;
            const displayedItems = isExpanded ? items : items.slice(0, INITIAL_DISPLAY_COUNT);

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.5, delay: ci * 0.1 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {category}
                    <span className="ml-2 text-xs font-normal text-muted-foreground/60">
                      ({items.length})
                    </span>
                  </h3>

                  {hasMore && (
                    <button
                      onClick={() => toggleCategory(category)}
                      className="inline-flex items-center gap-1 rounded-full border border-border/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {isExpanded ? (
                        <>
                          Show Less
                          <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          Show All ({items.length})
                          <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedItems.map((integration, i) => (
                    <motion.a
                      key={integration.name}
                      href={integration.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={viewportOnce}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md dark:border-border/30 dark:bg-card/50"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-foreground">
                          {integration.name}
                        </h4>
                        <ExternalLink
                          size={14}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>

                      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                        {integration.description}
                      </p>

                      <div className="mt-4">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                            categoryColors[integration.category] || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {integration.category}
                        </span>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
