import { pgEnum, pgTable, uuid, text, timestamp, serial, integer, numeric, boolean, check, uniqueIndex, index, bigserial, jsonb, pgView, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------- custom types ----------
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

export const bytea = customType<{ data: Buffer; driverData: unknown }>({
  dataType() {
    return 'bytea';
  },
  toDriver(val: Buffer) {
    return val;
  },
  fromDriver(val: unknown) {
    return val as Buffer;
  },
});

// ---------- enums ----------
export const userRoleEnum = pgEnum('user_role', ['STUDENT', 'INSTRUCTOR', 'ADMIN']);
export const requestStatusEnum = pgEnum('request_status', ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'VOIDED']);
export const courseStatusEnum = pgEnum('course_status', ['ACTIVE', 'COMPLETE', 'WITHDRAWN']);
export const evidenceTypeEnum = pgEnum('evidence_type', ['PERFORMANCE', 'VERIFICATION', 'SPECIALTY_CERT', 'ONLINE_COURSE']);
export const scoringTypeEnum = pgEnum('scoring_type', ['NONE', 'SCORE_1_5', 'SCORE_SHEET', 'EXAM']);

// ---------- tables ----------

export const diveCenters = pgTable('dive_centers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  diveCenterId: uuid('dive_center_id').notNull().references(() => diveCenters.id, { onDelete: 'restrict' }),
  email: citext('email').unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  middleInitial: text('middle_initial'),
  padiNumber: text('padi_number'),
  phone: text('phone'),
  locale: text('locale').notNull().default('en'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_users_center_role').on(table.diveCenterId, table.role).where(sql`is_active`),
  check('instructor_needs_padi_no', sql`role = 'STUDENT' OR padi_number IS NOT NULL`),
]);

export const studentProfiles = pgTable('student_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  instructorId: uuid('instructor_id').references(() => users.id),
  birthDate: timestamp('birth_date', { mode: 'string' }), //DATE is best represented as string or Date. Drizzle date() can be used or custom date.
  addressLine: text('address_line'),
  city: text('city'),
  stateProvince: text('state_province'),
  country: text('country'),
  postalCode: text('postal_code'),
  homePhone: text('home_phone'),
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  loggedDives: integer('logged_dives').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('logged_dives_non_negative', sql`logged_dives >= 0`),
]);

export const requirementSections = pgTable('requirement_sections', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const requirementItems = pgTable('requirement_items', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').notNull().references(() => requirementSections.id),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  scoring: scoringTypeEnum('scoring').notNull().default('NONE'),
  evidence: evidenceTypeEnum('evidence').notNull().default('PERFORMANCE'),
  requiredCount: integer('required_count').notNull().default(1),
  minScore: integer('min_score'),
  alternativeNote: text('alternative_note'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull(),
}, (table) => [
  index('idx_items_section').on(table.sectionId, table.sortOrder),
  check('required_count_positive', sql`required_count >= 1`),
]);

export const scoreSheetLines = pgTable('score_sheet_lines', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => requirementItems.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),
  label: text('label').notNull(),
  isUnderwater: boolean('is_underwater').notNull().default(false),
  countsTowardTotal: boolean('counts_toward_total').notNull().default(true),
  minScore: integer('min_score'),
}, (table) => [
  uniqueIndex('score_sheet_lines_item_id_line_number_key').on(table.itemId, table.lineNumber),
]);

export const requirementRules = pgTable('requirement_rules', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').references(() => requirementItems.id, { onDelete: 'cascade' }),
  sectionId: integer('section_id').references(() => requirementSections.id, { onDelete: 'cascade' }),
  ruleType: text('rule_type').notNull(),
  threshold: integer('threshold'),
  message: text('message').notNull(),
}, (table) => [
  check('rule_target', sql`num_nonnulls(item_id, section_id) = 1`),
]);

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  diveCenterId: uuid('dive_center_id').notNull().references(() => diveCenters.id),
  status: courseStatusEnum('status').notNull().default('ACTIVE'),
  isArchived: boolean('is_archived').notNull().default(false),
  startedAt: timestamp('started_at', { mode: 'string' }).notNull().default(sql`CURRENT_DATE`),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const signatures = pgTable('signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  signerId: uuid('signer_id').notNull().references(() => users.id),
  imageData: bytea('image_data'),
  storageKey: text('storage_key'),
  mimeType: text('mime_type').notNull().default('image/png'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('signature_has_payload', sql`num_nonnulls(image_data, storage_key) = 1`),
]);

export const signoffRequests = pgTable('signoff_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => requirementItems.id),
  attemptNumber: integer('attempt_number').notNull().default(1),
  status: requestStatusEnum('status').notNull().default('PENDING'),

  // student input
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
  performedTz: text('performed_tz').notNull().default('UTC'),
  studentNote: text('student_note'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),

  // routing
  instructorId: uuid('instructor_id').notNull().references(() => users.id),

  // instructor decision
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  instructorNameSnapshot: text('instructor_name_snapshot'),
  instructorPadiSnapshot: text('instructor_padi_snapshot'),
  instructorComment: text('instructor_comment'),
  rejectionReason: text('rejection_reason'),
  signatureId: uuid('signature_id').references(() => signatures.id),
  score: integer('score'),
  satisfiedBy: evidenceTypeEnum('satisfied_by'),
  examPart1Score: numeric('exam_part1_score', { precision: 5, scale: 2 }),
  examPart2Score: numeric('exam_part2_score', { precision: 5, scale: 2 }),
  diveTheoryOnline: boolean('dive_theory_online').notNull().default(false),

  // admin correction
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  voidedBy: uuid('voided_by').references(() => users.id),
  voidReason: text('void_reason'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('decided_fields_present', sql`status <> 'APPROVED' OR (decided_at IS NOT NULL AND instructor_name_snapshot IS NOT NULL AND instructor_padi_snapshot IS NOT NULL)`),
  check('rejection_needs_reason', sql`status <> 'REJECTED' OR rejection_reason IS NOT NULL`),
  check('score_range', sql`score IS NULL OR (score BETWEEN 1 AND 5)`),
  uniqueIndex('uniq_approved_attempt')
    .on(table.courseId, table.itemId, table.attemptNumber)
    .where(sql`status = 'APPROVED'`),
  uniqueIndex('uniq_pending_attempt')
    .on(table.courseId, table.itemId, table.attemptNumber)
    .where(sql`status IN ('DRAFT', 'PENDING')`),
  index('idx_requests_inbox').on(table.instructorId, table.status, table.submittedAt),
  index('idx_requests_course').on(table.courseId, table.itemId),
]);

export const signoffScores = pgTable('signoff_scores', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  requestId: uuid('request_id').notNull().references(() => signoffRequests.id, { onDelete: 'cascade' }),
  lineId: integer('line_id').notNull().references(() => scoreSheetLines.id),
  score: integer('score').notNull(),
}, (table) => [
  uniqueIndex('signoff_scores_request_id_line_id_key').on(table.requestId, table.lineId),
  check('score_range', sql`score BETWEEN 1 AND 5`),
]);

export const notifications = pgTable('notifications', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  requestId: uuid('request_id').references(() => signoffRequests.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_notifications_unread').on(table.userId, table.createdAt.desc()).where(sql`read_at IS NULL`),
]);

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorId: uuid('actor_id').references(() => users.id),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_entity').on(table.entity, table.entityId, table.createdAt.desc()),
]);

// ---------- views ----------

export const vCourseItemProgress = pgView('v_course_item_progress', {
  courseId: uuid('course_id'),
  itemId: integer('item_id'),
  sectionId: integer('section_id'),
  requiredCount: integer('required_count'),
  approvedCount: integer('approved_count'),
  pendingCount: integer('pending_count'),
}).as(sql`
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
  GROUP BY c.id, ri.id
`);

export const vCourseProgress = pgView('v_course_progress', {
  courseId: uuid('course_id'),
  totalUnits: integer('total_units'),
  approvedUnits: integer('approved_units'),
  pendingUnits: integer('pending_units'),
  notStartedUnits: integer('not_started_units'),
  percentComplete: numeric('percent_complete'),
}).as(sql`
  SELECT
    course_id,
    SUM(required_count)                                          AS total_units,
    SUM(LEAST(approved_count, required_count))                   AS approved_units,
    SUM(LEAST(pending_count, GREATEST(required_count - approved_count, 0))) AS pending_units,
    SUM(required_count) - SUM(LEAST(approved_count, required_count))
      - SUM(LEAST(pending_count, GREATEST(required_count - approved_count, 0)))  AS not_started_units,
    ROUND(100.0 * SUM(LEAST(approved_count, required_count)) / NULLIF(SUM(required_count), 0), 1) AS percent_complete
  FROM v_course_item_progress
  GROUP BY course_id
`);
