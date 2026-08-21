import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const appDirectory = fileURLToPath(new URL("..", import.meta.url));

async function createTestApp(article) {
  const directory = await mkdtemp(
    join(tmpdir(), "sandcastle-marketing-contract-"),
  );

  await Promise.all([
    cp(join(appDirectory, "src"), join(directory, "src"), { recursive: true }),
    cp(join(appDirectory, "public"), join(directory, "public"), {
      recursive: true,
    }),
    ...["astro.config.ts", "package.json", "tsconfig.json"].map((file) =>
      cp(join(appDirectory, file), join(directory, file)),
    ),
  ]);
  await symlink(
    join(appDirectory, "node_modules"),
    join(directory, "node_modules"),
    "dir",
  );
  await writeFile(
    join(directory, "src/content/blog/invalid-contract-check.mdx"),
    article,
  );

  return directory;
}

async function expectBuildToReject(article, verifyError) {
  const directory = await createTestApp(article);

  try {
    await assert.rejects(
      execute("pnpm", ["exec", "astro", "build"], { cwd: directory }),
      (error) => {
        verifyError(error);
        return true;
      },
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
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
