import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { generateOgImage } from "@lib/og";
import { getRepoStats } from "@lib/github";

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await getCollection("projects");
  return projects.map((entry) => ({
    params: { slug: entry.id },
    props: {
      title: entry.data.title,
      description: entry.data.description,
      githubRepo: entry.data.githubRepo,
    },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, description, githubRepo } = props as {
    title: string;
    description?: string;
    githubRepo?: string;
  };

  const stats = getRepoStats(githubRepo);
  const meta = stats
    ? { icon: "star" as const, text: `${stats.stars.toLocaleString()} stars` }
    : undefined;

  const png = await generateOgImage({
    title,
    description,
    meta,
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
