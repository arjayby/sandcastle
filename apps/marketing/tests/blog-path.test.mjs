import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readOutput = (path) =>
  readFile(new URL(`../dist/${path}`, import.meta.url), "utf8");

test("readers can find a published article while drafts stay private", async () => {
  const page = await readOutput("blog/index.html");

  assert.match(
    page,
    /<link rel="canonical" href="https:\/\/sandcastle\.app\/blog\/"/,
  );
  assert.match(page, /href="\/blog\/build-a-brand-system\/"/);
  assert.match(page, />Build a Brand System that stays coherent</);
  assert.doesNotMatch(page, /A draft article/);
});

test("readers receive the complete article and its discovery metadata", async () => {
  const page = await readOutput("blog/build-a-brand-system/index.html");

  assert.match(
    page,
    /<title>Build a Brand System that stays coherent \| Sandcastle<\/title>/,
  );
  assert.match(
    page,
    /<link rel="canonical" href="https:\/\/sandcastle\.app\/blog\/build-a-brand-system\/"/,
  );
  assert.match(page, /<meta property="og:type" content="article"/);
  assert.match(
    page,
    /<meta property="og:image" content="https:\/\/sandcastle\.app\/social\/build-a-brand-system\.png"/,
  );
  assert.match(page, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(
    page,
    /<script type="application\/ld\+json">.*"@type":"BlogPosting".*<\/script>/,
  );
  assert.match(page, /A complete system gives every choice a job\./);
  assert.match(page, />Check system coherence</);
});

test("feeds and the sitemap publish only finished articles", async () => {
  const [feed, sitemap] = await Promise.all([
    readOutput("rss.xml"),
    readOutput("sitemap-0.xml"),
  ]);

  assert.match(
    feed,
    /<title>Build a Brand System that stays coherent<\/title>/,
  );
  assert.match(feed, /https:\/\/sandcastle\.app\/blog\/build-a-brand-system\//);
  assert.doesNotMatch(feed, /draft-article|A draft article/);
  assert.match(
    sitemap,
    /https:\/\/sandcastle\.app\/blog\/build-a-brand-system\//,
  );
  assert.doesNotMatch(sitemap, /draft-article/);
});
