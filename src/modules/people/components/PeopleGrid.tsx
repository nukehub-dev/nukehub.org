import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, ChevronDown, UserPlus } from 'lucide-react';
import { ProfileCard } from './ProfileCard';
import { ProfileModal } from './ProfileModal';
import { cn } from '@lib/utils';
import type { Person, PeopleCategory } from '@modules/people/types';

// ============================================================================
// Filter logic
// ============================================================================

function personMatchesQuery(person: Person, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    person.name.toLowerCase().includes(q) ||
    (person.role?.toLowerCase().includes(q) ?? false) ||
    (person.organization?.toLowerCase().includes(q) ?? false) ||
    (person.location?.toLowerCase().includes(q) ?? false)
  );
}

interface FilteredCategory {
  category: PeopleCategory;
  people: Person[];
}

function filterCategories(
  categories: PeopleCategory[],
  query: string
): FilteredCategory[] {
  const q = query.toLowerCase().trim();
  if (!q) {
    return categories.map((c) => ({ category: c, people: c.children }));
  }
  return categories
    .map((c) => ({
      category: c,
      people: c.children.filter((p) => personMatchesQuery(p, q)),
    }))
    .filter((c) => c.people.length > 0);
}

// ============================================================================
// Components
// ============================================================================

interface PeopleGridProps {
  categories: PeopleCategory[];
}

export function PeopleGrid({ categories }: PeopleGridProps) {
  const [query, setQuery] = React.useState('');
  const [selectedPerson, setSelectedPerson] = React.useState<Person | null>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    categories.forEach((c) => {
      init[c.title] = true;
    });
    return init;
  });

  const filtered = React.useMemo(
    () => filterCategories(categories, query),
    [categories, query]
  );

  const toggleCategory = (title: string) => {
    setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="space-y-8">
      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="max-w-xl mx-auto"
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role, or organization..."
            className={cn(
              'w-full rounded-xl border border-border/50 bg-card/60 pl-10 pr-4 py-2.5',
              'text-sm text-foreground placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
              'transition-all duration-200',
              'hover:bg-card/80 hover:border-border/70'
            )}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors"
              type="button"
            >
              Clear
            </button>
          )}
        </div>
        {/* Results count */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <Users size={12} />
          <span>
            {query
              ? `${filtered.reduce((s, c) => s + c.people.length, 0)} result${filtered.reduce((s, c) => s + c.people.length, 0) !== 1 ? 's' : ''}`
              : `${categories.reduce((s, c) => s + c.children.length, 0)} members across ${categories.filter(c => c.children.length > 0).length} teams`
            }
          </span>
        </div>
      </motion.div>

      {/* Categories */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/60 mb-4">
              <Search size={24} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium mb-1">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {filtered.map(({ category, people }) => (
              <section key={category.title} className="space-y-4">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category.title)}
                  className="flex items-center gap-3 group w-full text-left py-1"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <h2 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
                      {category.title}
                    </h2>
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-md bg-primary/10 text-primary text-[11px] font-semibold px-1.5">
                      {people.length}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={cn(
                      'text-muted-foreground transition-transform duration-200 shrink-0',
                      expanded[category.title] ? 'rotate-180' : ''
                    )}
                  />
                </button>

                {category.description && !query && (
                  <p className="text-sm text-muted-foreground/80 max-w-3xl leading-relaxed -mt-2">
                    {category.description}
                  </p>
                )}

                {/* People grid */}
                <AnimatePresence>
                  {expanded[category.title] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      {people.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
                          {people.map((person, idx) => (
                            <ProfileCard
                              key={person.name + person.email}
                              person={person}
                              index={idx}
                              onOpen={setSelectedPerson}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-3">
                            <UserPlus size={20} className="text-muted-foreground/40" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            No members yet in this category
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileModal
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />
    </div>
  );
}
