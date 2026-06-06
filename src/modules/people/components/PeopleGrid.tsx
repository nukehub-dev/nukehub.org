import * as React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { SearchInput } from '@components/ui/SearchInput';
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
    // All categories expanded by default
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

  const totalPeople = React.useMemo(
    () => categories.reduce((sum, c) => sum + c.children.length, 0),
    [categories]
  );

  const toggleCategory = (title: string) => {
    setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="space-y-10">
      {/* Search bar */}
      <div className="sticky top-20 z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, or organization..."
              className="flex-1 max-w-md"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users size={16} />
              <span>
                {query
                  ? `${filtered.reduce((s, c) => s + c.people.length, 0)} result${
                      filtered.reduce((s, c) => s + c.people.length, 0) !== 1 ? 's' : ''
                    }`
                  : `${totalPeople} member${totalPeople !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Users size={48} className="mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-medium mb-1">No results found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search terms
          </p>
        </motion.div>
      ) : (
        filtered.map(({ category, people }) => (
          <section key={category.title} className="space-y-4">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category.title)}
              className="flex items-center gap-2 group w-full text-left"
            >
              <h2 className="text-xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                {category.title}
              </h2>
              <span className="inline-flex items-center justify-center h-6 min-w-[24px] rounded-full bg-primary/10 text-primary text-xs font-medium px-2">
                {people.length}
              </span>
              <svg
                className={cn(
                  'ml-auto h-5 w-5 text-muted-foreground transition-transform duration-200',
                  expanded[category.title] ? 'rotate-180' : ''
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {category.description && !query && (
              <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
                {category.description}
              </p>
            )}

            {/* People grid */}
            {expanded[category.title] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {people.map((person, idx) => (
                  <ProfileCard
                    key={person.name + person.email}
                    person={person}
                    index={idx}
                    onOpen={setSelectedPerson}
                  />
                ))}
              </motion.div>
            )}
          </section>
        ))
      )}

      <ProfileModal
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />
    </div>
  );
}
