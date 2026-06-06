import {
  Atom,
  GitBranch,
  Users,
  Globe,
  Cloud,
  Code2,
  ArrowRight,
  MessageCircle,
  BookOpen,
  Quote,
  Mail,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  atom: Atom,
  gitBranch: GitBranch,
  users: Users,
  globe: Globe,
  cloud: Cloud,
  code2: Code2,
  arrowRight: ArrowRight,
  messageCircle: MessageCircle,
  bookOpen: BookOpen,
  quote: Quote,
  mail: Mail,
};

export function getIcon(name: string): LucideIcon | undefined {
  return iconMap[name];
}
