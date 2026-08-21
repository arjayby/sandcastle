import { getCollection } from "astro:content";

interface BlogQuery {
  includeDrafts?: boolean;
}

export async function getBlogArticles({
  includeDrafts = false,
}: BlogQuery = {}) {
  const articles = await getCollection(
    "blog",
    ({ data }) => includeDrafts || !data.draft,
  );

  return articles.sort(
    (left, right) =>
      right.data.publicationDate.valueOf() -
      left.data.publicationDate.valueOf(),
  );
}
