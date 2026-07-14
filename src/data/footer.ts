import type { LucideIcon } from "lucide-react";
import {
  Info,
  Award,
  Heart,
  User,
  Calendar,
  MessageSquare,
  Factory,
  BarChart3,
  FlaskConical,
  Package,
  Code2,
  Globe,
  Monitor,
  Cpu,
  Server,
  Newspaper,
  Mail,
  ClipboardList,
  Rss,
} from "lucide-react";

export interface FooterLink {
  title: string;
  url: string;
  newpage?: boolean;
  icon?: LucideIcon;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const staticFooterColumns: FooterColumn[] = [
  {
    title: "Manual",
    links: [
      { title: "About Us", url: "/about", icon: Info },
      { title: "Acknowledgment", url: "/acknowledgment", icon: Award },
      { title: "Support Us", url: "/support", icon: Heart },
    ],
  },
  {
    title: "Community",
    links: [
      { title: "People", url: "/people", icon: User },
      { title: "Events", url: "/events", icon: Calendar },
      { title: "Surveys", url: "/surveys", icon: ClipboardList },
      {
        title: "NukeTalk",
        url: "https://talk.nukehub.org",
        newpage: true,
        icon: MessageSquare,
      },
    ],
  },
  {
    title: "Connect",
    links: [
      { title: "Contact", url: "/contact", icon: Mail },
      {
        title: "Blog",
        url: "https://blog.nukehub.org",
        newpage: true,
        icon: Newspaper,
      },
      {
        title: "RSS Feed",
        url: "https://blog.nukehub.org/rss.xml",
        newpage: true,
        icon: Rss,
      },
    ],
  },
];

// Icon map for dynamic project entries
const projectIconMap: Record<string, LucideIcon> = {
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

export interface ProjectFooterEntry {
  title: string;
  iconName?: string;
  url: string;
  newpage?: boolean;
}

export function buildFooterColumns(
  projectEntries: ProjectFooterEntry[] = [],
): FooterColumn[] {
  const projectLinks: FooterLink[] = projectEntries.map((p) => ({
    title: p.title,
    url: p.url,
    newpage: p.newpage ?? true,
    icon: projectIconMap[p.iconName || "Factory"] || Factory,
  }));

  const projectsColumn: FooterColumn = {
    title: "Projects",
    links: projectLinks,
  };

  return [projectsColumn, ...staticFooterColumns];
}

// Legacy export for backward compatibility
export const footerColumns = buildFooterColumns([
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

export const footerLegal = [
  { title: "Privacy", url: "/privacy-policy" },
  { title: "Terms", url: "/terms-of-service" },
  { title: "Code of Conduct", url: "/code-of-conduct" },
];

export const socialLinks = [
  { name: "github", url: "https://github.com/nukehub-dev" },
  { name: "linkedin", url: "https://www.linkedin.com/company/nukehub" },
  { name: "bluesky", url: "https://bsky.app/profile/nukehub.org" },
  { name: "mastodon", url: "https://mastodon.social/@nukehub" },
] as const;
