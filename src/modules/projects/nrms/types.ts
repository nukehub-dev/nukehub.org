export interface NrmsData {
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
    heroImageAlt: string;
  };
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
  dataSources: {
    title: string;
    description: string;
    items: Array<{
      name: string;
      url: string;
      description: string;
    }>;
  };
  cta: {
    title: string;
    description: string;
    primary: { text: string; href: string; icon: string };
    secondary: { text: string; href: string; icon: string };
  };
}
