import * as React from 'react';

export interface Sponsor {
  name: string;
  image: string;
  url: string;
  acknowledgment: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
}
