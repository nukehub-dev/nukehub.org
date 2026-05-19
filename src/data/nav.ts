export interface NavChild {
  title: string;
  icon: string;
  url: string;
  newpage?: boolean;
}

export interface NavItem {
  title: string;
  icon: string;
  url?: string;
  newpage?: boolean;
  children?: NavChild[];
}

export const navItems: NavItem[] = [
  {
    title: 'Home',
    icon: 'nuke-home',
    url: '/',
  },
  {
    title: 'Projects',
    icon: 'nuke-application',
    children: [
      { title: 'NRMS', icon: 'nuke-power-plant-1', url: '/nrms' },
      { title: 'NukeAnalytics', icon: 'nuke-chart-1', url: '/nuke-analytics' },
      { title: 'NukeLab', icon: 'nuke-research-platform', url: '/nuke-lab' },
      { title: 'NukeBox', icon: 'nuke-box', url: 'https://nukebox.readthedocs.io/', newpage: true },
    ],
  },
  {
    title: 'Manual',
    icon: 'nuke-news',
    children: [
      { title: 'About Us', icon: 'nuke-about', url: '/about' },
      { title: 'Privacy Policy', icon: 'nuke-lock', url: '/privacy-policy' },
      { title: 'Terms of Service', icon: 'nuke-document-ready', url: '/terms-of-service' },
      { title: 'Code of Conduct', icon: 'nuke-law', url: '/code-of-conduct' },
      { title: 'Acknowledgment', icon: 'nuke-certificate-file', url: '/acknowledgment' },
      { title: 'Support Us', icon: 'nuke-love', url: '/support' },
    ],
  },
  {
    title: 'Community',
    icon: 'nuke-group',
    children: [
      { title: 'People', icon: 'nuke-profile', url: '/people' },
      { title: 'Events', icon: 'nuke-calender-alt', url: '/events' },
      { title: 'NukeTalk', icon: 'nuke-chat-2', url: 'https://talk.nukehub.org', newpage: true },
      { title: 'GitHub', icon: 'nuke-github', url: 'https://github.com/nukehub-dev', newpage: true },
      { title: 'LinkedIn', icon: 'nuke-linkedin-solid', url: 'https://www.linkedin.com/company/nukehub', newpage: true },
    ],
  },
];
