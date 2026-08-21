import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.mdx" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publicationDate: z.coerce.date(),
    updateDate: z.coerce.date().optional(),
    author: z.string().min(1),
    category: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    socialImage: z.url(),
    canonicalUrl: z.url(),
    draft: z.boolean(),
  }),
});

export const collections = { blog };
