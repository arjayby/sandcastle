import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("a visitor receives the Sandcastle marketing shell", async () => {
  const page = await readFile(
    new URL("../dist/index.html", import.meta.url),
    "utf8",
  );

  assert.match(page, /<header[\s>]/);
  assert.match(page, /<main[\s>]/);
  assert.match(page, /<footer[\s>]/);
  assert.match(page, />View an example</);
  assert.match(page, />Build your Brand System</);
  assert.match(page, />Sign in</);
});

test("the static page publishes default metadata without browser JavaScript", async () => {
  const page = await readFile(
    new URL("../dist/index.html", import.meta.url),
    "utf8",
  );

  assert.match(page, /<title>Sandcastle<\/title>/);
  assert.match(
    page,
    /<meta name="description" content="Create a complete, coherent Brand System with an expert AI Brand Agent\."\s*\/?>/,
  );
  assert.doesNotMatch(page, /<script[\s>]/);
});

test("marketing actions cross into the product without Brand Brief data", async () => {
  const page = await readFile(
    new URL("../dist/index.html", import.meta.url),
    "utf8",
  );
  const productLinks = [...page.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(
    ([, href]) => new URL(href),
  );

  assert.ok(productLinks.some(({ pathname }) => pathname === "/"));
  assert.ok(productLinks.some(({ pathname }) => pathname === "/dashboard"));
  assert.ok(
    productLinks.every(
      ({ searchParams }) =>
        !searchParams.has("companyName") && !searchParams.has("description"),
    ),
  );
});
