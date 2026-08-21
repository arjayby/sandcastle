# Blog authoring

Add each article as an MDX file in this directory. The file name becomes the article URL under `/blog/`.

Every article must define these frontmatter fields:

```yaml
title: A unique article title
description: A concise article summary
publicationDate: 2026-08-21
updateDate: 2026-08-22 # Optional
author: Sandcastle
category: Brand systems
tags:
  - Foundations
socialImage: https://sandcastle.app/social/article-name.png
canonicalUrl: https://sandcastle.app/blog/article-name/
draft: false
```

The production build excludes entries with `draft: true`. The content schema stops the build when a required field is missing or invalid.

Article Markdown gets the approved typography automatically. These approved MDX components are also available without imports:

```mdx
<Callout title="Start with the whole system">
  Add a concise note here.
</Callout>

<InteractiveExample summary="Check system coherence">
  Add optional content that the reader can open with a pointer or keyboard.
</InteractiveExample>
```

Keep articles static unless an interactive example materially improves the explanation.
