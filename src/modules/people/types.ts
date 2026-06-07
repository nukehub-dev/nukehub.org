/**
 * ============================================================================
 * People Types
 * ============================================================================
 *
 * These types mirror the Astro content collection schema for people.
 * Components import from here rather than from a data file.
 * ============================================================================
 */

import { getSocialUrl } from '@components/ui/SocialIcon';

export interface Person {
  id: string;
  name: string;
  image: string;
  organization?: string;
  role?: string;
  location?: string;
  bio?: string;
  email: string;
  phone?: string;
  url?: string;
  whatsapp?: string;
  signal?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  github?: string;
  gitlab?: string;
  bitbucket?: string;
  stackoverflow?: string;
  scholar?: string;
  orcid?: string;
  researchgate?: string;
  zotero?: string;
  youtube?: string;
  mastodon?: string;
  bluesky?: string;
  discord?: string;
  telegram?: string;
  medium?: string;
  tiktok?: string;
  threads?: string;
  x?: string;
  twitch?: string;
  reddit?: string;
  category: string;
}

export interface PeopleCategory {
  title: string;
  description: string;
  children: Person[];
}

// ============================================================================
// Shared social link definitions
// ============================================================================

export interface SocialLink {
  platform: string;
  label: string;
  handle: string;
  url: string;
}

export const SOCIAL_FIELDS: Array<{ key: keyof Person; label: string; platform: string }> = [
  { key: 'url', label: 'Website', platform: 'website' },
  { key: 'email', label: 'Email', platform: 'email' },
  { key: 'phone', label: 'Phone', platform: 'phone' },
  { key: 'whatsapp', label: 'WhatsApp', platform: 'whatsapp' },
  { key: 'signal', label: 'Signal', platform: 'signal' },
  { key: 'linkedin', label: 'LinkedIn', platform: 'linkedin' },
  { key: 'x', label: 'X', platform: 'x' },
  { key: 'facebook', label: 'Facebook', platform: 'facebook' },
  { key: 'instagram', label: 'Instagram', platform: 'instagram' },
  { key: 'github', label: 'GitHub', platform: 'github' },
  { key: 'gitlab', label: 'GitLab', platform: 'gitlab' },
  { key: 'bitbucket', label: 'Bitbucket', platform: 'bitbucket' },
  { key: 'stackoverflow', label: 'Stack Overflow', platform: 'stackoverflow' },
  { key: 'scholar', label: 'Google Scholar', platform: 'scholar' },
  { key: 'orcid', label: 'ORCID', platform: 'orcid' },
  { key: 'researchgate', label: 'ResearchGate', platform: 'researchgate' },
  { key: 'zotero', label: 'Zotero', platform: 'zotero' },
  { key: 'youtube', label: 'YouTube', platform: 'youtube' },
  { key: 'mastodon', label: 'Mastodon', platform: 'mastodon' },
  { key: 'bluesky', label: 'Bluesky', platform: 'bluesky' },
  { key: 'discord', label: 'Discord', platform: 'discord' },
  { key: 'telegram', label: 'Telegram', platform: 'telegram' },
  { key: 'medium', label: 'Medium', platform: 'medium' },
  { key: 'tiktok', label: 'TikTok', platform: 'tiktok' },
  { key: 'threads', label: 'Threads', platform: 'threads' },
  { key: 'twitch', label: 'Twitch', platform: 'twitch' },
  { key: 'reddit', label: 'Reddit', platform: 'reddit' },
];

export function extractSocialLinks(person: Person): SocialLink[] {
  return SOCIAL_FIELDS
    .filter(({ key }) => person[key])
    .map(({ key, label, platform }) => {
      const handle = person[key] as string;
      return {
        platform,
        label,
        handle,
        url: key === 'url' ? handle : getSocialUrl(platform, handle),
      };
    });
}
