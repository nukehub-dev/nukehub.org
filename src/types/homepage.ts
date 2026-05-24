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

export interface ToolsData {
  sectionTitle: string;
  sectionSubtitle: string;
  badge: string;
  tools: string[];
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

export interface TestimonialsData {
  sectionTitle: string;
  sectionSubtitle: string;
  badge: string;
  testimonials: Testimonial[];
}

export interface TrustData {
  sectionTitle: string;
  institutions: string[];
}

export interface CTAData {
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
