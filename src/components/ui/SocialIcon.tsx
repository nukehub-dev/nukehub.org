import * as React from "react";
import { Phone, Mail, Globe, type LucideProps } from "lucide-react";
import { BrandIcon } from "./BrandIcon";

// ============================================================================
// Platform name → icon component mapping
// ============================================================================

const lucideMap: Record<string, React.ComponentType<LucideProps>> = {
  phone: Phone,
  email: Mail,
  url: Globe,
  website: Globe,
  portfolio: Globe,
};

const brandMap: Record<string, string> = {
  linkedin: "linkedin",
  facebook: "facebook",
  instagram: "instagram",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  stackoverflow: "stackoverflow",
  youtube: "youtube",
  mastodon: "mastodon",
  bluesky: "bluesky",
  discord: "discord",
  telegram: "telegram",
  medium: "medium",
  tiktok: "tiktok",
  threads: "threads",
  x: "x",
  twitch: "twitch",
  reddit: "reddit",
  signal: "signal",
  whatsapp: "whatsapp",
  scholar: "googlescholar",
  orcid: "orcid",
  researchgate: "researchgate",
  zotero: "zotero",
};

interface SocialIconProps extends LucideProps {
  platform: string;
}

export function SocialIcon({ platform, ...props }: SocialIconProps) {
  const key = platform.toLowerCase().replace(/[^a-z]/g, "");

  if (brandMap[key]) {
    return <BrandIcon name={brandMap[key] as any} {...props} />;
  }

  const LucideIcon = lucideMap[key];
  if (!LucideIcon) {
    if (typeof window !== "undefined") {
      console.warn(`[SocialIcon] Unknown platform: "${platform}"`);
    }
    return <Globe {...props} />;
  }
  return <LucideIcon {...props} />;
}

export function getSocialUrl(platform: string, handle: string): string {
  const urls: Record<string, string> = {
    phone: `tel:${handle}`,
    email: `mailto:${handle}`,
    whatsapp: `https://wa.me/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
    facebook: `https://facebook.com/${handle}`,
    instagram: `https://instagram.com/${handle}`,
    github: `https://github.com/${handle}`,
    gitlab: `https://gitlab.com/${handle}`,
    bitbucket: `https://bitbucket.org/${handle}`,
    stackoverflow: `https://stackoverflow.com/users/${handle}`,
    scholar: `https://scholar.google.com/citations?user=${handle}`,
    orcid: `https://orcid.org/${handle}`,
    researchgate: `https://www.researchgate.net/profile/${handle}`,
    zotero: `https://www.zotero.org/${handle}`,
    youtube: `https://youtube.com/channel/${handle}`,
    mastodon: handle.startsWith("http")
      ? handle
      : `https://mastodon.social/@${handle}`,
    bluesky: handle.startsWith("http")
      ? handle
      : `https://bsky.app/profile/${handle}`,
    discord: handle,
    telegram: handle.startsWith("http") ? handle : `https://t.me/${handle}`,
    medium: handle.startsWith("http")
      ? handle
      : `https://medium.com/@${handle}`,
    tiktok: handle.startsWith("http")
      ? handle
      : `https://tiktok.com/@${handle}`,
    threads: handle.startsWith("http")
      ? handle
      : `https://threads.net/@${handle}`,
    x: handle.startsWith("http") ? handle : `https://x.com/${handle}`,
    twitch: handle.startsWith("http") ? handle : `https://twitch.tv/${handle}`,
    reddit: handle.startsWith("http")
      ? handle
      : `https://reddit.com/user/${handle}`,
    signal: handle,
  };
  return urls[platform.toLowerCase()] || handle;
}
