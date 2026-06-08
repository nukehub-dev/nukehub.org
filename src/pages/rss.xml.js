import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const site = context.site?.toString() || 'https://nukehub.org';

  const [projects, manual] = await Promise.all([
    getCollection('projects'),
    getCollection('manual'),
  ]);

  const projectItems = projects.map((entry) => ({
    title: entry.data.title,
    description: entry.data.description || '',
    link: entry.data.permalink || `/${entry.id}`,
    pubDate: entry.data.lastUpdated
      ? new Date(entry.data.lastUpdated)
      : new Date('2025-01-01'),
  }));

  const manualItems = manual.map((entry) => ({
    title: entry.data.title,
    description: entry.data.description || '',
    link: entry.data.permalink || `/${entry.id}`,
    pubDate: entry.data.lastUpdated
      ? new Date(entry.data.lastUpdated)
      : new Date('2025-01-01'),
  }));

  const items = [...projectItems, ...manualItems]
    .map((item) => ({
      title: item.title,
      description: item.description,
      link: item.link,
      pubDate: item.pubDate,
    }))
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'NukeHub',
    description:
      'Open-source nuclear engineering tools, projects, and community updates from NukeHub.',
    site,
    items,
    customData: `
      <language>en</language>
      <managingEditor>tahmid@nukehub.org</managingEditor>
      <webMaster>tahmid@nukehub.org</webMaster>
    `,
  });
}
