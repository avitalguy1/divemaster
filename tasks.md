# tasks.md — Divemaster Progress App

Execution plan for Antigravity. Read `AGENTS.md` and `docs/SPEC.md` first.

**Rules of engagement**

- Work phases in order. Do not start a phase until the previous checkpoint passes.
- **Stop at every 🛑 CHECKPOINT.** Post the screenshots and test output as artifacts and wait for human approval.
- Tick each `[ ]` as you complete it. One commit per task, tagged with the task ID.
- If a task contradicts `docs/SPEC.md`, stop and ask. Do not guess.

---

## Phase 0 — Foundation

- [ ] **T0.1** Scaffold Next.js 15 App Router + TypeScript strict + Tailwind. `pnpm` only.
- [ ] **T0.1b** Init shadcn/ui (`npx shadcn@latest init`). Install the base set now: `button`, `input`, `label`, `select`, `dialog`, `form`, `card`, `badge`, `table`, `tabs`, `accordion`, `toast`, `alert`, `progress`, `avatar`, `dropdown-menu`, `sheet`, `textarea`, `toggle-group`, `checkbox`, `skeleton`. Set the theme once — neutral base, and pick semantic colours for the three progress states (approved / pending / not started) as CSS variables so the pie chart and status chips stay in sync.
- [ ] **T0.2** Configure ESLint + Prettier. Add scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed`.
- [ ] **T0.3** `docker-compose.yml` with Postgres 16 on port 5433 and a named volume. Add `.env.example` with `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`.
- [ ] **T0.4** Install and configure Drizzle ORM + drizzle-kit. Connection pool in `lib/db/index.ts`.
- [ ] **T0.5** Install Vitest and Playwright. One trivial passing test of each to prove the harness works.
- [ ] **T0.6** Configure `next-intl` with `en` and `es` locale files. `en` is populated as you build; `es` mirrors the key structure with English placeholder values.

🛑 **CHECKPOINT 0** — `pnpm dev` serves a page, `pnpm typecheck` clean, `pnpm test` passes, Postgres reachable. Screenshot the running page.

---

## Phase 1 — Data layer

Translate `docs/schema.sql` into Drizzle. Keep table and column names identical so the SQL file stays a readable reference.

- [ ] **T1.1** Drizzle enums: `user_role`, `request_status`, `course_status`, `evidence_type`, `scoring_type`.
- [ ] **T1.2** Tables `dive_centers`, `users`, `student_profiles`. Include the `instructor_needs_padi_no` check constraint.
- [ ] **T1.3** Catalog tables `requirement_sections`, `requirement_items`, `score_sheet_lines`, `requirement_rules`.
- [ ] **T1.4** Tables `courses`, `signoff_requests`, `signoff_scores`, `signatures`. Include both partial unique indexes (`uniq_approved_attempt`, `uniq_pending_attempt`) and the `decided_fields_present` / `rejection_needs_reason` check constraints — these are the integrity backbone, do not skip them.
- [ ] **T1.5** Tables `notifications`, `audit_log`.
- [ ] **T1.6** Views `v_course_item_progress` and `v_course_progress` as raw SQL in a migration. Expose them to Drizzle as read-only views.
- [ ] **T1.7** Generate and run the initial migration. Verify against a fresh database.
- [ ] **T1.8** Seed script `lib/db/seed.ts` translating `docs/seed.sql`: 9 sections, 42 requirement items, 24 skill lines, 7 professionalism lines, all rules. Must be idempotent (re-running does not duplicate).
- [ ] **T1.9** Dev fixture script: one dive centre, 1 admin, 2 instructors, 3 students with courses at different progress levels. Needed for every later checkpoint.
- [ ] **T1.10** Test: after seeding, `SUM(required_count)` over active items **= 53**. Assert per-section totals match `docs/SPEC.md` §4 (9, 3, 11, 6, 1, 8, 6, 8, 1).

🛑 **CHECKPOINT 1** — migration + seed run clean on an empty DB. Show the 53-unit assertion passing and a `psql` dump of `requirement_items` grouped by section.

---

## Phase 2 — Auth and roles

- [ ] **T2.1** `lib/auth/password.ts` — argon2 hash and verify.
- [ ] **T2.2** `lib/auth/session.ts` — sign/verify JWT with `jose`, httpOnly + secure + sameSite=lax cookie, 15 min access token, refresh rotation.
- [ ] **T2.3** Route handlers: `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`, `POST /api/auth/change-password`.
- [ ] **T2.4** `lib/api/handler.ts` — the shared wrapper: Zod parse → session → role guard → transaction → typed JSON. Every subsequent route handler uses it. Standard error shape `{ error: { code, message, details? } }`.
- [ ] **T2.5** `middleware.ts` — redirect unauthenticated users to `/login`; route by role to `/dashboard`, `/instructor`, or `/admin`.
- [ ] **T2.6** Login page using shadcn `form` + `input` + `button` with Zod resolver. Mobile-first, works one-handed on a phone.
- [ ] **T2.7** Tests: correct password, wrong password, unknown email, expired token, inactive user, role guard rejects wrong role with 403.

🛑 **CHECKPOINT 2** — log in as each of the three roles and land on the right page. Screenshots at 390px and 1440px. Auth test suite green.

---

## Phase 3 — Vertical slice: request → approve

The most important phase. One requirement item, end to end. Get this right and the rest is repetition.

- [ ] **T3.1** `GET /api/catalog` — sections → items → score sheet lines, cached.
- [ ] **T3.2** `GET /api/instructors` — active instructors at the caller's dive centre, for the picker.
- [ ] **T3.3** `POST /api/requests` — student submits. Server assigns `attempt_number` as `(approved + pending count for that item) + 1`. Rejects: future `performed_at`, an already-open request for the same item+attempt, exceeding `required_count`. Creates the instructor notification in the same transaction.
- [ ] **T3.4** `GET /api/requests` with filters `status`, `studentId`, `instructorId`, `mine`.
- [ ] **T3.5** `POST /api/requests/:id/approve` — the critical path. In one transaction: store signature, snapshot instructor name + PADI No., set `decided_at`, write `audit_log`, create the student notification. Reject if the caller is not an instructor/admin in the same dive centre, or if the request is not `PENDING`.
- [ ] **T3.6** `POST /api/requests/:id/reject` — requires a reason. `DELETE /api/requests/:id` — student withdraws own pending request.
- [ ] **T3.7** Signature canvas component. Must work with a finger on a phone. Trim whitespace, export PNG under 50 KB. This is custom — shadcn has no equivalent. Present it inside a shadcn `dialog` (desktop) / `sheet` (mobile), and disable page scroll while drawing so a finger stroke doesn't scroll the page.
- [ ] **T3.8** Student "New request" screen: shadcn `form` with item `select`, date/time inputs, instructor `select`, note `textarea`.
- [ ] **T3.9** Instructor approval screen: shadcn `card` per request — student, item, date/time, note, comment box, signature pad, Approve / Reject buttons. Confirm destructive Reject through a `dialog`.
- [ ] **T3.10** Tests — write these before the UI:
  - approval is atomic; a failure mid-way rolls back the notification and audit row
  - no route exists that can modify an `APPROVED` request
  - instructor snapshot survives renaming the instructor afterwards
  - two concurrent approvals of the same request: exactly one wins
  - a fourth approval on a `required_count = 3` item is rejected

🛑 **CHECKPOINT 3** — browser walkthrough: student submits *Skill 3 – Dive Briefing*, instructor sees the badge, signs, approves; student sees it approved. Record it. Both viewport widths.

---

## Phase 4 — Full catalog, scoring, dashboard

- [ ] **T4.1** Scored items (`SCORE_1_5`): instructor enters 1–5 at approval. Waterskills exercises 1–5.
- [ ] **T4.2** Score sheet items (`SCORE_SHEET`): one request holding many line scores. Build the 24-skill grid — mobile-usable, shows the 1–5 criteria text from SPEC §3.5, live running total, inline `alert` warnings when total < 82, any line < 3, or no underwater 5. Same component drives the 7 professionalism criteria. Use a segmented 1–5 control (shadcn `toggle-group`), not a dropdown — 24 dropdowns on a phone is unusable.
- [ ] **T4.3** Exam item (`EXAM`): Part 1 + Part 2 scores, or the Dive Theory Online checkbox. Enforce exactly one path.
- [ ] **T4.4** Alternative paths: Practical Skills 4 and 5 satisfied by `satisfiedBy: 'SPECIALTY_CERT'`.
- [ ] **T4.5** `lib/progress/engine.ts` — reads `v_course_progress` for counts and evaluates every `requirement_rules` row. Returns `{ total, approved, pending, notStarted, percent, sections[], ruleChecks[] }`. Pure and fully unit-tested.
- [ ] **T4.6** `GET /api/courses/:id/progress` and `GET /api/courses/:id/items`.
- [ ] **T4.7** Student dashboard: Recharts pie (Approved / Pending / Not started), percent complete, "waiting on instructor" count, next suggested items. This is the app's front door — make it good on a phone.
- [ ] **T4.8** Student requirements screen: shadcn `accordion` by section, `badge` status chips, `2 of 3 approved` counters, per-attempt state, request button.
- [ ] **T4.9** Instructor inbox with `badge` count, and an all-students `table` with `progress` bars. Confirm: every role can see every student (SPEC §1).
- [ ] **T4.10** `POST /api/courses/:id/complete` — 422 listing every failing rule unless all 53 units are approved and all rules pass.
- [ ] **T4.11** In-app notifications: list, unread badge, mark read, mark all read.
- [ ] **T4.12** Tests: progress engine against fixture courses at 0%, partial, and 100%; each rule failing in isolation; the X3 item showing 1/3, 2/3, 3/3 correctly.

🛑 **CHECKPOINT 4** — dashboard screenshots for a 0%, ~40%, and 100% student. Show the skills-workshop grid rejecting a total of 81 and accepting 82.

---

## Phase 5 — Admin, PDF export, hardening

- [ ] **T5.1** Admin user management: create/invite, assign role, set PADI No., deactivate.
- [ ] **T5.2** Admin course management: start a course for a student.
- [ ] **T5.3** `POST /api/requests/:id/void` — admin only, reason required, fully audited. Progress recalculates.
- [ ] **T5.4** Audit log viewer, filterable by entity and actor.
- [ ] **T5.5** Student profile screen — page 1 fields of the paper form, plus `logged_dives`.
- [ ] **T5.6** PDF export with `pdf-lib`: all 4 pages of the original form, populated with approved dates, instructor names, PADI numbers, embedded signature images. X2/X3 items print every date in the cell. `GET /api/courses/:id/export.pdf`.
- [ ] **T5.7** Rate-limit login. Add security headers. Confirm no stack traces or SQL leak into error responses.
- [ ] **T5.8** Spanish locale file — real translations for all `en` keys. Verify a locale switch changes every visible string.
- [ ] **T5.9** Accessibility pass. shadcn/ui is Radix-based so most primitives are accessible already — focus the audit on custom code: the signature canvas (needs a documented non-mouse alternative), the 1–5 toggle groups, the pie chart (needs a text equivalent), and colour contrast on the three status colours.
- [ ] **T5.10** `README.md`: local setup, migrations, seeding, test commands, deploy notes.

🛑 **CHECKPOINT 5** — exported PDF for a 100%-complete student, side by side with the original blank form. Full test suite green.

---

## Phase 6 — Verification (do not skip)

- [ ] **T6.1** Playwright E2E: full student journey from registration to a complete course.
- [ ] **T6.2** Playwright E2E: instructor journey — inbox, score, sign, approve, reject with reason.
- [ ] **T6.3** Playwright E2E: admin journey — create users, void an approval, export PDF.
- [ ] **T6.4** Authorization sweep: for every route, attempt access as each of the three roles plus unauthenticated. Produce a matrix artifact showing expected vs actual status codes. Any mismatch is a bug.
- [ ] **T6.5** Catalog audit: script that prints every seeded item with its `required_count` and diffs it against the table in `docs/SPEC.md` §3. Must match exactly.
- [ ] **T6.6** Mobile pass at 390×844: every student screen, screenshotted. No horizontal scroll, no tap target under 44px.
- [ ] **T6.7** Load a course with 53 approved requests and confirm the dashboard renders in under 500ms.

🛑 **FINAL CHECKPOINT** — the authorization matrix, the catalog diff, the mobile screenshot set, and a green full-suite run.

---

## Known open questions

`docs/SPEC.md` §9 lists five unresolved items. If you reach one, implement the stated default and flag it — do not silently pick something else.

1. Diver Rescue (Exercise 7) — implemented as pass/fail; may become scored 1–5
2. Whether the instructor UI should display PADI's time/distance tables for waterskills
3. Final exam pass mark enforcement (75%?)
4. The underwater-skill list (7–18, 22, 23)
5. Whether all personal-info fields are collected or only those needed for the PDF
