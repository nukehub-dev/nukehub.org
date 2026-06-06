import type * as React from 'react';
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
  Mail,
} from 'lucide-react';
import { BrandIcon } from '@components/ui/BrandIcon';

export interface NavChild {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  newpage?: boolean;
}

export interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url?: string;
  newpage?: boolean;
  children?: NavChild[];
}

// Inline wrappers for BrandIcon so it matches the same interface
const GithubIcon = (props: { className?: string }) => <BrandIcon name="github" size={16} {...props} />;
const LinkedinIcon = (props: { className?: string }) => <BrandIcon name="linkedin" size={16} {...props} />;

export const navItems: NavItem[] = [
  {
    title: 'Home',
    icon: Home,
    url: '/',
  },
  {
    title: 'Projects',
    icon: LayoutGrid,
    children: [
      { title: 'NRMS', icon: Factory, url: '/nrms' },
      { title: 'NukeAnalytics', icon: BarChart3, url: '/nuke-analytics' },
      { title: 'NukeLab', icon: FlaskConical, url: '/nuke-lab' },
      { title: 'NukeBox', icon: Package, url: 'https://nukebox.readthedocs.io/', newpage: true },
    ],
  },
  {
    title: 'Manual',
    icon: Newspaper,
    children: [
      { title: 'About Us', icon: Info, url: '/about' },
      { title: 'Privacy Policy', icon: Lock, url: '/privacy-policy' },
      { title: 'Terms of Service', icon: FileText, url: '/terms-of-service' },
      { title: 'Code of Conduct', icon: Scale, url: '/code-of-conduct' },
      { title: 'Acknowledgment', icon: Award, url: '/acknowledgment' },
      { title: 'Support Us', icon: Heart, url: '/support' },
    ],
  },
  {
    title: 'Community',
    icon: Users,
    children: [
      { title: 'People', icon: User, url: '/people' },
      { title: 'Events', icon: Calendar, url: '/events' },
      { title: 'Contact', icon: Mail, url: '/contact' },
      { title: 'NukeTalk', icon: MessageSquare, url: 'https://talk.nukehub.org', newpage: true },
      { title: 'GitHub', icon: GithubIcon, url: 'https://github.com/nukehub-dev', newpage: true },
      { title: 'LinkedIn', icon: LinkedinIcon, url: 'https://www.linkedin.com/company/nukehub', newpage: true },
    ],
  },
];
