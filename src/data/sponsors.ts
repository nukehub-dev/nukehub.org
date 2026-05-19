export interface Sponsor {
  name: string;
  image: string;
  url: string;
  acknowledgment: string;
}

export const sponsors: Sponsor[] = [
  {
    name: 'Military Institute of Science and Technology (MIST)',
    image: '/assets/images/sponsors/MIST.png',
    url: 'https://mist.ac.bd',
    acknowledgment:
      'Heartfelt thanks to the Military Institute of Science and Technology (MIST) for generously hosting NukeHub on their servers. Their support is instrumental in ensuring the smooth operation and accessibility of our platform.',
  },
];
