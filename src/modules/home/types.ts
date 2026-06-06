export interface HeroData {
  badge: {
    text: string;
    showLiveDot: boolean;
  };
  headline: {
    line1: {
      prefix: string;
      highlight: string;
    };
    line2: string;
  };
  subtitle: string;
  ctas: {
    text: string;
    href: string;
    variant: 'primary' | 'secondary';
    icon?: string;
  }[];
  stats: {
    value: string;
    numericValue?: number;
    label: string;
    icon: string;
  }[];
}

export interface MissionData {
  sectionTitle: string;
  sectionSubtitle: string;
  badge: string;
  pillars: {
    title: string;
    description: string;
    icon: string;
  }[];
}

export interface MarqueeData {
  items: string[];
  speed: {
    row1: number;
    row2: number;
  };
}

export interface IntegrationsData {
  sectionTitle: string;
  sectionSubtitle: string;
  badge: string;
}

export interface TestimonialsSectionData {
  sectionTitle: string;
  sectionSubtitle: string;
  badge: string;
}

export interface TrustData {
  sectionTitle: string;
  institutions: string[];
}

export interface CTAData {
  badge?: string;
  headline: string;
  subtitle: string;
  ctas: {
    text: string;
    href: string;
    variant: 'primary' | 'secondary';
    icon?: string;
    external?: boolean;
  }[];
}
