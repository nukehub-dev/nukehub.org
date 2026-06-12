import type { APIRoute } from "astro";
import { generateOgImage } from "@lib/og";

export const GET: APIRoute = async () => {
  const png = await generateOgImage({
    title: "Public Roadmap",
    description:
      "See what NukeHub is building next and what has already shipped.",
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
