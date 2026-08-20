# Domain docs

How the engineering skills should consume this repository domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repository root.
- **`docs/adr/`** for ADRs that touch the area about to be changed.

If either location does not exist, proceed silently. Do not flag its absence or suggest creating it upfront. The `/domain-modeling` skill, reached through `/grill-with-docs` and `/improve-codebase-architecture`, creates these files lazily when terms or decisions are resolved.

## File structure

This repository uses a single context layout:

```text
/
├── CONTEXT.md
├── docs/adr/
└── apps/ and packages/
```

## Use the glossary vocabulary

When output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If a needed concept is not in the glossary, reconsider whether the proposed language belongs to the project. If it represents a real gap, note it for `/domain-modeling`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly instead of silently overriding the decision.
