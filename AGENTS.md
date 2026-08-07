# AGENTS.md — Divemaster Progress App

Standing rules for any agent working in this repo. Read `docs/SPEC.md` before writing code.

## Project

Digital replacement for the paper PADI Divemaster Candidate Information and Evaluation Form. Students request sign-offs for training requirements; instructors approve them with a score and a drawn signature; everyone sees live progress.

Source of truth documents in `docs/`:

- `SPEC.md` — requirements, roles, flows, progress rules. **Authoritative. If code and SPEC disagree, SPEC wins.**
- `API.md` — endpoint contract and server-side validation rules
- `schema.sql` — reference Postgres DDL (translate to Drizzle, do not run directly)
- `seed.sql` — reference catalog content (translate to a TypeScript seed script)

## Stack — do not substitute

| Layer | Choice |
|---|---|
| Framework | Next.js 15+, App Router, TypeScript strict |
| API | Next.js route handlers under `app/api/**` — no separate server |
| Database | PostgreSQL 16 |
| ORM | **Drizzle ORM** + `drizzle-kit` migrations |
| Styling | **Tailwind CSS + shadcn/ui** — no MUI, no other component library |
| Charts | Recharts (pie chart only) |
| Auth | `jose` JWT in an httpOnly cookie, `argon2` password hashing |
| Validation | Zod on every route handler input |
| i18n | `next-intl`, locales `en` (complete) and `es` (scaffolded) |
| Testing | Vitest for units, Playwright for E2E |
| Signature capture | `react-signature-canvas` or a plain `<canvas>` implementation |
| PDF export | `pdf-lib` |
| Animation | `canvas-confetti` (approved exception for student celebrations) |

Node 20+. Package manager: `pnpm`.

## Non-negotiable domain rules

These come from PADI standards. Never relax them to make a test pass.

1. **Approved sign-offs are immutable.** No update path exists. An admin may `VOID` with a reason; the original row stays.
2. **Every approval must snapshot** the instructor's name and PADI number as text on the request row — never rely on a join to `users` for the historical record.
3. **`required_count` implements X2/X3.** An item with count 3 needs three approvals with three distinct `performed_at` dates. Never collapse this to a boolean.
4. **Progress is counted in approval instances**, not items. Total is 53 units with the seeded catalog.
5. **Skills workshop:** every skill scores ≥ 3, skills 1–23 total ≥ 82, skill 24 is excluded from the total, at least one `is_underwater` skill must be 5.
6. **Waterskills:** exercises 1–5 must total ≥ 15.
7. **`performed_at` may never be in the future.**
8. All authorization is enforced **server-side**. Hiding a button is not authorization.

## Code conventions

- TypeScript `strict: true`. No `any`. No non-null `!` assertions without a comment explaining why.
- All DB access goes through `lib/db/queries/*.ts`. Route handlers and React components never build SQL or call Drizzle directly.
- Every route handler: parse input with Zod → check session → check role → do work in a transaction → return typed JSON. Extract this into `lib/api/handler.ts` and reuse it.
- Shared types live in `lib/types.ts` and are derived from the Drizzle schema where possible.
- Server Components by default. `'use client'` only where interactivity requires it.
- shadcn/ui components are **installed into `components/ui/` and owned by this repo** — edit them freely. Do not wrap them in another abstraction layer. Reach for an existing shadcn primitive before hand-rolling a button, dialog, select, or form control.
- No user-facing string is hard-coded in a component. Everything goes through `next-intl` message keys.
- Timestamps stored as `timestamptz` in UTC. The user's local timezone is a display concern.
- File length target: under 300 lines. Split when a file grows past that.

## Guardrails — stop and ask before

- Adding a dependency not listed in the Stack table (adding a shadcn/ui component via `npx shadcn@latest add` is fine and needs no approval)
- Changing anything in `docs/` — these are human-authored specs
- Dropping a table, or writing a destructive migration against a non-empty database
- Weakening or removing a domain rule above to make a test pass
- Storing credentials, keys, or connection strings anywhere but `.env.local`

## Testing

- Every route handler needs a Vitest test covering: happy path, unauthenticated, wrong role, invalid input.
- The progress calculation and every domain rule in the list above need dedicated unit tests. These are the highest-value tests in the project — write them before the UI.
- One Playwright E2E per phase checkpoint, as described in `tasks.md`.
- Do not mark a task complete with a failing test or a TypeScript error. `pnpm typecheck && pnpm test` must pass.

## Verification expectations

You have a browser. After each phase, launch the app, walk the checkpoint flow, and attach screenshots at both 390px (phone) and 1440px (desktop) widths. Students use phones — a layout that only works on desktop is not done.

## Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
- One commit per completed task in `tasks.md`, referencing the task ID, e.g. `feat(auth): login route handler (T2.3)`
- Never commit `.env.local`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
