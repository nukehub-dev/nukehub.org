import * as React from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, MapPin, Award } from 'lucide-react';
import type { Person, PeopleCategory } from '@modules/people/types';

interface PeopleStatsProps {
  categories: PeopleCategory[];
}

export function PeopleStats({ categories }: PeopleStatsProps) {
  const totalMembers = categories.reduce((sum, c) => sum + c.children.length, 0);
  
  const organizations = React.useMemo(() => {
    const orgs = new Set<string>();
    categories.forEach((c) => {
      c.children.forEach((p) => {
        if (p.organization) orgs.add(p.organization);
      });
    });
    return orgs.size;
  }, [categories]);

  const locations = React.useMemo(() => {
    const locs = new Set<string>();
    categories.forEach((c) => {
      c.children.forEach((p) => {
        if (p.location) locs.add(p.location);
      });
    });
    return locs.size;
  }, [categories]);

  const categoriesCount = categories.filter((c) => c.children.length > 0).length;

  const stats = [
    { icon: Users, value: totalMembers, label: 'Members', suffix: '' },
    { icon: Award, value: categoriesCount, label: 'Teams', suffix: '' },
    { icon: Building2, value: organizations, label: 'Organizations', suffix: '+' },
    { icon: MapPin, value: locations, label: 'Locations', suffix: '+' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto"
    >
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
          className="relative group"
        >
          <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
            <stat.icon size={18} className="mx-auto mb-2 text-primary/70" />
            <div className="text-2xl font-bold text-foreground">
              {stat.value}{stat.suffix}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {stat.label}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
