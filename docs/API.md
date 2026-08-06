# API Surface — Divemaster Progress App

Node.js (Express or Fastify) + `pg`/Prisma. JSON over HTTPS. Auth via httpOnly JWT cookie; every route below requires auth except `/auth/*`.

`S` = student, `I` = instructor, `A` = admin.

## Auth
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/auth/login` | — | `{email, password}` → sets cookie |
| POST | `/auth/logout` | all | |
| POST | `/auth/refresh` | all | rotates refresh token |
| GET | `/auth/me` | all | current user + role + dive centre |
| POST | `/auth/change-password` | all | |

## Users (admin)
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/users` | S I A | list; filter `?role=` |
| POST | `/users` | A | create student/instructor/admin |
| PATCH | `/users/:id` | A, or self for own profile | |
| PATCH | `/users/:id/deactivate` | A | |
| GET | `/instructors` | S I A | dropdown source for the request form |

## Student profile
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/students/:id/profile` | S I A | |
| PUT | `/students/:id/profile` | S (own), A | address, emergency contact, `logged_dives` |

## Catalog
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/catalog` | all | sections → items → score sheet lines. Cacheable |
| PATCH | `/catalog/items/:id` | A | v2: toggle active, edit titles/counts |

## Courses & progress
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/courses` | A | start a course for a student |
| GET | `/courses/:id` | all | |
| GET | `/courses/:id/progress` | all | `{total, approved, pending, notStarted, percent, sections[], ruleChecks[]}` — powers the pie |
| GET | `/courses/:id/items` | all | every item with `approvedCount / requiredCount` and per-attempt request state |
| GET | `/courses/:id/export.pdf` | all | filled 4-page form |
| POST | `/courses/:id/complete` | I A | validates all rules, flips to `COMPLETE`, 422 with failing rules otherwise |

## Sign-off requests
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/requests` | S | `{itemId, performedAt, performedTz, instructorId, note}` → `PENDING`. Server assigns `attempt_number` |
| GET | `/requests` | all | filter `?status=&studentId=&instructorId=&mine=true` |
| GET | `/requests/:id` | all | |
| DELETE | `/requests/:id` | S (own, while `PENDING`) | withdraw |
| POST | `/requests/:id/approve` | I A | see payload below |
| POST | `/requests/:id/reject` | I A | `{reason}` |
| POST | `/requests/:id/void` | A | `{reason}` — reverses an approval, audited |
| GET | `/requests/inbox/count` | I A | badge number |

**Approve payload** (fields depend on the item's `scoring`):
```jsonc
{
  "signature": "data:image/png;base64,...",   // required
  "comment": "Good buoyancy control",         // optional
  "score": 4,                                 // SCORE_1_5 items
  "lineScores": [ { "lineId": 12, "score": 4 } ],  // SCORE_SHEET items (all lines required)
  "exam": { "part1": 88, "part2": 92, "diveTheoryOnline": false },  // EXAM items
  "satisfiedBy": "SPECIALTY_CERT"             // optional alternative path
}
```
Server snapshots the instructor's name + PADI No., stores the signature, writes the audit row, and creates the student notification — all in one transaction.

## Notifications
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/notifications` | all | `?unread=true` |
| POST | `/notifications/:id/read` | all | |
| POST | `/notifications/read-all` | all | |

## Validation rules enforced server-side
1. `performedAt` cannot be in the future.
2. A student cannot open a second request for the same `(item, attempt)` while one is `PENDING`.
3. A student cannot exceed `required_count` approvals for an item.
4. `SCORE_SHEET` approval must include every line; totals and per-line minimums are checked before commit.
5. Only `INSTRUCTOR`/`ADMIN` in the same dive centre may act on a request.
6. Approved requests are immutable — no PATCH route exists.
