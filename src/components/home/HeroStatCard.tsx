import { motion } from 'framer-motion';
import { fadeInUp } from '@lib/animations';
import type { LucideIcon } from 'lucide-react';

interface HeroStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delay?: number;
}

export function HeroStatCard({ icon: Icon, label, value, delay = 0 }: HeroStatCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      transition={{ delay }}
      className="bubble hover-lift group flex items-center gap-4 px-5 py-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-lg font-semibold tracking-tight text-foreground">
          {value}
        </div>
        <div className="text-xs font-medium text-muted-foreground">
          {label}
        </div>
      </div>
    </motion.div>
  );
}
