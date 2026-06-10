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
  ExternalLink,
  Mail,
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

export const footerColumns: FooterColumn[] = [
  {
    title: "Projects",
    links: [
      { title: "NRMS", url: "/nrms", newpage: true, icon: Factory },
      {
        title: "NukeAnalytics",
        url: "/nuke-analytics",
        newpage: true,
        icon: BarChart3,
      },
      { title: "NukeLab", url: "/nuke-lab", newpage: true, icon: FlaskConical },
      {
        title: "NukeBox",
        url: "https://nukebox.readthedocs.io/",
        newpage: true,
        icon: Package,
      },
    ],
  },
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
        title: "GitHub",
        url: "https://github.com/nukehub-dev/",
        newpage: true,
        icon: ExternalLink,
      },
      {
        title: "LinkedIn",
        url: "https://www.linkedin.com/company/nukehub",
        newpage: true,
        icon: ExternalLink,
      },
    ],
  },
];

export const footerLegal = [
  { title: "Privacy", url: "/privacy-policy" },
  { title: "Terms", url: "/terms-of-service" },
  { title: "Code of Conduct", url: "/code-of-conduct" },
];

export const socialLinks = [
  { name: "github", url: "https://github.com/nukehub-dev" },
  { name: "linkedin", url: "https://www.linkedin.com/company/nukehub" },
] as const;
