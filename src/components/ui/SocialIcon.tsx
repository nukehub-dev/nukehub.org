import * as React from 'react';
import {
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
// Platform name → icon component mapping
// ============================================================================

const lucideMap: Record<string, React.ComponentType<LucideProps>> = {
  phone: Phone,
  email: Mail,
  url: Globe,
  website: Globe,
  portfolio: Globe,
  whatsapp: MessageCircle,
  skype: Video,
  scholar: GraduationCap,
  orcid: Fingerprint,
  researchgate: BookOpen,
  zotero: Library,
};

const brandMap: Record<string, string> = {
  linkedin: 'linkedin',
  twitter: 'twitter',
  facebook: 'facebook',
  instagram: 'instagram',
  github: 'github',
  gitlab: 'gitlab',
  bitbucket: 'bitbucket',
  stackoverflow: 'stackoverflow',
  youtube: 'youtube',
};

interface SocialIconProps extends LucideProps {
  platform: string;
}

export function SocialIcon({ platform, ...props }: SocialIconProps) {
  const key = platform.toLowerCase().replace(/[^a-z]/g, '');

  if (brandMap[key]) {
    return <BrandIcon name={brandMap[key] as any} {...props} />;
  }

  const LucideIcon = lucideMap[key];
  if (!LucideIcon) {
    if (typeof window !== 'undefined') {
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
    skype: `skype:${handle}?call`,
    linkedin: `https://linkedin.com/in/${handle}`,
    twitter: `https://twitter.com/${handle}`,
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
  };
  return urls[platform.toLowerCase()] || handle;
}
