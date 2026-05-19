export interface Person {
  name: string;
  image: string;
  organization?: string;
  role?: string;
  location?: string;
  email: string;
  phone?: string;
  url?: string;
  whatsapp?: string;
  skype?: string;
  linkedin?: string;
  twitter?: string;
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
}

export interface PeopleCategory {
  title: string;
  description: string;
  children: Person[];
}

export const peopleCategories: PeopleCategory[] = [
  {
    title: 'Executive Council Members',
    description:
      "The Executive Council (EC) at NukeHub serves as the guiding force overseeing all facets of the organization's mission in nuclear technology exploration and advancement. Comprising experts in nuclear science, engineering, and technology, the EC plays a pivotal role in strategic decision-making and the effective management of all initiatives. The EC actively upholds NukeHub's values, ensuring collaborative efforts with stakeholders, professionals, and enthusiasts. Delegating responsibilities to various subcommittees and working groups, the EC fosters a cohesive approach to achieving NukeHub's goals, with a commitment to excellence in nuclear science and engineering.",
    children: [
      {
        name: 'Ahnaf Tahmid Chowdhury',
        image: 'https://github.com/ahnaf-tahmid-chowdhury.png',
        organization: 'NukeHub',
        role: 'Founder & Executive Director',
        email: 'tahmid@nukehub.org',
        url: 'https://tahmid.pages.dev/',
        twitter: 'tahmid__',
        github: 'ahnaf-tahmid-chowdhury',
        bitbucket: 'ahnaf-tahmid-chowdhury',
        stackoverflow: '15208181',
        linkedin: 'ahnaf-tahmid-',
        scholar: 'U0TLOGQAAAAJ',
        orcid: '0000-0003-1070-5576',
        researchgate: 'ahnaf-tahmid-chowdhury',
      },
    ],
  },
];
