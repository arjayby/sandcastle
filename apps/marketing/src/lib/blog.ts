import { getCollection } from "astro:content";

interface BlogQuery {
  includeDrafts?: boolean;
}

const longDateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

export async function getBlogArticles({
  includeDrafts = !import.meta.env.PROD,
}: BlogQuery = {}) {
  const articles = await getCollection("blog");
  const titles = new Set<string>();
  const canonicalUrls = new Set<string>();

  for (const { data } of articles) {
    const normalizedTitle = data.title.trim().toLocaleLowerCase("en");
    const normalizedCanonicalUrl = new URL(data.canonicalUrl).href;

    if (titles.has(normalizedTitle)) {
      throw new Error(`Blog article titles must be unique: "${data.title}"`);
    }
    if (canonicalUrls.has(normalizedCanonicalUrl)) {
      throw new Error(
        `Blog article canonical URLs must be unique: "${data.canonicalUrl}"`,
      );
    }

    titles.add(normalizedTitle);
    canonicalUrls.add(normalizedCanonicalUrl);
  }

  return articles
    .filter(({ data }) => includeDrafts || !data.draft)
    .sort(
      (left, right) =>
        right.data.publicationDate.valueOf() -
        left.data.publicationDate.valueOf(),
    );
}

export const formatBlogDate = (date: Date) => longDateFormatter.format(date);
