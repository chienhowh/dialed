# AGENTS.md

## Project

Dialed is a coffee brewing assistant focused on helping users
choose a taste goal, generate a brew plan, brew, evaluate the
result, and iteratively dial in the coffee.

## Source of Truth

Before implementing a feature, read the relevant documentation:

- Product behavior: `docs/PRODUCT.md`
- Technical architecture: `docs/ARCHITECTURE.md`
- UX flows: `docs/wireframes/`

Priority:

1. PRODUCT.md — what the product should do
2. ARCHITECTURE.md — how the system should be structured
3. wireframes — current UX reference
4. existing implementation

## Development Rules

- Do not silently change documented product behavior.
- Do not silently introduce a new architectural pattern.
- Keep domain logic outside React components.
- Prefer the simplest implementation that satisfies the current MVP.
- Do not implement Future / P1 features unless explicitly requested.
- Do not introduce infrastructure for hypothetical future needs.

If implementation conflicts with the documentation:

1. Stop before making the conflicting design decision.
2. Explain the conflict.
3. Propose the smallest reasonable solution.
4. Update the relevant documentation if the decision changes.
5. Then implement the change.

## Before Coding

For non-trivial features:

1. Read the relevant product spec.
2. Read the relevant architecture section.
3. Read the relevant wireframe.
4. Inspect the existing implementation.
5. Propose an implementation plan before making large changes.

## After Coding

Run the relevant:

- typecheck
- lint
- unit tests
- integration / E2E tests when applicable

Summarize:

- what changed
- important implementation decisions
- tests performed
- any documentation that should be updated

## Language

- Always communicate with the user in Traditional Chinese (繁體中文).
- Keep code, variable names, function names, file names, commit messages, and technical terms in English when appropriate.
- Explanations, plans, summaries, and questions should be written in Traditional Chinese.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
