import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ExternalLink, Layers } from 'lucide-react';
import { SearchInput } from '@components/ui/SearchInput';
import { viewportOnce } from '@lib/animations';

interface Integration {
  name: string;
  description: string;
  url: string;
  category: string;
}

interface IntegrationsFilterProps {
  integrations: Integration[];
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Simulation: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  Geometry: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  'Data Processing': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  'Plasma Physics': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  Fusion: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' },
};

export function IntegrationsFilter({ integrations }: IntegrationsFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Get categories with counts
  const categories = useMemo(() => {
    const counts = integrations.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [integrations]);

  // Filter integrations
  const filtered = useMemo(() => {
    return integrations.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !activeCategory || item.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [integrations, searchQuery, activeCategory]);

  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Layers size={14} />
            Powered By
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Industry Standard Integrations
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {filtered.length} of {integrations.length} tools ready to run in the cloud.
          </p>
        </motion.div>

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 space-y-4"
        >
          <div className="mx-auto max-w-lg">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search integrations..."
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                !activeCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              All ({integrations.length})
            </button>
            {categories.map(({ name, count }) => {
              const colors = categoryColors[name] || {
                bg: 'bg-muted',
                text: 'text-muted-foreground',
                border: 'border-border',
              };
              const isActive = activeCategory === name;
              return (
                <button
                  key={name}
                  onClick={() => setActiveCategory(isActive ? null : name)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {name}
                  <span className="ml-1 opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((integration, i) => {
              const colors = categoryColors[integration.category] || {
                bg: 'bg-muted',
                text: 'text-muted-foreground',
                border: 'border-border',
              };
              return (
                <motion.a
                  key={integration.name}
                  href={integration.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
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

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {integration.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      Visit →
                    </span>
                  </div>
                </motion.a>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <Search size={48} className="mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground">No integrations found</h3>
            <p className="mt-2 text-muted-foreground">
              Try adjusting your search or category filter.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
