export interface SupportHeroData {
  title: string;
  description: string;
}

export interface SupportImpact {
  icon: string;
  title: string;
  description: string;
}

export interface SupportMethod {
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
}

export interface SupportTier {
  name: string;
  price: string;
  period: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  description: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}

export interface SupportContactData {
  title: string;
  description: string;
  primaryCta: { text: string; href: string };
  secondaryCta: { text: string; href: string };
}

export interface SupportData {
  hero: SupportHeroData;
  impacts: SupportImpact[];
  methods: SupportMethod[];
  tiers: SupportTier[];
  contact: SupportContactData;
}
