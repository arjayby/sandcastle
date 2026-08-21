import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);
const appDirectory = new URL("..", import.meta.url);
const temporaryArticle = new URL(
  "../src/content/blog/invalid-contract-check.mdx",
  import.meta.url,
);

async function expectBuildToReject(article, verifyError) {
  await writeFile(temporaryArticle, article);

  try {
    await assert.rejects(
      execute("pnpm", ["build"], { cwd: appDirectory }),
      (error) => {
        verifyError(error);
        return true;
      },
    );
  } finally {
    await rm(temporaryArticle, { force: true });
    await execute("pnpm", ["build"], { cwd: appDirectory });
  }
}

test("the build rejects an article with missing metadata", async () => {
  await expectBuildToReject(
    `---
title: Invalid contract check
draft: false
---

This temporary entry must fail the content schema.
`,
    (error) => {
      assert.match(error.stderr, /InvalidContentEntryDataError/);
      assert.match(error.stderr, /description: Required/);
      assert.match(error.stderr, /canonicalUrl: Required/);
    },
  );
});

test("the build rejects duplicate article titles", async () => {
  await expectBuildToReject(
    `---
title: Build a Brand System that stays coherent
description: This temporary entry must fail the collection uniqueness check.
publicationDate: 2026-08-21
author: Sandcastle
category: Brand systems
tags:
  - Validation
socialImage: https://sandcastle.app/social/build-a-brand-system.png
canonicalUrl: https://sandcastle.app/blog/duplicate-title-check/
draft: false
---

This temporary entry must fail the collection uniqueness check.
`,
    (error) => {
      assert.match(error.stderr, /Blog article titles must be unique/);
    },
  );
});
