export interface AboutHeroData {
  title: string;
  description: string;
  stats: {
    value: string;
    label: string;
  }[];
}

export interface AboutStoryData {
  title: string;
  subtitle?: string;
  milestones: {
    year: string;
    title: string;
    description: string;
  }[];
}

export interface AboutMissionData {
  title: string;
  subtitle: string;
  description: string;
  points: {
    title: string;
    description: string;
  }[];
}

export interface AboutValuesData {
  title: string;
  subtitle?: string;
  items: {
    icon: string;
    title: string;
    description: string;
  }[];
}

export interface AboutSDGsData {
  title: string;
  subtitle: string;
  description: string;
  goals: {
    number: string;
    title: string;
    description: string;
    color: string;
  }[];
}

export interface AboutClosingData {
  text: string;
}

export interface AboutCommunityData {
  title: string;
  description: string;
  primaryCta: { text: string; href: string };
  secondaryCta: { text: string; href: string };
}

export interface AboutData {
  hero: AboutHeroData;
  story: AboutStoryData;
  mission: AboutMissionData;
  values: AboutValuesData;
  sdgs: AboutSDGsData;
  closing: AboutClosingData;
  community: AboutCommunityData;
}
