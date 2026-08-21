import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../../../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, repositoryRoot), "utf8"));
}

test("marketing and product have independent Vercel build outputs", async () => {
  const [marketing, product] = await Promise.all([
    readJson("apps/marketing/vercel.json"),
    readJson("apps/web/vercel.json"),
  ]);

  assert.deepEqual(marketing, {
    $schema: "https://openapi.vercel.sh/vercel.json",
    buildCommand: "cd ../.. && pnpm exec turbo run build --filter=marketing",
    framework: "astro",
    ignoreCommand:
      "cd ../.. && pnpm exec turbo-ignore marketing --fallback=HEAD^1",
    outputDirectory: "dist",
  });
  assert.deepEqual(product, {
    $schema: "https://openapi.vercel.sh/vercel.json",
    buildCommand: "cd ../.. && pnpm exec turbo run build --filter=web",
    framework: "vite",
    ignoreCommand: "cd ../.. && pnpm exec turbo-ignore web --fallback=HEAD^1",
    outputDirectory: "dist",
    rewrites: [{ source: "/(.*)", destination: "/index.html" }],
  });
});

test("production origins keep marketing and product on separate domains", async () => {
  const productionEnvironment = await readFile(
    new URL("apps/marketing/.env.production", repositoryRoot),
    "utf8",
  );

  assert.match(
    productionEnvironment,
    /^PUBLIC_SITE_URL=https:\/\/sandcastle\.app$/m,
  );
  assert.match(
    productionEnvironment,
    /^PUBLIC_PRODUCT_URL=https:\/\/app\.sandcastle\.app$/m,
  );
});

test("the workspace graph keeps marketing static and product on Convex", async () => {
  const [marketing, product, turbo] = await Promise.all([
    readJson("apps/marketing/package.json"),
    readJson("apps/web/package.json"),
    readJson("turbo.json"),
  ]);

  assert.equal(marketing.dependencies["@sandcastle/brand"], "workspace:*");
  assert.equal(marketing.dependencies["@sandcastle/backend"], undefined);
  assert.equal(product.dependencies["@sandcastle/brand"], "workspace:*");
  assert.equal(product.dependencies["@sandcastle/backend"], "workspace:*");
  assert.deepEqual(turbo.tasks.build.outputs, ["dist/**"]);
});
