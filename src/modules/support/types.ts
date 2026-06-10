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
  inquiryType: string;
}

export interface SupportTier {
  name: string;
  price: string;
  period: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
  description: string;
  features: string[];
  cta: string;
  inquiryType: string;
  featured?: boolean;
}

export interface SupportContactData {
  title: string;
  description: string;
  primaryText: string;
  secondaryText: string;
  secondaryHref: string;
}

export interface SupportData {
  hero: SupportHeroData;
  impacts: SupportImpact[];
  methods: SupportMethod[];
  tiers: SupportTier[];
  contact: SupportContactData;
}
