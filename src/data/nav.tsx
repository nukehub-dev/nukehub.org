import type * as React from "react";
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
  Code2,
  Globe,
  Monitor,
  Cpu,
  Server,
  Rocket,
  Kanban,
  GitCommit,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { BrandIcon } from "@components/ui/BrandIcon";

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
const GithubIcon = (props: { className?: string }) => (
  <BrandIcon name="github" size={16} {...props} />
);
const LinkedinIcon = (props: { className?: string }) => (
  <BrandIcon name="linkedin" size={16} {...props} />
);

const staticNavItems: NavItem[] = [
  {
    title: "Home",
    icon: Home,
    url: "/",
  },
  {
    title: "Manual",
    icon: Newspaper,
    children: [
      { title: "About Us", icon: Info, url: "/about" },
      { title: "Privacy Policy", icon: Lock, url: "/privacy-policy" },
      { title: "Terms of Service", icon: FileText, url: "/terms-of-service" },
      { title: "Code of Conduct", icon: Scale, url: "/code-of-conduct" },
      { title: "Acknowledgment", icon: Award, url: "/acknowledgment" },
      { title: "Support Us", icon: Heart, url: "/support" },
    ],
  },
  {
    title: "Updates",
    icon: Rocket,
    children: [
      { title: "Roadmap", icon: Kanban, url: "/roadmap" },
      { title: "Changelog", icon: GitCommit, url: "/changelog" },
    ],
  },
  {
    title: "Community",
    icon: Users,
    children: [
      { title: "People", icon: User, url: "/people" },
      { title: "Events", icon: Calendar, url: "/events" },
      { title: "Surveys", icon: ClipboardList, url: "/survey" },
      { title: "Contact", icon: Mail, url: "/contact" },
      {
        title: "NukeTalk",
        icon: MessageSquare,
        url: "https://talk.nukehub.org",
        newpage: true,
      },
      {
        title: "GitHub",
        icon: GithubIcon,
        url: "https://github.com/nukehub-dev",
        newpage: true,
      },
      {
        title: "LinkedIn",
        icon: LinkedinIcon,
        url: "https://www.linkedin.com/company/nukehub",
        newpage: true,
      },
    ],
  },
];

export interface ProjectNavEntry {
  title: string;
  iconName?: string;
  url: string;
  newpage?: boolean;
}

// Icon map for dynamic project entries
export const projectIconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Factory,
  BarChart3,
  FlaskConical,
  Package,
  Code2,
  Globe,
  Monitor,
  Cpu,
  Server,
};

const MAX_NAV_PROJECTS = 5;

export function buildNavItems(
  projectEntries: ProjectNavEntry[] = [],
): NavItem[] {
  const visibleEntries = projectEntries.slice(0, MAX_NAV_PROJECTS);

  const projectChildren: NavChild[] = visibleEntries.map((p) => ({
    title: p.title,
    icon: projectIconMap[p.iconName || "Factory"] || Factory,
    url: p.url,
    newpage: p.newpage,
  }));

  projectChildren.push({
    title: "All Projects",
    icon: ArrowRight,
    url: "/projects",
  });

  const projectsItem: NavItem = {
    title: "Projects",
    icon: LayoutGrid,
    children: projectChildren,
  };

  // Insert Projects after Home
  return [staticNavItems[0], projectsItem, ...staticNavItems.slice(1)];
}

// Legacy export for backward compatibility
export const navItems = buildNavItems([
  { title: "NukeLab", iconName: "FlaskConical", url: "/nuke-lab" },
  { title: "NukeIDE", iconName: "Code2", url: "/nuke-ide" },
  { title: "NRMS", iconName: "Factory", url: "/nrms" },
  { title: "NukeAnalytics", iconName: "BarChart3", url: "/nuke-analytics" },
  {
    title: "NukeBox",
    iconName: "Package",
    url: "https://nukebox.readthedocs.io/",
    newpage: true,
  },
]);
