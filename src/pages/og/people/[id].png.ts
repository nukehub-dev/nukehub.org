import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { generateOgImage } from "@lib/og";

export const getStaticPaths: GetStaticPaths = async () => {
  const people = await getCollection("people");
  return people.map((entry) => ({
    params: { id: entry.id },
    props: {
      name: entry.data.name,
      role: entry.data.role,
      organization: entry.data.organization,
    },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { name, role, organization } = props as {
    name: string;
    role?: string;
    organization?: string;
  };

  const description = [role, organization].filter(Boolean).join(" · ");

  const png = await generateOgImage({
    title: name,
    description: description || "NukeHub community member",
    meta: "People",
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
