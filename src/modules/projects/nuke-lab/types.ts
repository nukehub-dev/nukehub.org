export interface NukelabData {
  hero: {
    badge: { text: string; icon: string };
    ctas: Array<{
      text: string;
      href: string;
      variant: string;
      icon: string;
      external?: boolean;
    }>;
    heroImage: string;
    heroImageDark?: string;
    heroImageAlt: string;
  };
  stats: Array<{ value: string; label: string }>;
  features: {
    title: string;
    description: string;
    items: Array<{
      icon: string;
      title: string;
      description: string;
      color: string;
    }>;
  };
  environments: {
    title: string;
    description: string;
    items: Array<{
      name: string;
      description: string;
      image?: string;
      imageDark?: string;
      imageAlt?: string;
      features: string[];
      reversed: boolean;
      badge?: string;
      badgeIcon?: string;
    }>;
  };
  architecture: {
    title: string;
    description: string;
    items: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
  plans: {
    title: string;
    description: string;
    items: Array<{
      name: string;
      cpu: string;
      memory: string;
      disk: string;
      cost: string;
      description: string;
      highlighted?: boolean;
    }>;
  };
  workflow: {
    title: string;
    description: string;
    steps: Array<{
      number: number;
      title: string;
      description: string;
      icon: string;
    }>;
  };
  cta: {
    title: string;
    description: string;
    primary: { text: string; href: string; icon: string };
    secondary: { text: string; href: string; icon: string };
  };
}
