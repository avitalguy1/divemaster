-- ============================================================
-- Divemaster Progress App — PostgreSQL schema v1
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------- enums ----------
CREATE TYPE user_role         AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');
CREATE TYPE request_status    AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'VOIDED');
CREATE TYPE course_status     AS ENUM ('ACTIVE', 'COMPLETE', 'WITHDRAWN');
CREATE TYPE evidence_type     AS ENUM ('PERFORMANCE', 'VERIFICATION', 'SPECIALTY_CERT', 'ONLINE_COURSE');
-- how an item is evaluated
CREATE TYPE scoring_type      AS ENUM (
  'NONE',            -- verified / not verified
  'SCORE_1_5',       -- single 1-5 score
  'SCORE_SHEET',     -- multi-line score sheet (skills workshop, professionalism)
  'EXAM'             -- part 1 / part 2 percentages, or online-course flag
);

-- ---------- dive centres ----------
CREATE TABLE dive_centers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- users ----------
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_center_id  UUID NOT NULL REFERENCES dive_centers(id) ON DELETE RESTRICT,
  email           CITEXT UNIQUE,          -- requires citext; use TEXT + lower() index if unavailable
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  middle_initial  TEXT,
  padi_number     TEXT,                   -- required for INSTRUCTOR / ADMIN
  phone           TEXT,
  locale          TEXT NOT NULL DEFAULT 'en',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT instructor_needs_padi_no
    CHECK (role = 'STUDENT' OR padi_number IS NOT NULL)
);
CREATE INDEX idx_users_center_role ON users (dive_center_id, role) WHERE is_active;

-- student-only profile fields (page 1 of the paper form)
CREATE TABLE student_profiles (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  birth_date          DATE,
  address_line        TEXT,
  city                TEXT,
  state_province      TEXT,
  country             TEXT,
  postal_code         TEXT,
  home_phone          TEXT,
  emergency_contact   TEXT,
  emergency_phone     TEXT,
  logged_dives        INTEGER NOT NULL DEFAULT 0 CHECK (logged_dives >= 0),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Requirement catalog (seeded from the PADI form)
-- ============================================================
CREATE TABLE requirement_sections (
  id            SERIAL PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL
);

CREATE TABLE requirement_items (
  id                 SERIAL PRIMARY KEY,
  section_id         INTEGER NOT NULL REFERENCES requirement_sections(id),
  code               TEXT UNIQUE NOT NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  scoring            scoring_type NOT NULL DEFAULT 'NONE',
  evidence           evidence_type NOT NULL DEFAULT 'PERFORMANCE',
  required_count     INTEGER NOT NULL DEFAULT 1 CHECK (required_count >= 1),  -- X2 / X3
  min_score          INTEGER,          -- per-instance minimum (e.g. 3)
  alternative_note   TEXT,             -- e.g. "OR PADI Search and Recovery Diver specialty"
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order         INTEGER NOT NULL
);
CREATE INDEX idx_items_section ON requirement_items (section_id, sort_order);

-- individual lines of a multi-line score sheet (24 skills, 7 professionalism criteria)
CREATE TABLE score_sheet_lines (
  id                 SERIAL PRIMARY KEY,
  item_id            INTEGER NOT NULL REFERENCES requirement_items(id) ON DELETE CASCADE,
  line_number        INTEGER NOT NULL,
  label              TEXT NOT NULL,
  is_underwater      BOOLEAN NOT NULL DEFAULT FALSE,
  counts_toward_total BOOLEAN NOT NULL DEFAULT TRUE,   -- skill 24 = FALSE
  min_score          INTEGER,
  UNIQUE (item_id, line_number)
);

-- section-level or item-level pass thresholds, evaluated by the progress engine
CREATE TABLE requirement_rules (
  id            SERIAL PRIMARY KEY,
  item_id       INTEGER REFERENCES requirement_items(id) ON DELETE CASCADE,
  section_id    INTEGER REFERENCES requirement_sections(id) ON DELETE CASCADE,
  rule_type     TEXT NOT NULL,   -- MIN_TOTAL | MIN_PER_LINE | MIN_ONE_UNDERWATER_5 | MIN_LOGGED_DIVES
  threshold     INTEGER,
  message       TEXT NOT NULL,
  CONSTRAINT rule_target CHECK (num_nonnulls(item_id, section_id) = 1)
);

-- ============================================================
-- Courses & sign-off requests
-- ============================================================
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dive_center_id  UUID NOT NULL REFERENCES dive_centers(id),
  status          course_status NOT NULL DEFAULT 'ACTIVE',
  started_at      DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- one active course per student (v1)
  CONSTRAINT one_course_per_student UNIQUE (student_id)
);

CREATE TABLE signoff_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  item_id            INTEGER NOT NULL REFERENCES requirement_items(id),
  attempt_number     INTEGER NOT NULL DEFAULT 1,   -- 1..required_count
  status             request_status NOT NULL DEFAULT 'PENDING',

  -- student input
  performed_at       TIMESTAMPTZ NOT NULL,          -- date + time of the task
  performed_tz       TEXT NOT NULL DEFAULT 'UTC',
  student_note       TEXT,
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- routing
  instructor_id      UUID NOT NULL REFERENCES users(id),

  -- instructor decision (snapshotted for the permanent record)
  decided_at         TIMESTAMPTZ,
  instructor_name_snapshot  TEXT,
  instructor_padi_snapshot  TEXT,
  instructor_comment TEXT,
  rejection_reason   TEXT,
  signature_id       UUID,                          -- FK added below
  score              INTEGER CHECK (score BETWEEN 1 AND 5),
  satisfied_by       evidence_type,                 -- e.g. SPECIALTY_CERT
  exam_part1_score   NUMERIC(5,2),
  exam_part2_score   NUMERIC(5,2),
  dive_theory_online BOOLEAN NOT NULL DEFAULT FALSE,

  -- admin correction
  voided_at          TIMESTAMPTZ,
  voided_by          UUID REFERENCES users(id),
  void_reason        TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT decided_fields_present CHECK (
    status <> 'APPROVED' OR (decided_at IS NOT NULL
                             AND instructor_name_snapshot IS NOT NULL
                             AND instructor_padi_snapshot IS NOT NULL)
  ),
  CONSTRAINT rejection_needs_reason CHECK (
    status <> 'REJECTED' OR rejection_reason IS NOT NULL
  )
);

-- at most one approved request per (course, item, attempt)
CREATE UNIQUE INDEX uniq_approved_attempt
  ON signoff_requests (course_id, item_id, attempt_number)
  WHERE status = 'APPROVED';

-- at most one open request per (course, item, attempt)
CREATE UNIQUE INDEX uniq_pending_attempt
  ON signoff_requests (course_id, item_id, attempt_number)
  WHERE status IN ('DRAFT', 'PENDING');

CREATE INDEX idx_requests_inbox ON signoff_requests (instructor_id, status, submitted_at);
CREATE INDEX idx_requests_course ON signoff_requests (course_id, item_id);

-- individual score-sheet values attached to a request
CREATE TABLE signoff_scores (
  id            BIGSERIAL PRIMARY KEY,
  request_id    UUID NOT NULL REFERENCES signoff_requests(id) ON DELETE CASCADE,
  line_id       INTEGER NOT NULL REFERENCES score_sheet_lines(id),
  score         INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  UNIQUE (request_id, line_id)
);

CREATE TABLE signatures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signer_id     UUID NOT NULL REFERENCES users(id),
  image_data    BYTEA,        -- PNG bytes; NULL if stored externally
  storage_key   TEXT,         -- object-storage key alternative
  mime_type     TEXT NOT NULL DEFAULT 'image/png',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT signature_has_payload CHECK (num_nonnulls(image_data, storage_key) = 1)
);

ALTER TABLE signoff_requests
  ADD CONSTRAINT fk_request_signature
  FOREIGN KEY (signature_id) REFERENCES signatures(id);

-- ============================================================
-- Notifications & audit
-- ============================================================
CREATE TABLE notifications (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,     -- REQUEST_SUBMITTED | REQUEST_APPROVED | REQUEST_REJECTED
  request_id    UUID REFERENCES signoff_requests(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_unread ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE audit_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_id      UUID REFERENCES users(id),
  entity        TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  action        TEXT NOT NULL,
  before        JSONB,
  after         JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id, created_at DESC);

-- ============================================================
-- Progress view — powers the dashboard pie
-- ============================================================
CREATE VIEW v_course_item_progress AS
SELECT
  c.id                                   AS course_id,
  ri.id                                  AS item_id,
  ri.section_id,
  ri.required_count,
  COUNT(*) FILTER (WHERE sr.status = 'APPROVED')                  AS approved_count,
  COUNT(*) FILTER (WHERE sr.status IN ('PENDING', 'DRAFT'))       AS pending_count
FROM courses c
CROSS JOIN requirement_items ri
LEFT JOIN signoff_requests sr
       ON sr.course_id = c.id AND sr.item_id = ri.id
WHERE ri.is_active
GROUP BY c.id, ri.id;

CREATE VIEW v_course_progress AS
SELECT
  course_id,
  SUM(required_count)                                          AS total_units,
  SUM(LEAST(approved_count, required_count))                   AS approved_units,
  SUM(LEAST(pending_count, GREATEST(required_count - approved_count, 0))) AS pending_units,
  SUM(required_count) - SUM(LEAST(approved_count, required_count))
    - SUM(LEAST(pending_count, GREATEST(required_count - approved_count, 0)))  AS not_started_units,
  ROUND(100.0 * SUM(LEAST(approved_count, required_count)) / NULLIF(SUM(required_count), 0), 1) AS percent_complete
FROM v_course_item_progress
GROUP BY course_id;
