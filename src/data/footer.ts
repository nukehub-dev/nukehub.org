export interface FooterChild {
  title: string;
  url: string;
  newpage?: boolean;
}

export interface FooterColumn {
  title: string;
  children: FooterChild[];
}

export const footerColumns: FooterColumn[] = [
  {
    title: 'Navigation',
    children: [
      { title: 'Home', url: '/#home' },
      { title: 'Projects', url: '/#projects' },
      { title: 'About Us', url: '/about' },
    ],
  },
  {
    title: 'Projects',
    children: [
      { title: 'NRMS', url: '/nrms', newpage: true },
      { title: 'NukeAnalytics', url: '/nuke-analytics', newpage: true },
      { title: 'NukeLab', url: '/nuke-lab', newpage: true },
      { title: 'NukeBox', url: 'https://nukebox.readthedocs.io/', newpage: true },
    ],
  },
  {
    title: 'Connect Us',
    children: [
      { title: 'GitHub', url: 'https://github.com/nukehub-dev/', newpage: true },
      { title: 'LinkedIn', url: 'https://www.linkedin.com/company/nukehub', newpage: true },
    ],
  },
];
