import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import markdownNegotiation from "./src/integrations/markdown-negotiation";

// https://astro.build/config
export default defineConfig({
  site: "https://nukehub.org",
  output: "static",
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
  image: {
    domains: ["github.com", "avatars.githubusercontent.com"],
  },
  integrations: [react(), mdx(), sitemap(), markdownNegotiation()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: true,
    },
    optimizeDeps: {
      include: [
        "@fullcalendar/react",
        "@fullcalendar/daygrid",
        "@fullcalendar/timegrid",
        "@fullcalendar/list",
        "@fullcalendar/interaction",
      ],
      exclude: ["@resvg/resvg-js"],
      esbuildOptions: {
        define: {
          "process.env.NODE_ENV": JSON.stringify(
            process.env.NODE_ENV || "production",
          ),
        },
      },
    },
    ssr: {
      external: ["@resvg/resvg-js"],
    },
    resolve: {
      alias: {
        "@components": "/src/components",
        "@layouts": "/src/layouts",
        "@data": "/src/data",
        "@styles": "/src/styles",
        "@lib": "/src/lib",
        "@content": "/src/content",
        "@modules": "/src/modules",
      },
    },
  },
});
