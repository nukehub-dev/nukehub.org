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
  tier: "platinum" | "gold" | "silver" | "bronze" | "custom";
  description: string;
  features: string[];
  cta: string;
  inquiryType: string;
  featured?: boolean;
}

export interface OneTimeDonationAmount {
  amount: string;
  label: string;
  cta: string;
  inquiryType: string;
}

export interface OneTimeDonationData {
  title: string;
  description: string;
  amounts: OneTimeDonationAmount[];
  custom: {
    label: string;
    cta: string;
    inquiryType: string;
  };
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
  customTier: SupportTier;
  oneTimeDonation: OneTimeDonationData;
  contact: SupportContactData;
}
