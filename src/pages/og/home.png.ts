import type { APIRoute } from "astro";
import { generateOgImage } from "@lib/og";

export const GET: APIRoute = async () => {
  const png = await generateOgImage({
    title: "NukeHub",
    description:
      "A pioneering platform for open-source nuclear engineering simulation, education, and collaboration.",
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
