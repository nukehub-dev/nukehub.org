import * as React from 'react';
import {
  Home,
  LayoutGrid,
  Factory,
  BarChart3,
  FlaskConical,
  Package,
  Newspaper,
  Info,
  Lock,
  FileText,
  Scale,
  Award,
  Heart,
  Users,
  User,
  Calendar,
  MessageSquare,
  ArrowRight,
  ArrowUp,
  Moon,
  Menu,
  X,
  Share2,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Video,
  GraduationCap,
  Fingerprint,
  BookOpen,
  Library,
  type LucideProps,
} from 'lucide-react';
import { BrandIcon } from './BrandIcon';

// ============================================================================
// Legacy icon name → Lucide/Brand icon mapping
// ==========================================================================--

const lucideMap: Record<string, React.ComponentType<LucideProps>> = {
  // Navigation
  'nuke-home': Home,
  'nuke-application': LayoutGrid,
  'nuke-power-plant-1': Factory,
  'nuke-chart-1': BarChart3,
  'nuke-research-platform': FlaskConical,
  'nuke-box': Package,
  'nuke-news': Newspaper,
  'nuke-about': Info,
  'nuke-lock': Lock,
  'nuke-document-ready': FileText,
  'nuke-law': Scale,
  'nuke-certificate-file': Award,
  'nuke-love': Heart,
  'nuke-group': Users,
  'nuke-profile': User,
  'nuke-calender-alt': Calendar,
  'nuke-chat-2': MessageSquare,
  'nuke-arrow-ios-forward': ArrowRight,
  'nuke-arrow-up-2': ArrowUp,
  'nuke-moon': Moon,
  'nuke-dashboard-1': Menu,
  'nuke-error': X,
  'nuke-share': Share2,
  'nuke-nukehub': Globe,

  // Contact
  'nuke-phone-solid': Phone,
  'nuke-mail-solid': Mail,
  'nuke-internet-solid': Globe,
  'nuke-whatsapp-solid': MessageCircle,
  'nuke-skype-solid': Video,

  // Academic
  'nuke-education-solid': GraduationCap,
  'nuke-orcid-solid': Fingerprint,
  'nuke-researchgate-solid': BookOpen,
  'nuke-zotero-solid': Library,
};

const brandMap: Record<string, string> = {
  'nuke-github': 'github',
  'nuke-github-alt': 'github',
  'nuke-github-solid': 'github',
  'nuke-linkedin-solid': 'linkedin',
  'nuke-twitter-solid': 'twitter',
  'nuke-facebook-solid': 'facebook',
  'nuke-instagram-solid': 'instagram',
  'nuke-gitlab-solid': 'gitlab',
  'nuke-bitbucket-solid': 'bitbucket',
  'nuke-stack-overflow-solid': 'stackoverflow',
  'nuke-youtube-solid': 'youtube',
};

interface IconProps extends LucideProps {
  name: string;
}

export function Icon({ name, ...props }: IconProps) {
  if (brandMap[name]) {
    return <BrandIcon name={brandMap[name] as any} {...props} />;
  }

  const LucideIcon = lucideMap[name];
  if (!LucideIcon) {
    if (typeof window !== 'undefined') {
      console.warn(`[Icon] Unknown legacy icon name: "${name}"`);
    }
    return <Globe {...props} />;
  }
  return <LucideIcon {...props} />;
}

export function hasIcon(name: string): boolean {
  return name in lucideMap || name in brandMap;
}
