import rss from "@astrojs/rss";

import type { APIRoute } from "astro";

import { getBlogArticles } from "../lib/blog";

export const GET: APIRoute = async (context) => {
  const articles = await getBlogArticles();

  return rss({
    title: "Sandcastle journal",
    description:
      "Practical articles about creating and maintaining a coherent Brand System.",
    site: context.site ?? "https://sandcastle.app",
    items: articles.map(({ data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.publicationDate,
      link: data.canonicalUrl,
      categories: [data.category, ...data.tags],
    })),
  });
};
