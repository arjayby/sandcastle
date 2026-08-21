import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [mdx(), sitemap()],
  output: "static",
  site: process.env.PUBLIC_SITE_URL ?? "https://sandcastle.app",
  vite: {
    plugins: [tailwindcss()],
  },
});
