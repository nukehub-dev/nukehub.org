export interface NukeideData {
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
  extensions: {
    title: string;
    description: string;
    items: Array<{
      name: string;
      badge: string;
      badgeIcon: string;
      description: string;
      image?: string;
      imageDark?: string;
      imageAlt?: string;
      images?: Array<{ src: string; srcDark?: string; alt: string }>;
      features: string[];
      reversed: boolean;
      gallery?: boolean;
      noImage?: boolean;
    }>;
  };
  deployment: {
    title: string;
    description: string;
    items: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
  gettingStarted: {
    title: string;
    description: string;
    tabs: Array<{
      id: string;
      label: string;
      icon: string;
      description: string;
      prerequisites: string;
      download?: {
        title: string;
        description: string;
        href: string;
        text: string;
        external?: boolean;
      };
      steps: Array<{
        number: number;
        title: string;
        command: string;
      }>;
    }>;
  };
  cta: {
    title: string;
    description: string;
    primary: { text: string; href: string; icon: string };
    secondary: { text: string; href: string; icon: string };
  };
}
