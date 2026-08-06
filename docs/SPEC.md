# Divemaster Progress App — Specification v1

Digital replacement for the paper *PADI Divemaster Candidate Information and Evaluation Form* (Product 10147) and the *Divemaster Skill Development Score Sheet* (Product 10150).

**Stack:** Next.js (App Router) frontend · Node.js API · PostgreSQL
**Primary device:** phone for students; phone + desktop for instructors/admin → mobile-first responsive
**Language:** English at launch, Spanish planned → i18n from day one, no hard-coded strings

---

## 1. Roles & permissions

| | Student | Instructor | Admin |
|---|---|---|---|
| View own progress | ✅ | — | — |
| View all students' progress | ✅ | ✅ | ✅ |
| Submit sign-off request | ✅ | — | — |
| Approve / reject request | — | ✅ | ✅ |
| Enter scores | — | ✅ | ✅ |
| Manage users, assign roles | — | — | ✅ |
| Export completed PDF | ✅ (own) | ✅ | ✅ |
| Edit requirement catalog | — | — | ✅ (v2) |

"All" visibility confirmed: every user can see every student's progress. Instructors see all students, not only their own requesters.

---

## 2. Core flow

```
Student                          Instructor
   │
   ├─ picks a requirement item
   ├─ enters date + time performed
   ├─ (optional) note
   ├─ selects instructor from dropdown ──────►  appears in "Pending requests"
   │                                              │
   │                                              ├─ reviews
   │                                              ├─ enters score (if scored item)
   │                                              ├─ adds comment (optional)
   │                                              ├─ draws signature
   │                                              ├─ PADI No. auto-filled from profile
   │                                              │
   │  ◄──── APPROVED (locked, immutable) ─────────┤
   │  ◄──── REJECTED + reason (student may resubmit)
   │
   └─ dashboard updates live
```

**Status machine:** `DRAFT → PENDING → APPROVED | REJECTED`
A `REJECTED` request is terminal; the student creates a new request (full history preserved).
An `APPROVED` request is immutable. Corrections are handled by an admin `VOIDED` flag with a reason, never by editing.

**Instructor selection:** student picks any instructor from the dive centre list, per request.

---

## 3. Requirement catalog

Seeded from the PDF. `required_count` implements the X2/X3 multipliers — the item needs that many **separate, independently-dated** approvals.

### 3.1 Prerequisites and Administration — instructor verification, no upload
Student presents physical documents in person; instructor confirms in the app.

| # | Item | Count |
|---|---|---|
| 1 | 18 years or older | 1 |
| 2 | Advanced Open Water or qualifying certification | 1 |
| 3 | Rescue Diver or qualifying certification | 1 |
| 4 | Medical Statement and physician's approval | 1 |
| 5 | EFR Primary and Secondary Care training | 1 |
| 6 | Statement of Understanding | 1 |
| 7 | Liability Release (Statement of Risks – EU) | 1 |
| 8 | 40 logged dives | 1 |
| 9 | Course fees paid | 1 |
| — | ~~Two photos received~~ | seeded `is_active = false` (marked NOT NEEDED on your form) |

### 3.2 Certification Requirements
| Item | Count |
|---|---|
| 60 logged dives | 1 |
| EFR training current within 24 months | 1 |
| Read and agreed to PADI Membership and License Agreement | 1 |

**Logged dives:** a plain integer on the student profile (`logged_dives`). Student updates it; instructor confirms against the physical logbook at approval. No dive log feature.

### 3.3 Knowledge Development
Emergency Assistance Plan, plus Knowledge Reviews 1–9 (10 items, count 1 each).

**Final Exam** — one item, satisfied by *either*:
- Part 1 score **and** Part 2 score entered, **or**
- `Dive Theory Online` completion checkbox

### 3.4 Waterskills Exercises — scored 1–5
| Exercise | Note |
|---|---|
| 1 – 400 m/yd swim | your form specifies **yards** |
| 2 – 15 minute float/tread | yards |
| 3 – 800 m/yd snorkel swim | yards |
| 4 – 100 m/yd diver tow | yards |
| 5 – Equipment Exchange | |
| **Total Points** | **must be ≥ 15** — computed, not entered |
| Diver Rescue (Exercise 7) | complete / incomplete |

### 3.5 Diver Skills Workshop — the 24-skill score sheet
One evaluation event = one sign-off request containing 24 scores.

Rules enforced by the app:
- every skill ≥ 3
- **skills 1–23 total ≥ 82** (skill 24 *Emergency weight drop* excluded — confirmed)
- at least one **underwater** skill scored 5

Score criteria (1–5) are shown inline to the instructor, verbatim from the sheet.

Skills flagged `is_underwater`: 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 23. *(Please sanity-check this list — it drives the "one underwater skill to a 5" rule.)*

### 3.6 Practical Application
| Skill | Count | Alternative |
|---|---|---|
| 1 – Dive Site Set Up and Management | **3** | |
| 2 – Mapping Project | 1 | |
| 3 – Dive Briefing | **2** | |
| 4 – Search and Recovery Scenario | 1 | PADI S&R Diver specialty cert |
| 5 – Deep Dive Scenario | 1 | PADI Deep Diver specialty cert |

An "alternative" satisfies the item in full — one approval, `satisfied_by = 'SPECIALTY_CERT'`.

### 3.7 Divemaster-Conducted Programs Workshops
| Workshop | Count |
|---|---|
| 1 – ReActivate | 1 |
| 2 – Advanced Snorkeling | 1 |
| 3 – DSD Program in Confined Water | 1 |
| 4 – DSD Program – Additional Open Water Dive | 1 |
| 5 – Discover Local Diving in Open Water | **2** |

### 3.8 Practical Assessments — all count 2
1. Open Water Diver Students in Confined Water
2. Open Water Diver Students in Open Water
3. Continuing Education Student Divers in Open Water
4. Certified Divers in Open Water

### 3.9 Professionalism — scored, single evaluation event
Seven criteria: participation · mentoring · following directions · attitude toward divers and staff · environmental attitude · understanding of the DM role · appearance.

---

## 4. Progress calculation

The unit of progress is **one required approval instance**. An item with `required_count = 3` contributes 3 units.

```
total_units    = Σ required_count over active items
approved_units = count of APPROVED requests (capped at required_count per item)
pending_units  = count of PENDING requests (capped at remaining)
not_started    = total_units − approved − pending
percent        = approved_units / total_units × 100
```

Totals with the current catalog:

| Section | Units |
|---|---:|
| Prerequisites and Administration | 9 |
| Certification Requirements | 3 |
| Knowledge Development (incl. Final Exam) | 11 |
| Waterskills (5 + Diver Rescue) | 6 |
| Diver Skills Workshop | 1 |
| Practical Application | 8 |
| DM-Conducted Programs Workshops | 6 |
| Practical Assessments | 8 |
| Professionalism | 1 |
| **Total** | **53** |

**Dashboard pie:** Approved (green) / Pending (amber) / Not started (grey), plus a "blocked on instructor" count. A course is `COMPLETE` only when all units are approved **and** all threshold rules pass (≥15 waterskills, ≥82 skills workshop, ≥3 per skill, one underwater 5, 60 logged dives).

---

## 5. Screens

**Student (mobile-first)**
1. **Dashboard** — completion pie, % complete, pending-approval count, next suggested items
2. **Requirements** — accordion by section; per item: state chip, `2 of 3 approved` counter, ▶ request button
3. **New request** — item, date, time, instructor picker, note, submit
4. **My requests** — pending / approved / rejected, with instructor comments
5. **Profile** — personal info block from page 1 of the form, logged dive count

**Instructor**
1. **Approvals inbox** — badge count, oldest first, one-tap open
2. **Approval screen** — student, item, date/time, note; score input if scored; comment; signature pad; Approve / Reject
3. **Students** — all students with progress bars
4. **Student detail** — full evaluation form view, export PDF

**Admin**
1. Everything an instructor sees
2. **Users** — create/invite, assign role, set PADI No.
3. **Audit log** — every state transition
4. Void an approval (with reason)

---

## 6. Sign-off record

Every approval stores: instructor name (snapshot), instructor PADI No. (snapshot), approval timestamp (UTC + display tz), drawn signature PNG, optional comment. Name and PADI No. are **copied**, not referenced, so historical records survive profile edits.

**Signature storage:** PNG data URI in a `signatures` table (or object storage with a key reference — decide at build time; the schema supports both).

---

## 7. PDF export

Generate the completed 4-page form (pdf-lib or Puppeteer HTML→PDF). Each row is populated with the approved date, instructor name and PADI No.; signature images embedded where the paper form has a signature line. Repeated items (X2/X3) print all dates in the cell.

---

## 8. Non-functional

- **Auth:** email + password, bcrypt/argon2, JWT httpOnly cookie, refresh rotation
- **Notifications:** in-app only (badge + queue). Schema includes a `notifications` table so email/push can be added without migration pain
- **Timezone:** store UTC, display in dive-centre local time. Student enters a local date + time
- **Offline:** not in v1. Dockside signal is a real risk — consider a PWA with queued submissions in v2
- **Audit:** append-only `audit_log` for every status change

---

## 9. Open items

1. **Diver Rescue (Exercise 7)** — modelled as complete/incomplete. Your form has a Score column for it. Scored 1–5 instead?
2. **Waterskills scoring** — PADI's standard is 1–5 per exercise against published time/distance tables. Should the app show those tables to the instructor, or is a bare 1–5 input enough?
3. **Final exam pass mark** — enforce 75% per part, or accept any score?
4. **Underwater-skill list** in §3.5 — please confirm.
5. **Personal info page** — collect all of it (address, emergency contact, birth date), or only what's needed for the PDF export?
